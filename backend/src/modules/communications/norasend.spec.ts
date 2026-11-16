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
  whatsappSessionId: undefined,
  telegramBotId: undefined,
  timeoutMs: 5000,
  maxBroadcastBatch: 100,
};
jest.mock('../../config/norasend.config', () => ({ norasendConfig: cfg }));

import { sendWhatsAppMessage, broadcastWhatsApp } from './norasend-whatsapp.service';
import { sendTelegramMessage, broadcastTelegram } from './norasend-telegram.service';
import { _resetNorasendClient, parseNorasendResponse } from './norasend.client';

interface Captured { method?: string; url?: string; headers: http.IncomingHttpHeaders; body: any }
let server: http.Server;
let captured: Captured[] = [];
let reply: { status: number; body: unknown } = { status: 200, body: { success: true, messageId: 'm-1' } };

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      captured.push({ method: req.method, url: req.url, headers: req.headers, body: raw ? JSON.parse(raw) : null });
      res.writeHead(reply.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

beforeEach(() => {
  captured = [];
  reply = { status: 200, body: { success: true, messageId: 'm-1' } };
  cfg.apiKey = 'test-key-123';
  cfg.authScheme = 'bearer';
  cfg.whatsappSessionId = undefined;
  cfg.telegramBotId = undefined;
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

  it('ajoute l\'identifiant de session quand WHATSAPP_SESSION_ID est défini', async () => {
    cfg.whatsappSessionId = 'sess-42';
    await sendWhatsAppMessage('2250700000000', 'Bonjour');
    expect(captured[0].body.sessionId).toBe('sess-42');
  });

  it('utilise X-API-Key quand le schéma est x-api-key', async () => {
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
  it('POST /api/v1/whatsapp/broadcast avec recipients, text, variables et delayMs', async () => {
    await broadcastWhatsApp(['2250700000001', '2250700000002'], 'Salut {{prenom}}', { prenom: 'Awa' }, 3000);
    expect(captured[0].url).toBe('/api/v1/whatsapp/broadcast');
    expect(captured[0].body).toEqual({
      recipients: ['2250700000001', '2250700000002'],
      text: 'Salut {{prenom}}',
      variables: { prenom: 'Awa' },
      delayMs: 3000,
    });
  });

  it('n\'envoie ni variables ni delayMs quand ils sont absents', async () => {
    await broadcastWhatsApp(['2250700000001'], 'Salut');
    expect(captured[0].body).toEqual({ recipients: ['2250700000001'], text: 'Salut' });
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

  it('ajoute botId quand TELEGRAM_BOT_ID est défini', async () => {
    cfg.telegramBotId = 'bot-7';
    await sendTelegramMessage('@ma_chaine', 'Bonjour');
    expect(captured[0].body.botId).toBe('bot-7');
  });

  it('POST /api/v1/telegram/broadcast, 100 chats maximum', async () => {
    await broadcastTelegram(['@canal_un', '123456'], 'Salut', 1000);
    expect(captured[0].url).toBe('/api/v1/telegram/broadcast');
    expect(captured[0].body).toEqual({ chatIds: ['@canal_un', '123456'], text: 'Salut', delayMs: 1000 });
    await expect(broadcastTelegram(Array.from({ length: 101 }, (_, i) => String(100000 + i)), 'x')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('gestion des erreurs', () => {
  it('503 sans NORASEND_API_KEY, sans appel réseau', async () => {
    cfg.apiKey = undefined;
    await expect(sendWhatsAppMessage('2250700000000', 'x')).rejects.toMatchObject({ statusCode: 503 });
    expect(captured).toHaveLength(0);
  });

  it('401 de Norasend → erreur explicite, sans divulguer la clé', async () => {
    reply = { status: 401, body: { error: 'invalid key' } };
    const err = await sendWhatsAppMessage('2250700000000', 'x').catch((e) => e);
    expect(err.statusCode).toBe(502);
    expect(err.message).toContain('NORASEND_API_KEY');
    expect(err.message).not.toContain('test-key-123');
  });

  it('429 → 429 ; 500 → 502 avec le détail renvoyé', async () => {
    reply = { status: 429, body: {} };
    await expect(sendWhatsAppMessage('2250700000000', 'x')).rejects.toMatchObject({ statusCode: 429 });
    reply = { status: 500, body: { error: 'session déconnectée' } };
    const err = await sendWhatsAppMessage('2250700000000', 'x').catch((e) => e);
    expect(err.statusCode).toBe(502);
    expect(err.message).toContain('session déconnectée');
  });

  it('une réponse 200 qui signale un échec est lue comme un échec', async () => {
    reply = { status: 200, body: { success: false, error: 'numéro invalide' } };
    expect(await sendWhatsAppMessage('2250700000000', 'x')).toMatchObject({ ok: false, error: 'numéro invalide' });
  });
});

describe('parseNorasendResponse', () => {
  it('lit le détail par destinataire d\'une diffusion', () => {
    const r = parseNorasendResponse({ results: [{ to: '1', success: true, id: 'a' }, { to: '2', success: false, error: 'bloqué' }] });
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
