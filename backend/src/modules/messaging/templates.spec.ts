// Tests des réponses rapides (templates) : génériques client, défauts/CRUD pro.
jest.mock('../../common/handlers/http-error.handler', () => ({
  HttpError: class HttpError extends Error { statusCode: number; constructor(s: number, m: string) { super(m); this.statusCode = s; } },
}));

const mockPrisma: Record<string, any> = {
  message: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
  messageTemplate: {
    findMany: jest.fn(async () => []), findFirst: jest.fn(), count: jest.fn(async () => 0),
    create: jest.fn(async (a: any) => ({ id: 't1', ...a.data })), update: jest.fn(async (a: any) => ({ id: a.where.id, ...a.data })), delete: jest.fn(async () => ({})),
  },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { messagingService } from './messaging.service';

beforeEach(() => jest.clearAllMocks());

describe('listTemplates', () => {
  it('client : renvoie des modèles génériques non éditables', async () => {
    const res = await messagingService.listTemplates('c1', 'client');
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((t: any) => t.editable === false && t.id.startsWith('generic-'))).toBe(true);
  });

  it('pro sans modèle : renvoie des suggestions par défaut (non éditables)', async () => {
    mockPrisma.messageTemplate.findMany.mockResolvedValue([]);
    const res = await messagingService.listTemplates('p1', 'professional_hebergement');
    expect(res.every((t: any) => t.id.startsWith('default-'))).toBe(true);
  });

  it('pro avec modèles : renvoie ses modèles éditables', async () => {
    mockPrisma.messageTemplate.findMany.mockResolvedValue([{ id: 'x', label: 'L', content: 'C' }]);
    const res = await messagingService.listTemplates('p1', 'restaurateur');
    expect(res).toEqual([{ id: 'x', label: 'L', content: 'C', editable: true }]);
  });
});

describe('createTemplate', () => {
  it('crée un modèle pour un pro', async () => {
    const res = await messagingService.createTemplate('p1', 'professional_hotel', { label: 'Bonjour', content: 'Bienvenue !' });
    expect(mockPrisma.messageTemplate.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'p1', label: 'Bonjour', content: 'Bienvenue !' }),
    }));
    expect(res).toMatchObject({ id: 't1' });
  });
  it('refuse un client (403)', async () => {
    await expect(messagingService.createTemplate('c1', 'client', { label: 'a', content: 'b' })).rejects.toMatchObject({ statusCode: 403 });
  });
  it('refuse un contenu vide (400)', async () => {
    await expect(messagingService.createTemplate('p1', 'professional_hotel', { label: '  ', content: '' })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('update / delete', () => {
  it('met à jour le modèle du pro', async () => {
    mockPrisma.messageTemplate.findFirst.mockResolvedValue({ id: 't1', userId: 'p1' });
    await messagingService.updateTemplate('p1', 't1', { label: 'Nouveau' });
    expect(mockPrisma.messageTemplate.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 't1' }, data: { label: 'Nouveau' } }));
  });
  it('refuse de modifier le modèle d\'autrui (404)', async () => {
    mockPrisma.messageTemplate.findFirst.mockResolvedValue(null);
    await expect(messagingService.updateTemplate('p1', 'tX', { label: 'x' })).rejects.toMatchObject({ statusCode: 404 });
  });
  it('supprime le modèle du pro', async () => {
    mockPrisma.messageTemplate.findFirst.mockResolvedValue({ id: 't1', userId: 'p1' });
    const res = await messagingService.deleteTemplate('p1', 't1');
    expect(mockPrisma.messageTemplate.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    expect(res).toEqual({ removed: true });
  });
});
