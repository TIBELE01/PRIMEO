// Professional routes — KYC submission, TOTP setup, profile management
import { Router } from 'express';
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

export const professionalRouter = Router();

professionalRouter.use(authenticate);
professionalRouter.use(authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'));

professionalRouter.get('/profile', getProfessionalProfile);
professionalRouter.post('/kyc', validate(SubmitKycDto), submitKyc);
professionalRouter.get('/kyc/status', getKycStatus);
professionalRouter.post('/totp/setup', setupTotp);
professionalRouter.post('/totp/confirm', validate(ConfirmTotpDto), confirmTotp);
professionalRouter.delete('/totp', disableTotp);
