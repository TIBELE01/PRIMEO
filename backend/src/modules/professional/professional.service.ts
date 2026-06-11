// Service professionnel — workflow KYC (soumission documents) et gestion TOTP
import type { DocumentType } from '@prisma/client';
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { generateTotpSecret, generateTotpUri, generateQrCode, verifyTotp } from '../../common/utils/totp';
import { uploadToCloudinary } from '../../common/utils/s3-client';
import { cloudinaryConfig } from '../../config/cloudinary.config';
import { logger } from '../../common/utils/logger';
import { SubmitKycInput } from './dto/professional.dto';
import { supabaseAdmin } from '../../config/supabase.config';

// Mapping nom de champ multipart → type de document KYC en base
const KYC_DOCUMENT_FIELDS: Record<string, DocumentType> = {
  id_card: 'id_card',
  rccm_extract: 'rccm_extract',
  tax_id_certificate: 'tax_id_certificate',
  tourist_license: 'tourist_license',
  other: 'other',
};

// Formats acceptés pour les pièces justificatives (image ou PDF)
const ALLOWED_KYC_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
// Plafonds différenciés : 5 Mo pour les images, 10 Mo pour les PDF
const MAX_KYC_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_KYC_PDF_BYTES = 10 * 1024 * 1024;

type UploadedFiles = Record<string, Express.Multer.File[]> | Express.Multer.File[] | undefined;

export const professionalService = {
  async getProfile(userId: string) {
    const profile = await prisma.professionalProfile.findUnique({ where: { userId } });
    if (!profile) throw new HttpError(404, 'Professional profile not found');
    return profile;
  },

  /**
   * Soumission (ou re-soumission) du dossier KYC d'un professionnel.
   * - Met à jour les informations légales du profil.
   * - Téléverse chaque document fourni vers Cloudinary (dossier kyc) et enregistre
   *   les URLs dans professional_documents.
   * - Repasse le statut de vérification à "pending" (cas d'une re-soumission après rejet).
   */
  async submitKyc(userId: string, input: SubmitKycInput, files?: UploadedFiles) {
    // Normalise les fichiers en map { champ: File[] }
    const fileMap: Record<string, Express.Multer.File[]> = Array.isArray(files)
      ? {}
      : (files ?? {});

    // Récupère ou crée le profil professionnel
    const existing = await prisma.professionalProfile.findUnique({
      where: { userId },
      include: { documents: true },
    });

    const profile = existing
      ? await prisma.professionalProfile.update({
          where: { userId },
          data: {
            businessName: input.businessName,
            rccm: input.rccm ?? existing.rccm,
            taxId: input.taxId ?? existing.taxId,
            touristLicense: input.touristLicense ?? existing.touristLicense,
            street: input.street ?? existing.street,
            city: input.city ?? existing.city,
            description: input.description ?? existing.description,
            // Re-soumission : on réinitialise le statut pour une nouvelle revue admin
            verificationStatus: 'pending',
            verificationNotes: null,
            verifiedAt: null,
            verifiedBy: null,
          },
        })
      : await prisma.professionalProfile.create({
          data: {
            userId,
            businessName: input.businessName,
            rccm: input.rccm ?? null,
            taxId: input.taxId ?? null,
            touristLicense: input.touristLicense ?? null,
            street: input.street ?? null,
            city: input.city ?? null,
            description: input.description ?? null,
            verificationStatus: 'pending',
          },
        });

    // Téléverse chaque document fourni
    const uploaded: { type: DocumentType; url: string }[] = [];
    for (const [field, documentType] of Object.entries(KYC_DOCUMENT_FIELDS)) {
      const filesForField = fileMap[field];
      if (!filesForField || filesForField.length === 0) continue;

      for (const file of filesForField) {
        if (!ALLOWED_KYC_MIME.includes(file.mimetype)) {
          throw new HttpError(400, `Format de fichier non autorisé pour ${field} : ${file.mimetype}`);
        }
        const isPdf = file.mimetype === 'application/pdf';
        const maxBytes = isPdf ? MAX_KYC_PDF_BYTES : MAX_KYC_IMAGE_BYTES;
        if (file.size > maxBytes) {
          throw new HttpError(
            400,
            `Le fichier ${file.originalname} dépasse la taille maximale de ${isPdf ? '10 Mo (PDF)' : '5 Mo (image)'}`,
          );
        }

        // 'auto' permet de gérer indifféremment images et PDF
        const result = await uploadToCloudinary(
          file.buffer,
          cloudinaryConfig.folders.kyc,
          file.originalname,
          'auto',
        );

        await prisma.professionalDocument.create({
          data: { profileId: profile.id, type: documentType, url: result.url },
        });
        uploaded.push({ type: documentType, url: result.url });
      }
    }

    logger.info(`KYC soumis (userId=${userId}) — ${uploaded.length} document(s) téléversé(s)`);

    const refreshed = await prisma.professionalProfile.findUnique({
      where: { userId },
      include: { documents: { orderBy: { uploadedAt: 'desc' } } },
    });

    return {
      message: 'Dossier KYC soumis. Il sera examiné par notre équipe.',
      verificationStatus: refreshed?.verificationStatus,
      documentsCount: refreshed?.documents.length ?? 0,
      uploaded,
      profile: refreshed,
    };
  },

  async getKycStatus(userId: string) {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
      select: {
        verificationStatus: true,
        verifiedAt: true,
        verificationNotes: true,
        businessName: true,
        rccm: true,
        taxId: true,
        touristLicense: true,
        documents: {
          select: { id: true, type: true, url: true, uploadedAt: true, rejectedReason: true },
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });
    if (!profile) throw new HttpError(404, 'Profile not found');
    return profile;
  },

  async setupTotp(userId: string) {
    const secret = generateTotpSecret();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'User not found');

    // Store secret temporarily in Supabase user_metadata (not enabled until confirmed)
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { twoFactorSecret: secret, twoFactorEnabled: false },
    });

    const uri = generateTotpUri(secret, user.email);
    const qrCode = await generateQrCode(uri);
    return { secret, qrCode };
  },

  async confirmTotp(userId: string, token: string) {
    const { data: { user: sbUser }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !sbUser) throw new HttpError(404, 'User not found');

    const secret = sbUser.user_metadata?.twoFactorSecret as string | undefined;
    if (!secret) throw new HttpError(400, 'TOTP setup not started');

    const isValid = verifyTotp(secret, token);
    if (!isValid) throw new HttpError(400, 'Invalid TOTP token');

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...sbUser.user_metadata, twoFactorEnabled: true },
    });
  },

  async disableTotp(userId: string) {
    const { data: { user: sbUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...sbUser?.user_metadata, twoFactorEnabled: false, twoFactorSecret: null },
    });
  },
};
