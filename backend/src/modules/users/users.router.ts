// Users routes — profile management (auth required)
import { Router } from 'express';
import {
  getProfile, updateProfile, changePassword,
  deactivateAccount, reactivateAccount, deleteAccount,
  getUserById, setup2fa, confirm2fa, disable2fa,
} from './users.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { UpdateProfileDto, ChangePasswordDto, Confirm2faDto, DeactivateDto, DeleteAccountDto } from './dto/users.dto';
import { parseId } from '../../common/validators/parse-id.middleware';

export const usersRouter = Router();

usersRouter.use(authenticate);

// Profil
usersRouter.get('/me',                  getProfile);
usersRouter.patch('/me',                validate(UpdateProfileDto), updateProfile);
usersRouter.patch('/me/password',       validate(ChangePasswordDto), changePassword);

// Désactivation / Suppression
usersRouter.post('/me/deactivate',      validate(DeactivateDto), deactivateAccount);
usersRouter.post('/me/reactivate',      reactivateAccount);
usersRouter.delete('/me',               validate(DeleteAccountDto), deleteAccount);

// 2FA
usersRouter.post('/me/2fa/setup',       setup2fa);
usersRouter.post('/me/2fa/confirm',     validate(Confirm2faDto), confirm2fa);
usersRouter.delete('/me/2fa',           disable2fa);

// Admin
usersRouter.get('/:id',                 authorize('admin'), parseId, getUserById);
