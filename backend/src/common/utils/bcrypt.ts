// bcrypt password hashing utilities — cost factor from BCRYPT_SALT env var
import * as bcrypt from 'bcrypt';
import { env } from '../../config/env.config';

const SALT_ROUNDS = env.BCRYPT_SALT;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
