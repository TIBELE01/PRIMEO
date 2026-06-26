// Tests unitaires — gestion des tables de restaurant (couverts, emplacement).
const mockPrisma = {
  property: { findUnique: jest.fn() },
  restaurantTable: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { restaurantService } from './restaurant.service';

const OWNER = 'owner-1';
const PID = 'resto-1';

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.property.findUnique.mockResolvedValue({ ownerId: OWNER }); // propriétaire par défaut
});

describe('restaurantService — tables', () => {
  it('getTables liste les tables du restaurant', async () => {
    mockPrisma.restaurantTable.findMany.mockResolvedValue([{ id: 't1', name: 'Table 1', seats: 4 }]);
    const r = await restaurantService.getTables(PID);
    expect(r).toHaveLength(1);
    expect(mockPrisma.restaurantTable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { propertyId: PID } }),
    );
  });

  it('createTable crée une table avec couverts + emplacement', async () => {
    mockPrisma.restaurantTable.create.mockResolvedValue({ id: 't1' });
    await restaurantService.createTable(PID, OWNER, { name: 'Terrasse 3', seats: 6, location: 'Terrasse' });
    expect(mockPrisma.restaurantTable.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ propertyId: PID, name: 'Terrasse 3', seats: 6, location: 'Terrasse' }),
      }),
    );
  });

  it('createTable rejette un nombre de couverts < 1 (400)', async () => {
    await expect(
      restaurantService.createTable(PID, OWNER, { name: 'X', seats: 0 }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('createTable rejette si l\'appelant n\'est pas propriétaire (403)', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ ownerId: 'autre' });
    await expect(
      restaurantService.createTable(PID, OWNER, { name: 'X', seats: 4 }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('updateTable rejette une table d\'un autre restaurant (404)', async () => {
    mockPrisma.restaurantTable.findUnique.mockResolvedValue({ id: 't1', propertyId: 'autre-resto' });
    await expect(
      restaurantService.updateTable(PID, 't1', OWNER, { seats: 2 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deleteTable supprime après vérification de propriété', async () => {
    mockPrisma.restaurantTable.findUnique.mockResolvedValue({ id: 't1', propertyId: PID });
    mockPrisma.restaurantTable.delete.mockResolvedValue({});
    await restaurantService.deleteTable(PID, 't1', OWNER);
    expect(mockPrisma.restaurantTable.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });
});
