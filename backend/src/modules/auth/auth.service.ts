// Auth service — inscription, vérification OTP, connexion, TOTP, rotation de tokens (Supabase Auth)
import { prisma } from '../../database/prisma.service';
import { generateOtp, sendSms } from '../../common/utils/sms';
import { verifyTotp as verifyTotpCode } from '../../common/utils/totp';
import { redisSet, redisGet, redisDel, getRedisClient } from '../../common/utils/redis-client';
import { encryptSecret, decryptSecret } from '../../common/utils/secret-crypto';
import { sendPasswordResetEmail, sendOtpEmail } from '../../common/utils/mailer';
import { HttpError } from '../../common/handlers/http-error.handler';
import { logger } from '../../common/utils/logger';
import {
  RegisterInput,
  VerifyPhoneInput,
  LoginInput,
  VerifyTotpInput,
  ResetPasswordInput,
  GoogleAuthInput,
} from './dto/auth.dto';
import { AccountType, UserStatus } from '@prisma/client';
import { env } from '../../config/env.config';
import { orangeSmsConfig } from '../../config/orange-sms.config';
import { supabaseAdmin, supabaseAuth } from '../../config/supabase.config';

// ─── Redis key helpers ────────────────────────────────────────────────────────

const OTP_TTL          = orangeSmsConfig.otpExpiresInSeconds; // 300 s = 5 min
const TOTP_PENDING_TTL = 300;                                 // 5 min

const OTP_KEY          = (phone: string)  => `otp:${phone}`;
const PENDING_USER_KEY = (phone: string)  => `pending:${phone}`;
const TOTP_PENDING_KEY = (userId: string) => `totp_pending:${userId}`;
const OTP_RATE_KEY     = (phone: string)  => `otp_rate:${phone}`;

// Limite anti-abus : 3 demandes d'OTP par numéro et par heure
const OTP_RATE_LIMIT     = 3;
const OTP_RATE_WINDOW_S  = 3600;

// In-memory fallback for pending users when Redis is not configured
const pendingUserMemory = new Map<string, string>();
const otpMemory         = new Map<string, string>();
const otpRateMemory     = new Map<string, { count: number; resetAt: number }>();

/**
 * Limite les demandes d'envoi d'OTP par numéro de téléphone (3/heure).
 * Compteur partagé inter-instances via Redis ; repli mémoire locale sans Redis.
 */
async function assertOtpRateLimit(phone: string): Promise<void> {
  const tooMany = new HttpError(429, 'Trop de demandes de code pour ce numéro. Réessayez dans une heure.');

  const client = getRedisClient();
  if (client) {
    try {
      const key = OTP_RATE_KEY(phone);
      const count = await client.incr(key) as number;
      if (count === 1) await client.expire(key, OTP_RATE_WINDOW_S);
      if (count > OTP_RATE_LIMIT) throw tooMany;
      return;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      logger.warn('OTP rate limit : erreur Redis — repli mémoire', { error: (err as Error).message });
    }
  }

  const now = Date.now();
  const entry = otpRateMemory.get(phone);
  if (!entry || now > entry.resetAt) {
    otpRateMemory.set(phone, { count: 1, resetAt: now + OTP_RATE_WINDOW_S * 1000 });
    return;
  }
  entry.count += 1;
  if (entry.count > OTP_RATE_LIMIT) throw tooMany;
}

const BYPASS_OTP = '000000'; // code accepté UNIQUEMENT en développement quand le bypass est actif

// Défense en profondeur : le bypass OTP n'est JAMAIS actif en production, même si
// SKIP_OTP_VERIFICATION=true (en plus du garde-fou dans env.config). Toute
// vérification (inscription, renvoi, etc.) passe par la validation réelle du code.
const isOtpBypassEnabled = (): boolean =>
  env.SKIP_OTP_VERIFICATION === true && env.NODE_ENV !== 'production';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PendingUser {
  email: string;
  phone: string;
  password: string; // raw — needed for Supabase user creation after OTP
  firstName: string;
  lastName: string;
  accountType: AccountType;
  referralCode?: string;
  businessName?: string;
  businessAddress?: string;
  rccm?: string;
  taxNumber?: string;
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

// Auto-création du restaurant à l'inscription d'un restaurateur : la fiche est
// créée immédiatement (statut actif) avec les informations déjà fournies, ce qui
// supprime l'étape manuelle « Créer mon restaurant ». Idempotent : ne recrée pas
// si une fiche restaurant existe déjà pour ce propriétaire.
async function autoCreateRestaurantForOwner(ownerId: string, businessName: string, address?: string | null): Promise<void> {
  try {
    const existing = await prisma.property.count({ where: { ownerId, propertyType: 'restaurant' } });
    if (existing > 0) return;
    const name = businessName?.trim() || 'Mon restaurant';
    await prisma.property.create({
      data: {
        ownerId,
        propertyType: 'restaurant',
        title: name,
        description: `Bienvenue chez ${name}. Découvrez notre carte et réservez votre table.`,
        city: address?.trim() || 'Abidjan',
        street: address?.trim() || null,
        capacity: 30,
        status: 'active',
      },
    });
    logger.info('Restaurant auto-créé à l\'inscription', { ownerId });
  } catch (err) {
    logger.warn('Auto-création restaurant échouée', err);
  }
}

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

  const user = await prisma.user.create({
    data: {
      id: supabaseUserId,
      email: input.email,
      phone: input.phone,
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

    // Restaurant : la fiche est créée automatiquement (plus d'étape manuelle).
    if (input.accountType === 'restaurateur') {
      await autoCreateRestaurantForOwner(user.id, businessName, input.businessAddress);
    }
  }

  if (input.referralCode) {
    try {
      const referrer = await prisma.user.findFirst({ where: { referralCode: { equals: input.referralCode, mode: 'insensitive' } } });
      if (referrer && referrer.id !== user.id) {
        await prisma.referral.create({
          data: {
            referralCode: referrer.referralCode ?? input.referralCode,
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

  const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (signInError || !signInData.session) {
    logger.error('Erreur signIn bypass', { userId: user.id, error: signInError?.message });
    throw new HttpError(500, 'Compte créé mais erreur de connexion. Reconnectez-vous.');
  }

  logger.info('Nouveau compte créé (sans OTP)', { userId: user.id, accountType: user.accountType });

  return {
    message: 'Compte créé avec succès.',
    accessToken: signInData.session.access_token,
    refreshToken: signInData.session.refresh_token,
    user: toSafeUser(user),
  };
}

function toSafeUser(user: {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  accountType: AccountType;
  status: UserStatus;
  professionalProfile?: { verificationStatus: string; verificationNotes: string | null } | null;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone ?? '',
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

    // ── Clients : inscription SANS OTP — compte créé et session ouverte
    // immédiatement. La vérification SMS est réservée aux comptes professionnels.
    if (input.accountType === 'client') {
      return createUserAndSession(input);
    }

    // ── Bypass mode (DÉVELOPPEMENT UNIQUEMENT) : crée le compte immédiatement ──
    if (isOtpBypassEnabled()) {
      logger.warn(`[OTP BYPASS — DEV] création immédiate du compte pour ${input.phone} (vérification SMS court-circuitée)`);
      return createUserAndSession(input);
    }

    // ── Normal mode: store pending data + send OTP via SMS ──────────────────────
    await assertOtpRateLimit(input.phone);

    const pending: PendingUser = {
      email: input.email,
      phone: input.phone,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      accountType: input.accountType as AccountType,
      referralCode: input.referralCode,
      businessName: input.businessName,
      businessAddress: input.businessAddress,
      rccm: input.rccm,
      taxNumber: input.taxNumber,
    };
    // Chiffré avant stockage : le payload contient le mot de passe en clair
    const pendingJson = encryptSecret(JSON.stringify(pending));
    await redisSet(PENDING_USER_KEY(input.phone), pendingJson, OTP_TTL);
    pendingUserMemory.set(input.phone, pendingJson);
    setTimeout(() => pendingUserMemory.delete(input.phone), OTP_TTL * 1000);

    const otp = generateOtp();
    await redisSet(OTP_KEY(input.phone), otp, OTP_TTL);
    otpMemory.set(input.phone, otp);
    setTimeout(() => otpMemory.delete(input.phone), OTP_TTL * 1000);

    const ttlMin = Math.round(OTP_TTL / 60);
    // Canal principal : EMAIL (Brevo) — le SMS Orange n'est pas encore configuré.
    try {
      await sendOtpEmail({
        to: [{ email: input.email, name: `${input.firstName} ${input.lastName}`.trim() }],
        firstName: input.firstName,
        code: otp,
        expiresInMinutes: ttlMin,
      });
    } catch (err) {
      // Le code OTP n'est JAMAIS loggué — seul l'échec d'envoi est tracé.
      logger.error('Échec envoi OTP email', { email: input.email, error: (err as Error).message });
    }
    // Best-effort SMS (si Orange est configuré un jour) — n'échoue jamais le flux.
    void sendSms(input.phone, `Votre code de vérification PRIMEO est : ${otp}. Valable ${ttlMin} minutes.`, { isOtp: true })
      .catch((err) => logger.debug('OTP SMS non envoyé (best-effort)', { error: (err as Error).message }));

    return { message: 'Un code de vérification a été envoyé par email. Valable 5 minutes.' };
  },

  // ── Vérification OTP → activation du compte ──────────────────────────────

  async verifyPhone(input: VerifyPhoneInput): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> {
    if (isOtpBypassEnabled()) {
      // Bypass DÉV uniquement : accepte seulement le code de test
      if (input.otp !== BYPASS_OTP) {
        throw new HttpError(400, `Mode test : utilisez le code ${BYPASS_OTP}`);
      }
    } else {
      // Mode normal (incluant TOUTE la production) : validation réelle du code stocké.
      // Aucun code (y compris 000000) n'est accepté sans correspondance exacte non expirée.
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
    const pending: PendingUser = JSON.parse(decryptSecret(pendingRaw));

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
        firstName: pending.firstName,
        lastName: pending.lastName,
        accountType: pending.accountType,
        status: pending.accountType === 'client' ? UserStatus.active : UserStatus.pending,
      },
    });

    // Créer le profil professionnel dès la vérification OTP pour les comptes pro,
    // avec les informations métier saisies à l'inscription (nom, adresse, RCCM…).
    if (pending.accountType !== 'client') {
      const businessName = pending.businessName?.trim()
        || `${pending.firstName} ${pending.lastName}`.trim()
        || 'Professionnel';
      await prisma.professionalProfile.create({
        data: {
          userId: user.id,
          businessName,
          street: pending.businessAddress?.trim() || null,
          rccm: pending.rccm?.trim() || null,
          taxId: pending.taxNumber?.trim() || null,
          verificationStatus: 'pending',
        },
      }).catch((err) => logger.warn('Erreur création ProfessionalProfile (OTP)', err));

      // Restaurant : fiche créée automatiquement (plus d'étape manuelle).
      if (pending.accountType === 'restaurateur') {
        await autoCreateRestaurantForOwner(user.id, businessName, pending.businessAddress);
      }
    }

    // Parrainage — ne bloque pas la création si erreur
    if (pending.referralCode) {
      try {
        const referrer = await prisma.user.findFirst({ where: { referralCode: { equals: pending.referralCode, mode: 'insensitive' } } });
        if (referrer && referrer.id !== user.id) {
          await prisma.referral.create({
            data: {
              referralCode: referrer.referralCode ?? pending.referralCode,
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

    if (isOtpBypassEnabled()) {
      await redisSet(OTP_KEY(phone), BYPASS_OTP, OTP_TTL);
      otpMemory.set(phone, BYPASS_OTP);
      logger.warn(`[OTP BYPASS — DEV] resend pour ${phone}`);
      return;
    }

    await assertOtpRateLimit(phone);

    const otp = generateOtp();
    await redisSet(OTP_KEY(phone), otp, OTP_TTL);
    otpMemory.set(phone, otp);
    setTimeout(() => otpMemory.delete(phone), OTP_TTL * 1000);

    // Récupère l'email depuis l'inscription en cours (payload chiffré) pour l'envoi.
    let email = '';
    let firstName = '';
    let lastName = '';
    try {
      let raw: string;
      try { raw = decryptSecret(pending); } catch { raw = pending; } // repli : payload non chiffré (legacy)
      const p = JSON.parse(raw) as PendingUser;
      email = p.email; firstName = p.firstName; lastName = p.lastName;
    } catch { /* payload illisible — on tentera quand même le SMS best-effort */ }

    const ttlMin = Math.round(OTP_TTL / 60);
    if (email) {
      try {
        await sendOtpEmail({
          to: [{ email, name: `${firstName} ${lastName}`.trim() }],
          firstName,
          code: otp,
          expiresInMinutes: ttlMin,
        });
      } catch (err) {
        logger.error('Échec renvoi OTP email', { error: (err as Error).message });
      }
    }
    // Best-effort SMS (si Orange est configuré un jour).
    void sendSms(phone, `Votre nouveau code PRIMEO est : ${otp}. Valable ${ttlMin} minutes.`, { isOtp: true })
      .catch((err) => logger.debug('Renvoi OTP SMS non envoyé (best-effort)', { error: (err as Error).message }));
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
    const { data: { user: sbUser } } = await supabaseAdmin.auth.admin.getUserById(signInData.user.id);
    const twoFactorEnabled = sbUser?.user_metadata?.twoFactorEnabled as boolean | undefined;
    const twoFactorSecret  = sbUser?.user_metadata?.twoFactorSecret  as string  | undefined;

    if (twoFactorEnabled && twoFactorSecret) {
      // Refresh token chiffré (AES-256-GCM) avant stockage en Redis,
      // et supprimé immédiatement après usage dans verifyTotp.
      await redisSet(
        TOTP_PENDING_KEY(user.id),
        encryptSecret(JSON.stringify({ supabaseRefreshToken: signInData.session.refresh_token })),
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

  // ── Connexion / inscription via Google (clients uniquement) ─────────────────
  //
  // Flux : le client mobile/web complète l'OAuth Google via Supabase Auth
  // (GET {SUPABASE_URL}/auth/v1/authorize?provider=google) et reçoit une
  // session Supabase (access + refresh token). Il appelle ensuite cet endpoint
  // pour synchroniser la table `users` (création du compte client si premier
  // login) et récupérer le profil applicatif.

  async googleAuth(input: GoogleAuthInput): Promise<{ accessToken: string; refreshToken: string; user: SafeUser; isNewUser: boolean }> {
    // Valider le token de session Supabase et récupérer l'identité
    const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(input.accessToken);
    if (error || !sbUser) {
      throw new HttpError(401, 'Session Google invalide ou expirée. Réessayez.');
    }

    // S'assurer que la session provient bien du provider Google
    const providers: string[] = (sbUser.app_metadata?.providers as string[] | undefined)
      ?? (sbUser.app_metadata?.provider ? [sbUser.app_metadata.provider as string] : []);
    if (!providers.includes('google')) {
      throw new HttpError(400, 'Cette session ne provient pas d\'une connexion Google.');
    }

    if (!sbUser.email) {
      throw new HttpError(400, 'Le compte Google ne fournit pas d\'adresse email.');
    }

    // Compte applicatif existant (même UUID Supabase) → connexion
    let user = await prisma.user.findUnique({
      where: { id: sbUser.id },
      include: { professionalProfile: { select: { verificationStatus: true, verificationNotes: true } } },
    });
    let isNewUser = false;

    if (user) {
      // Google est réservé aux clients : les pros et admins gardent leur flux dédié
      if (user.accountType !== AccountType.client) {
        await supabaseAdmin.auth.admin.signOut(input.accessToken).catch(() => null);
        throw new HttpError(403, 'La connexion Google est réservée aux comptes clients. Utilisez votre email et mot de passe.');
      }
      if (user.status === UserStatus.suspended) {
        await supabaseAdmin.auth.admin.signOut(input.accessToken).catch(() => null);
        throw new HttpError(403, 'Votre compte est suspendu. Contactez le support.');
      }
      if (user.status === UserStatus.banned) {
        await supabaseAdmin.auth.admin.signOut(input.accessToken).catch(() => null);
        throw new HttpError(403, 'Votre compte a été désactivé.');
      }
    } else {
      // Cohérence : un compte applicatif avec le même email mais un autre UUID
      // Supabase signifie que l'identité Google n'a pas été liée (ex : email non
      // vérifié côté Google). On refuse plutôt que de créer un doublon.
      const emailUser = await prisma.user.findUnique({ where: { email: sbUser.email.toLowerCase() } });
      if (emailUser) {
        await supabaseAdmin.auth.admin.signOut(input.accessToken).catch(() => null);
        throw new HttpError(409, 'Un compte existe déjà avec cet email. Connectez-vous avec votre mot de passe.');
      }

      // Premier login Google → création du compte client (statut actif, sans téléphone)
      const meta = (sbUser.user_metadata ?? {}) as Record<string, unknown>;
      const fullName = (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? '';
      const [firstName, ...rest] = fullName.trim().split(/\s+/);
      const avatarUrl = (meta.avatar_url as string | undefined) ?? (meta.picture as string | undefined) ?? null;

      const created = await prisma.user.create({
        data: {
          id: sbUser.id,
          email: sbUser.email.toLowerCase(),
          phone: null, // pas de numéro : compte Google, aucune vérification OTP requise
          firstName: firstName || 'Client',
          lastName: rest.join(' ') || 'Primeo',
          avatarUrl,
          accountType: AccountType.client,
          status: UserStatus.active,
        },
      });
      user = { ...created, professionalProfile: null };
      isNewUser = true;
      logger.info('Nouveau compte client créé via Google', { userId: created.id });
    }

    // Garantir le rôle dans les metadata Supabase (utilisé par le middleware JWT)
    if (sbUser.app_metadata?.role !== 'client') {
      await supabaseAdmin.auth.admin
        .updateUserById(sbUser.id, { app_metadata: { ...sbUser.app_metadata, role: 'client' } })
        .catch((err) => logger.warn('googleAuth: impossible de fixer app_metadata.role', { userId: sbUser.id, error: (err as Error).message }));
    }

    return {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      user: toSafeUser(user),
      isNewUser,
    };
  },

  // ── Vérification TOTP (2ème facteur) ────────────────────────────────────────

  async verifyTotp(input: VerifyTotpInput): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> {
    const pendingRaw = await redisGet(TOTP_PENDING_KEY(input.userId));
    if (!pendingRaw) {
      throw new HttpError(400, 'Session 2FA expirée. Reconnectez-vous.');
    }

    const { supabaseRefreshToken } = JSON.parse(decryptSecret(pendingRaw)) as { supabaseRefreshToken: string };

    // Lire le secret TOTP depuis Supabase user_metadata
    const { data: { user: sbUser } } = await supabaseAdmin.auth.admin.getUserById(input.userId);
    const twoFactorSecret = sbUser?.user_metadata?.twoFactorSecret as string | undefined;
    if (!twoFactorSecret) {
      throw new HttpError(400, 'Utilisateur introuvable ou 2FA non configuré');
    }

    const isValid = verifyTotpCode(twoFactorSecret, input.token);
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

    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      include: { professionalProfile: { select: { verificationStatus: true, verificationNotes: true } } },
    });
    if (!user) throw new HttpError(400, 'Utilisateur introuvable');

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
  // Génère un lien de récupération via Supabase Auth et l'envoie via Brevo.

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.debug('forgotPassword: email non trouvé (réponse générique)', { email });
      return;
    }

    const redirectTo = `${env.FRONTEND_URL ?? env.PUBLIC_URL}/reset-password`;
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      logger.error('forgotPassword: erreur génération lien Supabase', { email, error: linkError?.message });
      throw new HttpError(500, 'Erreur lors de l\'envoi du lien de réinitialisation');
    }

    try {
      await sendPasswordResetEmail({
        to: [{ email: user.email, name: `${user.firstName} ${user.lastName}` }],
        firstName: user.firstName,
        resetUrl: linkData.properties.action_link,
        expiresInMinutes: 60,
      });
    } catch (err) {
      logger.error('Échec envoi email de réinitialisation', {
        userId: user.id,
        error: (err as Error).message,
      });
    }
  },

  // ── Réinitialisation du mot de passe ────────────────────────────────────────
  // Accepte le recovery token Supabase extrait du fragment de l'URL de redirection.

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    // Valider le recovery token via Supabase
    const { data: { user: sbUser }, error: getUserError } = await supabaseAdmin.auth.getUser(input.recoveryToken);
    if (getUserError || !sbUser) {
      throw new HttpError(400, 'Lien de réinitialisation invalide ou expiré');
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(sbUser.id, {
      password: input.password,
    });

    if (updateError) {
      logger.error('Erreur maj mot de passe Supabase', { userId: sbUser.id, error: updateError.message });
      throw new HttpError(500, 'Erreur lors de la réinitialisation du mot de passe');
    }

    logger.info('Mot de passe réinitialisé', { userId: sbUser.id });
  },
};
