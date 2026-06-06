// Auth service — inscription, vérification OTP, connexion, TOTP, rotation de tokens (Supabase Auth)
import * as crypto from 'crypto';
import { prisma } from '../../database/prisma.service';
import { hashPassword } from '../../common/utils/bcrypt';
import { generateOtp, sendSms } from '../../common/utils/sms';
import { verifyTotp as verifyTotpCode } from '../../common/utils/totp';
import { redisSet, redisGet, redisDel } from '../../common/utils/redis-client';
import { sendPasswordResetEmail } from '../../common/utils/mailer';
import { HttpError } from '../../common/handlers/http-error.handler';
import { logger } from '../../common/utils/logger';
import {
  RegisterInput,
  VerifyPhoneInput,
  LoginInput,
  VerifyTotpInput,
  ResetPasswordInput,
} from './dto/auth.dto';
import { AccountType, UserStatus } from '@prisma/client';
import { env } from '../../config/env.config';
import { orangeSmsConfig } from '../../config/orange-sms.config';
import { supabaseAdmin, supabaseAuth } from '../../config/supabase.config';

// ─── Redis key helpers ────────────────────────────────────────────────────────

const OTP_TTL          = orangeSmsConfig.otpExpiresInSeconds; // 300 s = 5 min
const RESET_TTL_MS     = 30 * 60 * 1000;                     // 30 min
const TOTP_PENDING_TTL = 300;                                 // 5 min

const OTP_KEY          = (phone: string)  => `otp:${phone}`;
const PENDING_USER_KEY = (phone: string)  => `pending:${phone}`;
const TOTP_PENDING_KEY = (userId: string) => `totp_pending:${userId}`;

// In-memory fallback for pending users when Redis is not configured
const pendingUserMemory = new Map<string, string>();
const otpMemory         = new Map<string, string>();

const BYPASS_OTP = '000000'; // code accepté quand SKIP_OTP_VERIFICATION=true

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PendingUser {
  email: string;
  phone: string;
  password: string;     // raw — needed for Supabase user creation
  passwordHash: string; // bcrypt hash stored in Prisma (legacy field)
  firstName: string;
  lastName: string;
  accountType: AccountType;
  referralCode?: string;
}

interface SafeUser {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  accountType: AccountType;
  role: AccountType; // alias pour accountType — MainTabs lit user.role pour le routage
  status: UserStatus;
  /** Statut KYC du profil professionnel (pending | approved | rejected). Null pour les clients. */
  kycStatus: string | null;
  kycRejectionReason?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createUserAndSession(input: RegisterInput): Promise<{ message: string; accessToken: string; refreshToken: string; user: SafeUser }> {
  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    phone: input.phone,
    password: input.password,
    email_confirm: true,
    phone_confirm: true,
    app_metadata: { role: input.accountType },
  });

  if (createError || !createData.user) {
    logger.error('Erreur création Supabase user (bypass)', { email: input.email, error: createError?.message });
    throw new HttpError(500, 'Erreur lors de la création du compte. Réessayez.');
  }

  const supabaseUserId = createData.user.id;
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      id: supabaseUserId,
      email: input.email,
      phone: input.phone,
      passwordHash: 'supabase_managed',
      firstName: input.firstName,
      lastName: input.lastName,
      accountType: input.accountType as AccountType,
      status: input.accountType === 'client' ? UserStatus.active : UserStatus.pending,
    },
  });

  // Créer le profil professionnel dès l'inscription pour les comptes pro,
  // afin que l'admin puisse approuver/rejeter le KYC même sans annonce publiée.
  if (input.accountType !== 'client') {
    const businessName = (input.businessName as string | undefined)?.trim()
      || `${input.firstName} ${input.lastName}`.trim();
    await prisma.professionalProfile.create({
      data: {
        userId: user.id,
        businessName,
        street: input.businessAddress?.trim() || null,
        rccm: input.rccm?.trim() || null,
        taxId: input.taxNumber?.trim() || null,
        verificationStatus: 'pending',
      },
    }).catch((err) => logger.warn('Erreur création ProfessionalProfile (inscription)', err));
  }

  if (input.referralCode) {
    try {
      const referrer = await prisma.user.findFirst({ where: { referralCode: input.referralCode } });
      if (referrer && referrer.id !== user.id) {
        await prisma.referral.create({
          data: {
            referralCode: input.referralCode,
            referrerId: referrer.id,
            refereeId: user.id,
            status: 'pending',
            inscriptionDate: new Date(),
          },
        });
      }
    } catch (err) {
      logger.warn('Erreur création parrainage (bypass)', { error: (err as Error).message });
    }
  }
  void passwordHash; // hash calculé mais non utilisé (Supabase gère les mots de passe)

  const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (signInError || !signInData.session) {
    logger.error('Erreur signIn bypass', { userId: user.id, error: signInError?.message });
    throw new HttpError(500, 'Compte créé mais erreur de connexion. Reconnectez-vous.');
  }

  logger.info('Nouveau compte créé (bypass)', { userId: user.id, accountType: user.accountType });

  return {
    message: 'Compte créé avec succès (mode test).',
    accessToken: signInData.session.access_token,
    refreshToken: signInData.session.refresh_token,
    user: toSafeUser(user),
  };
}

function toSafeUser(user: {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  accountType: AccountType;
  status: UserStatus;
  professionalProfile?: { verificationStatus: string; verificationNotes: string | null } | null;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    accountType: user.accountType,
    role: user.accountType,
    status: user.status,
    kycStatus: user.professionalProfile?.verificationStatus ?? null,
    kycRejectionReason: user.professionalProfile?.verificationNotes ?? null,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const authService = {
  // ── Inscription ─────────────────────────────────────────────────────────────

  async register(input: RegisterInput): Promise<{ message: string; accessToken?: string; refreshToken?: string; user?: SafeUser }> {
    const emailExists = await prisma.user.findUnique({ where: { email: input.email } });
    if (emailExists) {
      throw new HttpError(409, 'Un compte avec cet email existe déjà');
    }

    const phoneExists = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (phoneExists) {
      throw new HttpError(409, 'Un compte avec ce numéro de téléphone existe déjà');
    }

    // ── Bypass mode: create account immediately, return tokens, skip OTP screen ──
    if (env.SKIP_OTP_VERIFICATION) {
      logger.info(`[OTP BYPASS] création immédiate du compte pour ${input.phone}`);
      return createUserAndSession(input);
    }

    // ── Normal mode: store pending data + send OTP via SMS ──────────────────────
    const passwordHash = await hashPassword(input.password);

    const pending: PendingUser = {
      email: input.email,
      phone: input.phone,
      password: input.password,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      accountType: input.accountType as AccountType,
      referralCode: input.referralCode,
    };
    const pendingJson = JSON.stringify(pending);
    await redisSet(PENDING_USER_KEY(input.phone), pendingJson, OTP_TTL);
    pendingUserMemory.set(input.phone, pendingJson);
    setTimeout(() => pendingUserMemory.delete(input.phone), OTP_TTL * 1000);

    const otp = generateOtp();
    await redisSet(OTP_KEY(input.phone), otp, OTP_TTL);
    otpMemory.set(input.phone, otp);
    setTimeout(() => otpMemory.delete(input.phone), OTP_TTL * 1000);

    const message = `Votre code de vérification PRIMEO est : ${otp}. Valable ${OTP_TTL / 60} minutes.`;
    try {
      await sendSms(input.phone, message, { isOtp: true });
    } catch (err) {
      logger.error('Échec envoi OTP SMS', { phone: input.phone, error: (err as Error).message });
      if (env.NODE_ENV !== 'production') {
        logger.debug(`[DEV] OTP pour ${input.phone} : ${otp}`);
      }
    }

    return { message: 'Un code de vérification a été envoyé par SMS. Valable 5 minutes.' };
  },

  // ── Vérification OTP → activation du compte ──────────────────────────────

  async verifyPhone(input: VerifyPhoneInput): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> {
    if (env.SKIP_OTP_VERIFICATION) {
      // Bypass mode: accept BYPASS_OTP code only
      if (input.otp !== BYPASS_OTP) {
        throw new HttpError(400, `Mode test : utilisez le code ${BYPASS_OTP}`);
      }
    } else {
      const storedOtp = (await redisGet(OTP_KEY(input.phone))) ?? otpMemory.get(input.phone) ?? null;
      if (!storedOtp) {
        throw new HttpError(400, 'Code OTP expiré. Demandez-en un nouveau.');
      }
      if (storedOtp !== input.otp) {
        throw new HttpError(400, 'Code OTP incorrect');
      }
    }

    const pendingRaw = (await redisGet(PENDING_USER_KEY(input.phone))) ?? pendingUserMemory.get(input.phone) ?? null;
    if (!pendingRaw) {
      throw new HttpError(400, 'Session d\'inscription expirée. Recommencez l\'inscription.');
    }
    const pending: PendingUser = JSON.parse(pendingRaw);

    await Promise.all([
      redisDel(OTP_KEY(input.phone)),
      redisDel(PENDING_USER_KEY(input.phone)),
    ]);

    // Créer l'utilisateur dans Supabase Auth (email + phone confirmés via OTP)
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: pending.email,
      phone: pending.phone,
      password: pending.password,
      email_confirm: true,
      phone_confirm: true,
      app_metadata: { role: pending.accountType },
    });

    if (createError || !createData.user) {
      logger.error('Erreur création Supabase user', { email: pending.email, error: createError?.message });
      throw new HttpError(500, 'Erreur lors de la création du compte. Réessayez.');
    }

    const supabaseUserId = createData.user.id;

    // Créer l'entrée Prisma avec l'UUID Supabase comme clé primaire
    const user = await prisma.user.create({
      data: {
        id: supabaseUserId,
        email: pending.email,
        phone: pending.phone,
        passwordHash: 'supabase_managed',
        firstName: pending.firstName,
        lastName: pending.lastName,
        accountType: pending.accountType,
        status: pending.accountType === 'client' ? UserStatus.active : UserStatus.pending,
      },
    });

    // Créer le profil professionnel dès la vérification OTP pour les comptes pro
    if (pending.accountType !== 'client') {
      const businessName = `${pending.firstName} ${pending.lastName}`.trim() || 'Professionnel';
      await prisma.professionalProfile.create({
        data: { userId: user.id, businessName, verificationStatus: 'pending' },
      }).catch((err) => logger.warn('Erreur création ProfessionalProfile (OTP)', err));
    }

    // Parrainage — ne bloque pas la création si erreur
    if (pending.referralCode) {
      try {
        const referrer = await prisma.user.findFirst({ where: { referralCode: pending.referralCode } });
        if (referrer && referrer.id !== user.id) {
          await prisma.referral.create({
            data: {
              referralCode: pending.referralCode,
              referrerId: referrer.id,
              refereeId: user.id,
              status: 'pending',
              inscriptionDate: new Date(),
            },
          });
        }
      } catch (err) {
        logger.warn('Erreur création parrainage', { error: (err as Error).message });
      }
    }

    // Connexion immédiate pour obtenir les tokens de session Supabase
    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: pending.email,
      password: pending.password,
    });

    if (signInError || !signInData.session) {
      logger.error('Erreur signIn post-création', { userId: user.id, error: signInError?.message });
      throw new HttpError(500, 'Compte créé mais erreur de connexion. Reconnectez-vous.');
    }

    logger.info('Nouveau compte créé', { userId: user.id, accountType: user.accountType });

    // Charger le profil pro pour inclure kycStatus dans la réponse
    const userWithProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: { professionalProfile: { select: { verificationStatus: true, verificationNotes: true } } },
    }) ?? user;

    return {
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
      user: toSafeUser(userWithProfile),
    };
  },

  // ── Renvoi OTP ──────────────────────────────────────────────────────────────

  async resendOtp(phone: string): Promise<void> {
    const pending = (await redisGet(PENDING_USER_KEY(phone))) ?? pendingUserMemory.get(phone) ?? null;
    if (!pending) {
      throw new HttpError(400, 'Aucune inscription en cours pour ce numéro. Recommencez l\'inscription.');
    }

    if (env.SKIP_OTP_VERIFICATION) {
      await redisSet(OTP_KEY(phone), BYPASS_OTP, OTP_TTL);
      otpMemory.set(phone, BYPASS_OTP);
      logger.info(`[OTP BYPASS] resend pour ${phone} : ${BYPASS_OTP}`);
      return;
    }

    const otp = generateOtp();
    await redisSet(OTP_KEY(phone), otp, OTP_TTL);
    otpMemory.set(phone, otp);
    setTimeout(() => otpMemory.delete(phone), OTP_TTL * 1000);

    const message = `Votre nouveau code PRIMEO est : ${otp}. Valable ${OTP_TTL / 60} minutes.`;
    try {
      await sendSms(phone, message, { isOtp: true });
    } catch (err) {
      logger.error('Échec renvoi OTP', { phone, error: (err as Error).message });
      if (env.NODE_ENV !== 'production') {
        logger.debug(`[DEV] OTP pour ${phone} : ${otp}`);
      }
    }
  },

  // ── Connexion ────────────────────────────────────────────────────────────────

  async login(input: LoginInput): Promise<
    | { requiresTwoFactor: true; userId: string }
    | { accessToken: string; refreshToken: string; user: SafeUser }
  > {
    // Authentification via Supabase — valide les identifiants
    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (signInError || !signInData.session || !signInData.user) {
      throw new HttpError(401, 'Email ou mot de passe incorrect');
    }

    // Vérification du statut applicatif en base (+ statut KYC pour les pros)
    const user = await prisma.user.findUnique({
      where: { id: signInData.user.id },
      include: {
        professionalProfile: {
          select: { verificationStatus: true, verificationNotes: true },
        },
      },
    });

    if (!user) {
      // Compte Supabase sans entrée Prisma — anomalie de données
      await supabaseAdmin.auth.admin.signOut(signInData.session.access_token).catch(() => null);
      throw new HttpError(401, 'Email ou mot de passe incorrect');
    }

    if (user.status === UserStatus.suspended) {
      await supabaseAdmin.auth.admin.signOut(signInData.session.access_token).catch(() => null);
      throw new HttpError(403, 'Votre compte est suspendu. Contactez le support.');
    }

    if (user.status === UserStatus.banned) {
      await supabaseAdmin.auth.admin.signOut(signInData.session.access_token).catch(() => null);
      throw new HttpError(403, 'Votre compte a été désactivé.');
    }

    // TOTP obligatoire si activé — stocker le refresh token Supabase en Redis
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      await redisSet(
        TOTP_PENDING_KEY(user.id),
        JSON.stringify({ supabaseRefreshToken: signInData.session.refresh_token }),
        TOTP_PENDING_TTL,
      );
      return { requiresTwoFactor: true, userId: user.id };
    }

    return {
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
      user: toSafeUser(user),
    };
  },

  // ── Vérification TOTP (2ème facteur) ────────────────────────────────────────

  async verifyTotp(input: VerifyTotpInput): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> {
    const pendingRaw = await redisGet(TOTP_PENDING_KEY(input.userId));
    if (!pendingRaw) {
      throw new HttpError(400, 'Session 2FA expirée. Reconnectez-vous.');
    }

    const { supabaseRefreshToken } = JSON.parse(pendingRaw) as { supabaseRefreshToken: string };

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user || !user.twoFactorSecret) {
      throw new HttpError(400, 'Utilisateur introuvable');
    }

    const isValid = verifyTotpCode(user.twoFactorSecret, input.token);
    if (!isValid) {
      throw new HttpError(401, 'Code TOTP incorrect ou expiré');
    }

    await redisDel(TOTP_PENDING_KEY(input.userId));

    // Rafraîchir la session Supabase en attente pour obtenir de nouveaux tokens
    const { data: refreshData, error: refreshError } = await supabaseAuth.auth.refreshSession({
      refresh_token: supabaseRefreshToken,
    });

    if (refreshError || !refreshData.session) {
      throw new HttpError(401, 'Session expirée. Reconnectez-vous.');
    }

    return {
      accessToken: refreshData.session.access_token,
      refreshToken: refreshData.session.refresh_token,
      user: toSafeUser(user),
    };
  },

  // ── Rafraîchissement des tokens ───────────────────────────────────────────────

  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string; user?: SafeUser }> {
    const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: token });

    if (error || !data.session) {
      throw new HttpError(401, 'Jeton de rafraîchissement invalide ou expiré');
    }

    // Inclure le user dans la réponse pour que le store mobile puisse
    // détecter les changements de statut (ex : approbation KYC admin)
    let safeUser: SafeUser | undefined;
    try {
      const userId = data.session.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { professionalProfile: { select: { verificationStatus: true, verificationNotes: true } } },
      });
      if (user) safeUser = toSafeUser(user);
    } catch (err) {
      logger.warn('refreshToken: impossible de charger le profil utilisateur', err);
    }

    return {
      accessToken:  data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: safeUser,
    };
  },

  // ── Déconnexion ──────────────────────────────────────────────────────────────

  async logout(userId: string, accessToken?: string): Promise<void> {
    if (accessToken) {
      const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
      if (error) {
        logger.warn('Erreur signOut Supabase', { userId, error: error.message });
      }
    }
  },

  // ── Mot de passe oublié ──────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      logger.debug('forgotPassword: email non trouvé (réponse générique)', { email });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: rawToken, resetTokenExpiresAt: expiresAt },
    });

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({
        to: [{ email: user.email, name: `${user.firstName} ${user.lastName}` }],
        firstName: user.firstName,
        resetUrl,
        expiresInMinutes: 30,
      });
    } catch (err) {
      logger.error('Échec envoi email de réinitialisation', {
        userId: user.id,
        error: (err as Error).message,
      });
    }
  },

  // ── Réinitialisation du mot de passe ────────────────────────────────────────

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const user = await prisma.user.findFirst({ where: { resetToken: input.token } });

    if (!user || !user.resetTokenExpiresAt) {
      throw new HttpError(400, 'Lien de réinitialisation invalide');
    }

    if (user.resetTokenExpiresAt < new Date()) {
      throw new HttpError(400, 'Lien de réinitialisation expiré. Faites une nouvelle demande.');
    }

    // Mettre à jour le mot de passe dans Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: input.password,
    });

    if (updateError) {
      logger.error('Erreur maj mot de passe Supabase', { userId: user.id, error: updateError.message });
      throw new HttpError(500, 'Erreur lors de la réinitialisation du mot de passe');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: null, resetTokenExpiresAt: null },
    });

    logger.info('Mot de passe réinitialisé', { userId: user.id });
  },
};
