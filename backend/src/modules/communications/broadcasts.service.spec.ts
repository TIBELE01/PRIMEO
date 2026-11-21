// Envois groupés admin : ciblage, préférences, compteurs, historique
const prismaMock = {
  user: { count: jest.fn(), findMany: jest.fn() },
  adminBroadcast: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  notification: { create: jest.fn().mockResolvedValue({}) },
  pushToken: { count: jest.fn() },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
};
jest.mock('../../database/prisma.service', () => ({ prisma: prismaMock }));
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
const sendEmail = jest.fn();
jest.mock('../../common/utils/mailer', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
const sendToUser = jest.fn();
jest.mock('../notifications/providers/push.provider', () => ({ pushProvider: { sendToUser: (...a: unknown[]) => sendToUser(...a) } }));

import { audienceWhere, broadcastEmailHtml, broadcastsService } from './broadcasts.service';

describe('envois groupés admin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cible les bons comptes et exclut admins, suspendus et bannis', () => {
    expect(audienceWhere('clients')).toEqual({ status: { in: ['active', 'pending'] }, accountType: 'client' });
    expect(audienceWhere('restaurateur').accountType).toBe('restaurateur');
    expect((audienceWhere('professionals').accountType as { in: string[] }).in).toHaveLength(4);
    expect(audienceWhere('all').accountType).toEqual({ not: 'admin' });
    expect(audienceWhere('selection', ['u1']).id).toEqual({ in: ['u1'] });
  });

  it('échappe le contenu saisi dans l’email', () => {
    const html = broadcastEmailHtml('Promo <b>', 'Ligne 1\nLigne 2\n\n<script>x</script>', 'Awa');
    expect(html).toContain('Promo &lt;b&gt;');
    expect(html).toContain('Ligne 1<br>Ligne 2');
    expect(html).not.toContain('<script>');
    expect(html).toContain('Bonjour Awa');
  });

  it('refuse une sélection vide ou un groupe sans destinataire', async () => {
    await expect(broadcastsService.create({ title: 'Titre', message: 'Message', channels: ['push'], audience: 'selection', recipientIds: [] }, 'a1'))
      .rejects.toMatchObject({ statusCode: 400 });
    prismaMock.user.count.mockResolvedValueOnce(0);
    await expect(broadcastsService.create({ title: 'Titre', message: 'Message', channels: ['email'], audience: 'clients' }, 'a1'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('envoie push + email en respectant les préférences et met à jour les compteurs', async () => {
    const b = { id: 'b1', title: 'Nouveauté', message: 'Bonjour à tous', channels: ['push', 'email'], audience: 'clients', recipientIds: [] };
    prismaMock.user.count.mockResolvedValueOnce(3);
    prismaMock.adminBroadcast.create.mockResolvedValueOnce(b);
    prismaMock.adminBroadcast.findUnique.mockResolvedValue({ ...b, status: 'completed' });
    prismaMock.adminBroadcast.update.mockResolvedValue({});
    prismaMock.user.findMany.mockResolvedValueOnce([
      { id: 'u1', email: 'a@x.ci', firstName: 'Awa', notificationPreferences: null },
      { id: 'u2', email: 'b@x.ci', firstName: 'Ben', notificationPreferences: { email: false, push: true } },
      { id: 'u3', email: 'c@x.ci', firstName: 'Cy', notificationPreferences: { push: false } },
    ]);
    prismaMock.pushToken.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    sendEmail.mockResolvedValue(undefined);

    await broadcastsService.create({ title: 'Nouveauté', message: 'Bonjour à tous', channels: ['push', 'email'], audience: 'clients' }, 'a1');

    expect(prismaMock.notification.create).toHaveBeenCalledTimes(3);
    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const final = prismaMock.adminBroadcast.update.mock.calls.at(-1)[0].data;
    expect(final).toMatchObject({ pushSent: 1, pushSkipped: 2, emailSent: 2, emailSkipped: 1, emailFailed: 0, status: 'completed' });
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });
});
