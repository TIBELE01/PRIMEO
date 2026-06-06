// JWT helpers — sign and verify access/refresh tokens
import * as jwt from 'jsonwebtoken';
import { jwtConfig } from '../../config/jwt.config';
import { UserRole } from '../constants/roles';

export interface TokenPayload {
  sub: string;        // user ID
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, jwtConfig.accessSecret) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, jwtConfig.refreshSecret) as TokenPayload;
  } catch {
    return null;
  }
}
