jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));
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
});
