// Professional routes — KYC submission, TOTP setup, profile management
import { Router } from 'express';
import multer from 'multer';
import {
  submitKyc,
  getKycStatus,
  setupTotp,
  confirmTotp,
  disableTotp,
  getProfessionalProfile,
} from './professional.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { SubmitKycDto, ConfirmTotpDto } from './dto/professional.dto';

// Upload en mémoire — les documents KYC sont relayés vers Cloudinary (max 10 Mo/fichier)
const kycUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const kycFields = kycUpload.fields([
  { name: 'id_card', maxCount: 2 },
  { name: 'rccm_extract', maxCount: 1 },
  { name: 'tax_id_certificate', maxCount: 1 },
  { name: 'tourist_license', maxCount: 1 },
  { name: 'other', maxCount: 3 },
]);

export const professionalRouter = Router();

professionalRouter.use(authenticate);
professionalRouter.use(authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'));

professionalRouter.get('/profile', getProfessionalProfile);
// multipart : champs texte (businessName, rccm…) + fichiers (id_card, rccm_extract…)
// multer parse le multipart AVANT la validation Zod des champs texte.
professionalRouter.post('/kyc', kycFields, validate(SubmitKycDto), submitKyc);
professionalRouter.get('/kyc/status', getKycStatus);
professionalRouter.post('/totp/setup', setupTotp);
professionalRouter.post('/totp/confirm', validate(ConfirmTotpDto), confirmTotp);
professionalRouter.delete('/totp', disableTotp);
