// Clients Norasend WhatsApp / Telegram — requêtes HTTP RÉELLES contre un faux serveur
// Norasend local : on vérifie URL, méthode, en-têtes, corps et lecture des réponses.

import http from 'http';
import type { AddressInfo } from 'net';

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Configuration mutable lue par le client à chaque appel
const cfg: Record<string, unknown> = {
  baseUrl: '',
  apiKey: 'test-key-123',
  authScheme: 'bearer',
  timeoutMs: 5000,
  retryBaseMs: 5,
  maxRetries: 2,
  maxBroadcastBatch: 100,
  whatsappDelayMs: { min: 3000, max: 30000, default: 4000 },
  telegramDelayMs: { min: 500, max: 10000, default: 1000 },
};
jest.mock('../../config/norasend.config', () => ({ norasendConfig: cfg }));

import { sendWhatsAppMessage, broadcastWhatsApp, getWhatsAppQuota } from './norasend-whatsapp.service';
import { sendTelegramMessage, broadcastTelegram, getTelegramQuota } from './norasend-telegram.service';
import { _resetNorasendClient, parseNorasendResponse } from './norasend.client';

interface Captured { method?: string; url?: string; headers: http.IncomingHttpHeaders; body: any }
let server: http.Server;
let captured: Captured[] = [];
const okBody = (data: unknown) => ({ success: true, data, error: null, timestamp: '2026-01-01T00:00:00Z' });
const errBody = (code: number, message: string, field?: string) => ({ success: false, data: null, error: { code, type: 'x', message, field: field ?? null }, timestamp: '2026-01-01T00:00:00Z' });
let reply: { status: number; body: unknown } = { status: 200, body: okBody({ messageId: 'm-1' }) };
let replies: Array<{ status: number; body: unknown }> = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      captured.push({ method: req.method, url: req.url, headers: req.headers, body: raw ? JSON.parse(raw) : null });
      const r = replies.shift() ?? reply;
      res.writeHead(r.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(r.body));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

beforeEach(() => {
  captured = [];
  reply = { status: 200, body: okBody({ messageId: 'm-1' }) };
  replies = [];
  cfg.apiKey = 'test-key-123';
  cfg.authScheme = 'bearer';
  _resetNorasendClient();
});

describe('WhatsApp — sendWhatsAppMessage', () => {
  it('POST /api/v1/whatsapp/send avec un texte', async () => {
    const res = await sendWhatsAppMessage('2250700000000', 'Bonjour');
    expect(res).toMatchObject({ ok: true, messageId: 'm-1' });
    expect(captured).toHaveLength(1);
    expect(captured[0].method).toBe('POST');
    expect(captured[0].url).toBe('/api/v1/whatsapp/send');
    expect(captured[0].body).toEqual({ to: '2250700000000', type: 'text', text: 'Bonjour' });
    expect(captured[0].headers.authorization).toBe('Bearer test-key-123');
  });

  it('envoie une image avec légende (type image + mediaUrl + caption)', async () => {
    await sendWhatsAppMessage('2250700000000', 'Promo', 'https://cdn.example.com/promo.png', '-20 % ce week-end');
    expect(captured[0].body).toEqual({ to: '2250700000000', type: 'image', mediaUrl: 'https://cdn.example.com/promo.png', caption: '-20 % ce week-end' });
  });

  it('envoie un fichier (type file) quand ce n\'est pas une image, légende = texte par défaut', async () => {
    await sendWhatsAppMessage('2250700000000', 'Notre catalogue', 'https://cdn.example.com/catalogue.pdf');
    expect(captured[0].body).toMatchObject({ type: 'file', mediaUrl: 'https://cdn.example.com/catalogue.pdf', caption: 'Notre catalogue' });
  });

  it('utilise X-Api-Key quand le schéma est x-api-key', async () => {
    cfg.authScheme = 'x-api-key';
    await sendWhatsAppMessage('2250700000000', 'Bonjour');
    expect(captured[0].headers['x-api-key']).toBe('test-key-123');
    expect(captured[0].headers.authorization).toBeUndefined();
  });

  it('refuse sans destinataire ni contenu (400) sans appeler Norasend', async () => {
    await expect(sendWhatsAppMessage('', 'x')).rejects.toMatchObject({ statusCode: 400 });
    await expect(sendWhatsAppMessage('2250700000000', '')).rejects.toMatchObject({ statusCode: 400 });
    expect(captured).toHaveLength(0);
  });
});

describe('WhatsApp — broadcastWhatsApp', () => {
  it('POST /api/v1/whatsapp/broadcast avec variables PAR NUMÉRO et delayMs', async () => {
    reply = { status: 202, body: okBody({ accepted: 2, skippedQuota: 0, skippedInvalid: 0 }) };
    const r = await broadcastWhatsApp(['2250700000001', '2250700000002'], 'Salut {{prenom}}', { '2250700000001': { prenom: 'Awa' }, '2250700000002': { prenom: 'Koffi' } }, 3000);
    expect(r).toMatchObject({ ok: true, accepted: 2, skipped: 0 });
    expect(captured[0].url).toBe('/api/v1/whatsapp/broadcast');
    expect(captured[0].body).toEqual({
      recipients: ['2250700000001', '2250700000002'],
      text: 'Salut {{prenom}}',
      variables: { '2250700000001': { prenom: 'Awa' }, '2250700000002': { prenom: 'Koffi' } },
      delayMs: 3000,
    });
  });

  it('n\'envoie ni variables ni delayMs quand ils sont absents', async () => {
    await broadcastWhatsApp(['2250700000001'], 'Salut');
    expect(captured[0].body).toEqual({ recipients: ['2250700000001'], text: 'Salut' });
  });

  it('refuse un délai hors 3000–30000 ms sans appeler Norasend', async () => {
    for (const d of [0, 2999, 30001, 1.5]) await expect(broadcastWhatsApp(['2250700000001'], 'x', undefined, d)).rejects.toMatchObject({ statusCode: 400 });
    expect(captured).toHaveLength(0);
  });

  it('lit accepted / skippedQuota / skippedInvalid', async () => {
    reply = { status: 202, body: okBody({ accepted: 8, skippedQuota: 1, skippedInvalid: 1 }) };
    expect(await broadcastWhatsApp(['2250700000001'], 'x')).toMatchObject({ ok: true, accepted: 8, skipped: 2 });
  });

  it('quota : GET /api/v1/whatsapp/quota', async () => {
    reply = { status: 200, body: okBody({ plan: 'free', remaining: 40 }) };
    expect(await getWhatsAppQuota()).toEqual({ plan: 'free', remaining: 40 });
    expect(captured[0]).toMatchObject({ method: 'GET', url: '/api/v1/whatsapp/quota' });
  });

  it('refuse plus de 100 destinataires par appel', async () => {
    const many = Array.from({ length: 101 }, (_, i) => `22507${String(i).padStart(8, '0')}`);
    await expect(broadcastWhatsApp(many, 'x')).rejects.toMatchObject({ statusCode: 400 });
    expect(captured).toHaveLength(0);
    await expect(broadcastWhatsApp(many.slice(0, 100), 'x')).resolves.toMatchObject({ ok: true });
  });
});

describe('Telegram', () => {
  it('POST /api/v1/telegram/send avec chatId et texte', async () => {
    await sendTelegramMessage('@ma_chaine', 'Bonjour');
    expect(captured[0].url).toBe('/api/v1/telegram/send');
    expect(captured[0].body).toEqual({ chatId: '@ma_chaine', type: 'text', text: 'Bonjour' });
    expect(captured[0].headers.authorization).toBe('Bearer test-key-123');
  });

  it('transmet parseMode, et envoie un média avec légende', async () => {
    await sendTelegramMessage('123456789', '<b>Promo</b>', undefined, undefined, 'HTML');
    expect(captured[0].body).toEqual({ chatId: '123456789', type: 'text', text: '<b>Promo</b>', parseMode: 'HTML' });
    await sendTelegramMessage('123456789', 'Photo', 'https://cdn.example.com/a.jpg', 'Légende');
    expect(captured[1].body).toMatchObject({ type: 'photo', mediaUrl: 'https://cdn.example.com/a.jpg', caption: 'Légende' });
  });

  it('POST /api/v1/telegram/broadcast, 100 chats maximum', async () => {
    await broadcastTelegram(['@canal_un', '123456'], 'Salut', 1000);
    expect(captured[0].url).toBe('/api/v1/telegram/broadcast');
    expect(captured[0].body).toEqual({ chatIds: ['@canal_un', '123456'], text: 'Salut', delayMs: 1000 });
    await expect(broadcastTelegram(['123456'], 'x', 100)).rejects.toMatchObject({ statusCode: 400 }); // < 500 ms
    reply = { status: 200, body: okBody({ messages: [{ chatId: '123456', messageId: 'a', status: 'SENT' }, { chatId: '@canal_un', status: 'FAILED', failReason: 'bot bloqué' }] }) };
    const r = await broadcastTelegram(['123456', '@canal_un'], 'x');
    expect(r.results).toEqual([{ to: '123456', ok: true, messageId: 'a', error: null }, { to: '@canal_un', ok: false, messageId: null, error: 'bot bloqué' }]);
    reply = { status: 200, body: okBody({ botUsername: 'primeo_bot' }) };
    expect(await getTelegramQuota()).toEqual({ botUsername: 'primeo_bot' });
    await expect(broadcastTelegram(Array.from({ length: 101 }, (_, i) => String(100000 + i)), 'x')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('gestion des erreurs', () => {
  it('503 sans NORASEND_API_KEY, sans appel réseau', async () => {
    cfg.apiKey = undefined;
    await expect(sendWhatsAppMessage('2250700000000', 'x')).rejects.toMatchObject({ statusCode: 503 });
    expect(captured).toHaveLength(0);
  });

  it('401 → clé refusée, sans divulguer la clé', async () => {
    reply = { status: 401, body: errBody(1001, 'invalid key') };
    const err = await sendWhatsAppMessage('2250700000000', 'x').catch((e) => e);
    expect(err.statusCode).toBe(502);
    expect(err.message).toContain('NORASEND_API_KEY');
    expect(err.message).not.toContain('test-key-123');
  });

  it('402 → abonnement ; 409 → canal non connecté ; 422 → message refusé avec le champ', async () => {
    reply = { status: 402, body: errBody(3001, 'quota épuisé') };
    expect(await sendWhatsAppMessage('2250700000000', 'x').catch((e) => e)).toMatchObject({ statusCode: 402 });
    reply = { status: 409, body: errBody(4001, 'not connected') };
    const c = await sendWhatsAppMessage('2250700000000', 'x').catch((e) => e);
    expect(c.statusCode).toBe(409);
    expect(c.message).toContain('Canal non connecté');
    reply = { status: 422, body: errBody(2002, 'champ inconnu', 'sessionId') };
    const u = await sendWhatsAppMessage('2250700000000', 'x').catch((e) => e);
    expect(u.statusCode).toBe(422);
    expect(u.message).toContain('sessionId');
  });

  it('429 : nouvel essai automatique puis succès ; 429 persistant → 429', async () => {
    replies = [{ status: 429, body: errBody(5001, 'slow down') }];
    expect(await sendWhatsAppMessage('2250700000000', 'x')).toMatchObject({ ok: true });
    expect(captured).toHaveLength(2);
    captured = [];
    reply = { status: 429, body: errBody(5001, 'slow down') };
    await expect(sendWhatsAppMessage('2250700000000', 'x')).rejects.toMatchObject({ statusCode: 429 });
    expect(captured).toHaveLength(3); // 1 + 2 essais
  });

  it('500 → 502 SANS nouvel essai (risque de doublon), avec avertissement', async () => {
    reply = { status: 500, body: errBody(9000, 'boom') };
    const err = await sendWhatsAppMessage('2250700000000', 'x').catch((e) => e);
    expect(err.statusCode).toBe(502);
    expect(err.message).toContain('boom');
    expect(err.message).toContain('historique');
    expect(captured).toHaveLength(1);
  });

  it('une réponse 200 qui signale un échec est lue comme un échec', async () => {
    reply = { status: 200, body: errBody(2001, 'numéro invalide') };
    expect(await sendWhatsAppMessage('2250700000000', 'x')).toMatchObject({ ok: false, error: 'numéro invalide' });
  });
});

describe('parseNorasendResponse', () => {
  it('lit l\'enveloppe : messageId, accepted, messages détaillés', () => {
    const r = parseNorasendResponse(okBody({ messages: [{ chatId: '1', messageId: 'a', status: 'SENT' }, { chatId: '2', status: 'FAILED', failReason: 'bloqué' }] }));
    expect(r.ok).toBe(true);
    expect(r.results).toEqual([
      { to: '1', ok: true, messageId: 'a', error: null },
      { to: '2', ok: false, messageId: null, error: 'bloqué' },
    ]);
  });
  it('tolère une réponse vide ou inattendue', () => {
    expect(parseNorasendResponse(null)).toMatchObject({ ok: true, messageId: null, results: null });
    expect(parseNorasendResponse('ok')).toMatchObject({ ok: true });
  });
});
