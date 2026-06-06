// TOTP (Time-based One-Time Password) for 2FA — mandatory for professional accounts
import { TOTP, Secret } from 'otpauth';
import * as QRCode from 'qrcode';

const ISSUER = 'Primeo';
const ALGORITHM = 'SHA1';
const DIGITS = 6;
const PERIOD = 30;

export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function generateTotpUri(secret: string, userEmail: string): string {
  const totp = new TOTP({ issuer: ISSUER, label: userEmail, algorithm: ALGORITHM, digits: DIGITS, period: PERIOD, secret: Secret.fromBase32(secret) });
  return totp.toString();
}

export async function generateQrCode(uri: string): Promise<string> {
  return QRCode.toDataURL(uri);
}

export function verifyTotp(secret: string, token: string): boolean {
  const totp = new TOTP({ issuer: ISSUER, algorithm: ALGORITHM, digits: DIGITS, period: PERIOD, secret: Secret.fromBase32(secret) });
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}
