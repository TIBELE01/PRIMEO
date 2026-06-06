// User factory — generates test user objects for seeding and unit tests
import type { Prisma } from '@prisma/client';

let counter = 0;

export function buildUser(overrides: Partial<Prisma.UserCreateInput> = {}): Prisma.UserCreateInput {
  counter++;
  return {
    email: `user${counter}@test.com`,
    phone: `+225070000${String(counter).padStart(4, '0')}`,
    passwordHash: '$2b$12$testhash',
    firstName: `User${counter}`,
    lastName: 'Test',
    role: 'client',
    isEmailVerified: true,
    isPhoneVerified: true,
    ...overrides,
  };
}

export function buildProfessional(overrides: Partial<Prisma.UserCreateInput> = {}): Prisma.UserCreateInput {
  return buildUser({ role: 'professional_hebergement', ...overrides });
}
