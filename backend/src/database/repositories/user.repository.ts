// User repository — thin wrapper over Prisma for user-related DB operations
import { prisma } from '../prisma.service';
import { Prisma } from '@prisma/client';

export const userRepository = {
  findById: (id: string) =>
    prisma.user.findUnique({ where: { id } }),

  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findByPhone: (phone: string) =>
    prisma.user.findUnique({ where: { phone } }),

  create: (data: Prisma.UserCreateInput) =>
    prisma.user.create({ data }),

  update: (id: string, data: Prisma.UserUpdateInput) =>
    prisma.user.update({ where: { id }, data }),

  delete: (id: string) =>
    prisma.user.delete({ where: { id } }),

  findMany: (args?: Prisma.UserFindManyArgs) =>
    prisma.user.findMany(args),

  count: (args?: Prisma.UserCountArgs) =>
    prisma.user.count(args),
};
