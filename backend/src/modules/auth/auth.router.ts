// Auth routes — inscription, connexion, OTP, TOTP, rotation de tokens, logout
import { Router } from 'express';
import {
  register,
  verifyPhone,
  login,
  verifyTotp,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  resendOtp,
} from './auth.controller';
import { validate } from '../../common/validators/validation.middleware';
import { authRateLimit } from '../../common/middleware/rate-limit.middleware';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import {
  RegisterDto,
  VerifyPhoneDto,
  ResendOtpDto,
  LoginDto,
  VerifyTotpDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

export const authRouter = Router();

// Inscription et vérification téléphone
authRouter.post('/register', authRateLimit, validate(RegisterDto), register);
authRouter.post('/verify-phone', authRateLimit, validate(VerifyPhoneDto), verifyPhone);
authRouter.post('/resend-otp', authRateLimit, validate(ResendOtpDto), resendOtp);

// Connexion et 2FA
authRouter.post('/login', authRateLimit, validate(LoginDto), login);
authRouter.post('/2fa/verify',    authRateLimit, validate(VerifyTotpDto), verifyTotp);
authRouter.post('/verify-totp',   authRateLimit, validate(VerifyTotpDto), verifyTotp);

// Gestion des tokens
authRouter.post('/refresh', validate(RefreshTokenDto), refreshToken);
authRouter.post('/logout', authenticate, logout);

// Réinitialisation de mot de passe
authRouter.post('/forgot-password', authRateLimit, validate(ForgotPasswordDto), forgotPassword);
authRouter.post('/reset-password', authRateLimit, validate(ResetPasswordDto), resetPassword);
