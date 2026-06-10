// User entity — TypeScript type mirroring the Prisma User model
// The authoritative schema is in prisma/schema.prisma
import type { User } from '@prisma/client';

export type UserEntity = User;
export type SafeUser = UserEntity;
