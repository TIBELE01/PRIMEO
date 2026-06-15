jest.mock('../../common/handlers/http-error.handler', () => ({
  HttpError: class HttpError extends Error { statusCode: number; constructor(s: number, m: string) { super(m); this.statusCode = s; } },
}));
jest.mock('../properties/properties.service', () => ({
  serializeProperty: jest.fn((p: any) => p),
}));

const mockPrisma: Record<string, any> = {
  favorite: {
    findMany: jest.fn(async () => []),
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    createMany: jest.fn(async () => ({})),
  },
  favoriteList: {
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    create: jest.fn(async (a: any) => ({ id: 'l1', ...a.data })),
    update: jest.fn(async (a: any) => ({ id: 'l1', ...a.data })),
    findFirst: jest.fn(),
    delete: jest.fn(async () => ({})),
  },
  favoriteListItem: {
    create: jest.fn(async (a: any) => ({ id: 'i1', ...a.data })),
    findUnique: jest.fn(),
    delete: jest.fn(async () => ({})),
    deleteMany: jest.fn(async () => ({})),
    createMany: jest.fn(async () => ({})),
    findMany: jest.fn(async () => []),
  },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { favoritesService } from './favorites.service';

beforeEach(() => jest.clearAllMocks());

describe('createList', () => {
  it('creates a list', async () => {
    const res = await favoritesService.createList('u1', 'Vacances');
    expect(mockPrisma.favoriteList.create).toHaveBeenCalledWith(expect.objectContaining({ data: { userId: 'u1', name: 'Vacances' } }));
    expect(res).toMatchObject({ id: 'l1' });
  });
  it('rejects empty name (400)', async () => {
    await expect(favoritesService.createList('u1', '  ')).rejects.toMatchObject({ statusCode: 400 });
  });
  it('rejects if 20+ lists already exist (400)', async () => {
    mockPrisma.favoriteList.count.mockResolvedValue(20);
    await expect(favoritesService.createList('u1', 'Extra')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('deleteList', () => {
  it('deletes list owned by user', async () => {
    mockPrisma.favoriteList.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1' });
    const res = await favoritesService.deleteList('l1', 'u1');
    expect(res).toEqual({ removed: true });
  });
  it('404 if list not owned by user', async () => {
    mockPrisma.favoriteList.findFirst.mockResolvedValue(null);
    await expect(favoritesService.deleteList('l1', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('addItemToList / removeItemFromList', () => {
  it('adds a property to a list', async () => {
    mockPrisma.favoriteList.findFirst.mockResolvedValue({ id: 'l1' });
    const res = await favoritesService.addItemToList('l1', 'p1', 'u1');
    expect(mockPrisma.favoriteListItem.create).toHaveBeenCalledWith(expect.objectContaining({ data: { listId: 'l1', propertyId: 'p1' } }));
    expect(res).toMatchObject({ id: 'i1' });
  });
  it('removes a property from a list', async () => {
    mockPrisma.favoriteList.findFirst.mockResolvedValue({ id: 'l1' });
    mockPrisma.favoriteListItem.findUnique.mockResolvedValue({ id: 'i1' });
    const res = await favoritesService.removeItemFromList('l1', 'p1', 'u1');
    expect(res).toEqual({ removed: true });
  });
});

describe('renameList', () => {
  it('renames a list owned by the user', async () => {
    mockPrisma.favoriteList.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', name: 'Ancien nom' });
    const res = await favoritesService.renameList('l1', 'u1', 'Nouveau nom');
    expect(mockPrisma.favoriteList.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'l1' }, data: { name: 'Nouveau nom' } }),
    );
    expect(res).toMatchObject({ id: 'l1' });
  });
  it('rejects empty name (400)', async () => {
    await expect(favoritesService.renameList('l1', 'u1', '  ')).rejects.toMatchObject({ statusCode: 400 });
  });
  it('404 if list not found or not owned', async () => {
    mockPrisma.favoriteList.findFirst.mockResolvedValue(null);
    await expect(favoritesService.renameList('l1', 'u1', 'Nom')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('bulkSyncFavorites', () => {
  it('upserts multiple favorites without duplicates', async () => {
    const res = await favoritesService.bulkSyncFavorites('u1', ['p1', 'p2', 'p3']);
    expect(mockPrisma.favorite.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(res).toEqual({ synced: 3 });
  });
  it('returns synced 0 for empty array', async () => {
    const res = await favoritesService.bulkSyncFavorites('u1', []);
    expect(mockPrisma.favorite.createMany).not.toHaveBeenCalled();
    expect(res).toEqual({ synced: 0 });
  });
});

describe('bulkSyncList', () => {
  it('syncs propertyIds to a list', async () => {
    mockPrisma.favoriteList.findFirst.mockResolvedValue({ id: 'l1' });
    const res = await favoritesService.bulkSyncList('l1', ['p1', 'p2'], 'u1');
    expect(mockPrisma.favoriteListItem.deleteMany).toHaveBeenCalledWith({ where: { listId: 'l1' } });
    expect(mockPrisma.favoriteListItem.createMany).toHaveBeenCalled();
    expect(res).toEqual({ synced: 2 });
  });
});
