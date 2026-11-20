// Support : correspondance des catégories app ↔ API, réponses sur /comments, données normalisées.
jest.mock('../src/services/api/client', () => ({ apiClient: { post: jest.fn(async () => ({ data: {} })), get: jest.fn() } }));
import { apiClient } from '../src/services/api/client';
import { supportApi } from '../src/services/api/endpoints/support';

const api = apiClient as unknown as { post: jest.Mock; get: jest.Mock };

describe('supportApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('envoie la catégorie au format de l\'API', async () => {
    await supportApi.createTicket({ subject: 'Problème de paiement', description: 'x'.repeat(30), category: 'reclamation' });
    expect(api.post).toHaveBeenCalledWith('/support', expect.objectContaining({ category: 'complaint' }));
    await supportApi.createTicket({ subject: 'Bug affichage', description: 'x'.repeat(30), category: 'technique' });
    expect(api.post).toHaveBeenLastCalledWith('/support', expect.objectContaining({ category: 'technical' }));
  });

  it('répond au ticket via /comments', async () => {
    await supportApi.addMessage('t1', 'Merci');
    expect(api.post).toHaveBeenCalledWith('/support/t1/comments', { content: 'Merci' });
  });

  it('normalise la liste et le détail (catégorie, priorité, messages de l\'équipe)', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [{ id: 't1', userId: 'u1', subject: 's', category: 'dispute', status: 'open', priority: 'high', createdAt: 'd', updatedAt: 'd' }] } });
    const list = await supportApi.getMyTickets();
    expect(list[0]).toMatchObject({ id: 't1', category: 'litige', priority: 'haute' });

    api.get.mockResolvedValueOnce({ data: { id: 't1', userId: 'u1', subject: 's', description: 'desc', category: 'technical', status: 'open', priority: 'low', createdAt: 'd', updatedAt: 'd',
      comments: [
        { id: 'c1', content: 'Bonjour', authorId: 'u1', createdAt: 'd' },
        { id: 'c2', content: 'Réponse support', authorId: 'admin', createdAt: 'd', author: { id: 'admin', firstName: 'Équipe', lastName: 'Primeo' } },
      ] } });
    const t = await supportApi.getTicket('t1');
    expect(t.category).toBe('technique');
    expect(t.messages?.map((m) => m.isStaff)).toEqual([false, true]);
    expect(t.messages?.[1].authorName).toBe('Équipe Primeo');
  });
});
