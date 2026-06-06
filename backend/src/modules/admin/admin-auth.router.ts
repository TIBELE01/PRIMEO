// Admin auth routes — login, TOTP, session (outside the protected admin router)
import { Router } from 'express';
import { adminLogin, adminVerifyTotp, adminMe } from './admin-auth.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authRateLimit } from '../../common/middleware/rate-limit.middleware';

export const adminAuthRouter = Router();

adminAuthRouter.post('/login',        authRateLimit, adminLogin);
adminAuthRouter.post('/totp/verify',  authRateLimit, adminVerifyTotp);
adminAuthRouter.get( '/me',           authenticate,  adminMe);
