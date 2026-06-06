// JWT token configuration — access tokens (15m) and refresh tokens (7d)
import { env } from './env.config';

export const jwtConfig = {
  accessSecret: env.JWT_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET ?? env.JWT_SECRET,
  accessExpiresIn: env.JWT_EXPIRE,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRE,
} as const;
