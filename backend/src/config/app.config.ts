// General application configuration
import { env } from './env.config';

export const appConfig = {
  name: 'Primeo API',
  version: '1.0.0',
  env: env.NODE_ENV,
  port: env.PORT,
  publicUrl: env.PUBLIC_URL,
  backendUrl: env.BACKEND_URL,
  frontendUrl: env.FRONTEND_URL,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
} as const;

export const cookieConfig = {
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE as 'strict' | 'lax' | 'none',
  domain: env.COOKIE_DOMAIN,
  httpOnly: true,
} as const;
