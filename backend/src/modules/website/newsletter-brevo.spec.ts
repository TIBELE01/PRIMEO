jest.mock('../../config/brevo.config', () => ({ brevoConfig: { apiKey: 'k', baseUrl: 'https://api.brevo.com/v3' } }));
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
const get = jest.fn(); const post = jest.fn();
jest.mock('axios', () => ({ __esModule: true, default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));
import { addNewsletterContact, removeNewsletterContact } from './newsletter-brevo';

describe('Newsletter → Brevo', () => {
  it('crée la liste si absente, puis ajoute le contact ; retrait sur désinscription', async () => {
    get.mockImplementation(async (url: string) => (url.includes('/contacts/lists') ? { data: { lists: [{ id: 2, name: 'Your first list' }] } } : { data: { folders: [{ id: 1 }] } }));
    post.mockImplementation(async (url: string) => (url.endsWith('/contacts/lists') ? { data: { id: 7 } } : { data: {} }));
    await expect(addNewsletterContact('a@b.ci')).resolves.toBe(true);
    expect(post).toHaveBeenCalledWith('https://api.brevo.com/v3/contacts/lists', { name: 'Newsletter Primeo', folderId: 1 }, expect.anything());
    expect(post).toHaveBeenCalledWith('https://api.brevo.com/v3/contacts', { email: 'a@b.ci', listIds: [7], updateEnabled: true }, expect.anything());
    await expect(removeNewsletterContact('a@b.ci')).resolves.toBe(true);
    expect(post).toHaveBeenCalledWith('https://api.brevo.com/v3/contacts/lists/7/contacts/remove', { emails: ['a@b.ci'] }, expect.anything());
  });
  it('erreur Brevo : n\'interrompt pas l\'inscription', async () => {
    post.mockRejectedValueOnce(new Error('panne'));
    await expect(addNewsletterContact('c@d.ci')).resolves.toBe(false);
  });
});
