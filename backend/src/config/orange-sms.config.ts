// Orange SMS API configuration — used for OTP delivery in Côte d'Ivoire
import { env } from './env.config';

export const orangeSmsConfig = {
  clientId: env.ORANGE_CLIENT_ID,
  clientSecret: env.ORANGE_CLIENT_SECRET,
  sender: env.ORANGE_SENDER ?? 'PRIMEO',
  tokenUrl: 'https://api.orange.com/oauth/v3/token',
  smsUrl: 'https://api.orange.com/smsmessaging/v1/outbound',
  otpExpiresInSeconds: 300, // 5 minutes
  otpLength: 6,
} as const;
