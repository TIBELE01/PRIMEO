// Property factory — generates test property objects for seeding and unit tests
import type { Prisma } from '@prisma/client';

let counter = 0;

export function buildProperty(
  ownerId: string,
  overrides: Partial<Prisma.PropertyCreateInput> = {}
): Prisma.PropertyCreateInput {
  counter++;
  return {
    owner: { connect: { id: ownerId } },
    name: `Property ${counter}`,
    description: 'Test property description with enough characters for validation.',
    type: 'villa',
    address: `${counter} Test Street, Cocody`,
    city: 'Abidjan',
    pricePerNight: 50_000,
    amenities: ['wifi', 'parking'],
    paymentOptions: ['full_online', 'ten_percent_online'],
    isPublished: true,
    ...overrides,
  };
}
