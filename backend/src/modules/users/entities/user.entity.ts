// User entity — TypeScript type mirroring the Prisma User model (sans sensitive fields)
// The authoritative schema is in prisma/schema.prisma
import type { User } from '@prisma/client';

export type UserEntity = Omit<User, 'passwordHash' | 'totpSecret' | 'refreshToken'>;
export type SafeUser = UserEntity;
