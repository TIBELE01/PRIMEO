// Property repository — DB operations for listings across all sectors
import { prisma } from '../prisma.service';
import { Prisma } from '@prisma/client';

export const propertyRepository = {
  findById: (id: string) =>
    prisma.property.findUnique({ where: { id }, include: { owner: true, availabilities: true } }),

  findMany: (args?: Prisma.PropertyFindManyArgs) =>
    prisma.property.findMany(args),

  create: (data: Prisma.PropertyCreateInput) =>
    prisma.property.create({ data }),

  update: (id: string, data: Prisma.PropertyUpdateInput) =>
    prisma.property.update({ where: { id }, data }),

  delete: (id: string) =>
    prisma.property.delete({ where: { id } }),

  count: (args?: Prisma.PropertyCountArgs) =>
    prisma.property.count(args),

  search: (params: { query?: string; city?: string; type?: string; page: number; limit: number }) => {
    const where: Prisma.PropertyWhereInput = {
      status: 'active',
      ...(params.query ? { title: { contains: params.query, mode: 'insensitive' } } : {}),
      ...(params.city ? { city: { contains: params.city, mode: 'insensitive' } } : {}),
      ...(params.type ? { propertyType: params.type as never } : {}),
    };
    return prisma.property.findMany({
      where,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: { createdAt: 'desc' },
    });
  },
};
