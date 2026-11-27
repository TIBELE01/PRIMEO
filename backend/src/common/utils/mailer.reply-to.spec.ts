jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn(), isAxiosError: (e: { isAxiosError?: boolean }) => !!e?.isAxiosError } }));
jest.mock('../../config/env.config', () => ({ env: {} }));
jest.mock('../../config/brevo.config', () => ({
  brevoConfig: { apiKey: 'k', baseUrl: 'https://api.brevo.com/v3', senderEmail: 'contact@primeo.ci', senderName: 'Primeo', replyTo: 'contact@primeo.ci' },
}));
jest.mock('./logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../database/prisma.service', () => ({
  prisma: {
    user: { findUnique: jest.fn(async () => null) },
    emailLog: { create: jest.fn(async () => ({ id: 'l1' })), update: jest.fn(async () => ({})) },
  },
}));

import axios from 'axios';
import { sendEmail } from './mailer';

const post = axios.post as jest.Mock;
const body = () => post.mock.calls[0][1] as Record<string, unknown>;

describe('en-tête Reply-To des emails transactionnels', () => {
  beforeEach(() => { post.mockReset(); post.mockResolvedValue({ data: { messageId: '<m@x>' } }); });

  it("expéditeur contact@ : pas de Reply-To (aucune ligne « Répondre à » dans Gmail)", async () => {
    await sendEmail({ to: [{ email: 'client@exemple.ci' }], subject: 'Réservation confirmée', htmlContent: '<p>ok</p>' });
    expect(body().sender).toEqual({ email: 'contact@primeo.ci', name: 'Primeo' });
    expect(body()).not.toHaveProperty('replyTo');
  });

  it('Reply-To conservé quand il diffère de l’expéditeur', async () => {
    await sendEmail({
      to: [{ email: 'equipe@primeo.ci' }], subject: 'Nouveau message', htmlContent: '<p>x</p>',
      replyTo: { email: 'visiteur@exemple.ci', name: 'Visiteur' },
    });
    expect(body().replyTo).toEqual({ email: 'visiteur@exemple.ci', name: 'Visiteur' });
  });

  it('comparaison insensible à la casse', async () => {
    await sendEmail({
      to: [{ email: 'client@exemple.ci' }], subject: 'S', htmlContent: '<p>x</p>',
      from: { email: 'Support@primeo.ci', name: 'Primeo Support' }, replyTo: { email: 'support@primeo.ci' },
    });
    expect(body()).not.toHaveProperty('replyTo');
  });

  it('réponses vers une boîte Primeo : l’email part de cette boîte, sans Reply-To', async () => {
    await sendEmail({
      to: [{ email: 'client@exemple.ci' }], subject: 'Litige', htmlContent: '<p>x</p>',
      replyTo: { email: 'reclamation@primeo.ci', name: 'Primeo Réclamations' },
    });
    expect(body().sender).toEqual({ email: 'reclamation@primeo.ci', name: 'Primeo Réclamations' });
    expect(body()).not.toHaveProperty('replyTo');
  });

  it('la boîte de réponse prime sur un expéditeur explicite différent', async () => {
    await sendEmail({
      to: [{ email: 'client@exemple.ci' }], subject: 'S', htmlContent: '<p>x</p>',
      from: { email: 'support@primeo.ci', name: 'Primeo Support' }, replyTo: { email: 'dpo@primeo.ci' },
    });
    expect((body().sender as { email: string }).email).toBe('dpo@primeo.ci');
    expect(body()).not.toHaveProperty('replyTo');
  });

  it('expéditeur refusé par Brevo : renvoi depuis contact@ avec Reply-To vers la boîte', async () => {
    post.mockReset();
    post.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400 } });
    post.mockResolvedValueOnce({ data: { messageId: '<m@x>' } });
    await sendEmail({
      to: [{ email: 'client@exemple.ci' }], subject: 'S', htmlContent: '<p>x</p>',
      replyTo: { email: 'facturation@primeo.ci', name: 'Primeo Facturation' },
    });
    expect(post).toHaveBeenCalledTimes(2);
    const retry = post.mock.calls[1][1] as Record<string, unknown>;
    expect(retry.sender).toEqual({ email: 'contact@primeo.ci', name: 'Primeo' });
    expect(retry.replyTo).toEqual({ email: 'facturation@primeo.ci', name: 'Primeo Facturation' });
  });
});

describe('expéditeurs Brevo', () => {
  it('liste chaque boîte Primeo une seule fois, avec son libellé', async () => {
    const { senderMailboxes } = await import('./mailer');
    const list = senderMailboxes();
    const emails = list.map((b) => b.email);
    expect(new Set(emails).size).toBe(emails.length);
    expect(emails).toEqual(expect.arrayContaining([
      'contact@primeo.ci', 'reclamation@primeo.ci', 'facturation@primeo.ci', 'partenariat@primeo.ci', 'dpo@primeo.ci',
    ]));
    expect(list.find((b) => b.email === 'facturation@primeo.ci')?.name).toBe('Primeo Facturation');
  });

  it('ne crée que les expéditeurs absents', async () => {
    const { ensureBrevoSenders } = await import('./mailer');
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: { senders: [{ email: 'contact@primeo.ci' }, { email: 'support@primeo.ci' }] } });
    post.mockReset(); post.mockResolvedValue({ data: {} });
    const created = await ensureBrevoSenders();
    expect(created).not.toContain('contact@primeo.ci');
    expect(created).toContain('reclamation@primeo.ci');
    expect(post.mock.calls.every((c) => String(c[0]).endsWith('/senders'))).toBe(true);
  });
});
