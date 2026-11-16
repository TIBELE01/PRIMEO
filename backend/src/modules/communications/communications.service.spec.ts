// Orchestration des campagnes : garde-fous et statuts (Norasend et base simulés).

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../config/norasend.config', () => ({
  norasendConfig: { baseUrl: 'http://x', apiKey: 'k', authScheme: 'bearer', maxBroadcastBatch: 100, whatsappSessionId: undefined, telegramBotId: undefined },
}));

const mockConfigured = jest.fn(() => true);
jest.mock('./norasend.client', () => ({ isNorasendConfigured: () => mockConfigured() }));

const mockWaSend = jest.fn();
const mockWaBroadcast = jest.fn();
const mockTgSend = jest.fn();
const mockTgBroadcast = jest.fn();
jest.mock('./norasend-whatsapp.service', () => ({
  sendWhatsAppMessage: (...a: unknown[]) => mockWaSend(...a),
  broadcastWhatsApp: (...a: unknown[]) => mockWaBroadcast(...a),
}));
jest.mock('./norasend-telegram.service', () => ({
  sendTelegramMessage: (...a: unknown[]) => mockTgSend(...a),
  broadcastTelegram: (...a: unknown[]) => mockTgBroadcast(...a),
}));

// ── Base en mémoire (juste ce que le service utilise) ─────────────────────────
type Rec = { id: string; campaignId: string; recipient: string; status: string; error: string | null; providerMessageId: string | null; variables: unknown };
let campaigns: Record<string, any>;
let recipients: Rec[];
let optOuts: Array<{ channel: string; recipient: string }>;
let seq = 0;

const mockPrisma = {
  messagingOptOut: {
    findMany: jest.fn(async ({ where }: any) =>
      optOuts.filter((o) => o.channel === where.channel && where.recipient.in.includes(o.recipient))),
  },
  messagingCampaign: {
    create: jest.fn(async ({ data }: any) => {
      const id = `c${++seq}`;
      const { recipients: rs, ...rest } = data;
      campaigns[id] = { id, status: 'processing', sentCount: 0, failedCount: 0, skippedCount: 0, completedAt: null, error: null, ...rest };
      for (const r of rs.create) recipients.push({ id: `r${++seq}`, campaignId: id, providerMessageId: null, variables: null, ...r });
      return campaigns[id];
    }),
    findUnique: jest.fn(async ({ where }: any) =>
      campaigns[where.id] ? { ...campaigns[where.id], recipients: recipients.filter((r) => r.campaignId === where.id) } : null),
    update: jest.fn(async ({ where, data }: any) => { Object.assign(campaigns[where.id], data); return campaigns[where.id]; }),
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
  },
  messagingCampaignRecipient: {
    updateMany: jest.fn(async ({ where, data }: any) => {
      let n = 0;
      for (const r of recipients) {
        if (r.campaignId !== where.campaignId) continue;
        if (where.recipient?.in && !where.recipient.in.includes(r.recipient)) continue;
        if (where.status && r.status !== where.status) continue;
        Object.assign(r, data); n++;
      }
      return { count: n };
    }),
    groupBy: jest.fn(async ({ where }: any) => {
      const counts = new Map<string, number>();
      for (const r of recipients.filter((x) => x.campaignId === where.campaignId)) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
      return [...counts].map(([status, n]) => ({ status, _count: { _all: n } }));
    }),
  },
  auditLog: { create: jest.fn(async () => ({})) },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { communicationsService, normalizePhone, normalizeChatId, placeholdersOf, renderTemplate, MAX_RECIPIENTS_PER_CAMPAIGN } from './communications.service';

const ok = (id = 'm') => ({ ok: true, messageId: id, results: null, error: null, raw: {} });
const base = { consentConfirmed: true, delayMs: 0 } as const;

beforeEach(() => {
  jest.clearAllMocks();
  campaigns = {}; recipients = []; optOuts = []; seq = 0;
  mockConfigured.mockReturnValue(true);
  mockWaSend.mockResolvedValue(ok('wa'));
  mockWaBroadcast.mockResolvedValue(ok('wab'));
  mockTgSend.mockResolvedValue(ok('tg'));
  mockTgBroadcast.mockResolvedValue(ok('tgb'));
});

describe('normalisation', () => {
  it('numéros : international sans +, numéro local ivoirien, rejets', () => {
    expect(normalizePhone('+225 07 00 00 00 00')).toBe('2250700000000');
    expect(normalizePhone('0700000000')).toBe('2250700000000');
    expect(normalizePhone('2250700000000')).toBe('2250700000000');
    expect(normalizePhone('+33 6 12 34 56 78')).toBe('33612345678');
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('0123')).toBeNull();
  });
  it('chatId Telegram : numérique ou @canal', () => {
    expect(normalizeChatId('123456789')).toBe('123456789');
    expect(normalizeChatId('-1001234567890')).toBe('-1001234567890');
    expect(normalizeChatId('@ma_chaine')).toBe('@ma_chaine');
    expect(normalizeChatId('ma_chaine')).toBeNull();
    expect(normalizeChatId('@ab')).toBeNull();
  });
  it('variables {{nom}}', () => {
    expect(placeholdersOf('Salut {{prenom}}, {{ ville }} {{prenom}}')).toEqual(['prenom', 'ville']);
    expect(renderTemplate('Salut {{prenom}} !', { prenom: 'Awa' })).toBe('Salut Awa !');
  });
});

describe('garde-fous', () => {
  const wa = (over: object = {}) => ({ channel: 'whatsapp' as const, mode: 'broadcast' as const, text: 'Bonjour', recipients: [{ to: '2250700000001' }], ...base, ...over });

  it('refuse sans attestation de consentement', async () => {
    await expect(communicationsService.createCampaign(wa({ consentConfirmed: false }), 'adm')).rejects.toMatchObject({ statusCode: 400 });
    expect(mockWaBroadcast).not.toHaveBeenCalled();
    expect(mockPrisma.messagingCampaign.create).not.toHaveBeenCalled();
  });
  it('503 si Norasend n\'est pas configuré', async () => {
    mockConfigured.mockReturnValue(false);
    await expect(communicationsService.createCampaign(wa(), 'adm')).rejects.toMatchObject({ statusCode: 503 });
  });
  it('refuse message vide, trop long, média non https, trop de destinataires, delayMs hors plage', async () => {
    for (const bad of [{ text: '  ' }, { text: 'x'.repeat(4001) }, { mediaUrl: 'http://x.com/a.png' }, { delayMs: -1 }, { delayMs: 70000 }]) {
      await expect(communicationsService.createCampaign(wa(bad), 'adm')).rejects.toMatchObject({ statusCode: 400 });
    }
    const many = Array.from({ length: MAX_RECIPIENTS_PER_CAMPAIGN + 1 }, (_, i) => ({ to: `22507${String(i).padStart(8, '0')}` }));
    await expect(communicationsService.createCampaign(wa({ recipients: many }), 'adm')).rejects.toMatchObject({ statusCode: 400 });
  });
  it('refuse les destinataires invalides en les citant, avant tout envoi', async () => {
    const err = await communicationsService.createCampaign(wa({ recipients: [{ to: '2250700000001' }, { to: 'pas-un-numero' }] }), 'adm').catch((e) => e);
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('pas-un-numero');
    expect(mockWaBroadcast).not.toHaveBeenCalled();
  });
  it('refuse l\'envoi si une variable n\'a pas de valeur pour un destinataire (jamais de « {{prenom}} » brut)', async () => {
    const err = await communicationsService.createCampaign(
      wa({ text: 'Salut {{prenom}}', recipients: [{ to: '2250700000001', variables: { prenom: 'Awa' } }, { to: '2250700000002' }] }), 'adm').catch((e) => e);
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('{{prenom}}');
    expect(mockWaBroadcast).not.toHaveBeenCalled();
    expect(mockWaSend).not.toHaveBeenCalled();
  });
  it('parseMode réservé à Telegram', async () => {
    await expect(communicationsService.createCampaign(wa({ parseMode: 'HTML' }), 'adm')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('envois', () => {
  it('WhatsApp diffusion à 3 destinataires : un seul appel /broadcast, campagne « completed »', async () => {
    const c = await communicationsService.createCampaign({
      channel: 'whatsapp', mode: 'broadcast', text: 'Promo -20 %', ...base, delayMs: 3000,
      recipients: [{ to: '2250700000001' }, { to: '0700000002' }, { to: '+225 07 00 00 00 03' }].map((r, i) => i === 2 ? { to: '2250700000003' } : r),
    }, 'adm');
    expect(mockWaBroadcast).toHaveBeenCalledTimes(1);
    expect(mockWaBroadcast).toHaveBeenCalledWith(['2250700000001', '2250700000002', '2250700000003'], 'Promo -20 %', undefined, 3000);
    expect(c.status).toBe('completed');
    expect(c).toMatchObject({ totalRecipients: 3, sentCount: 3, failedCount: 0 });
    expect(c.recipients.every((r: Rec) => r.status === 'sent' && r.providerMessageId === 'wab')).toBe(true);
  });

  it('Telegram diffusion à 3 chats', async () => {
    const c = await communicationsService.createCampaign({
      channel: 'telegram', mode: 'broadcast', text: 'Nouveautés', ...base,
      recipients: [{ to: '@canal_un' }, { to: '123456' }, { to: '-1001234567' }],
    }, 'adm');
    expect(mockTgBroadcast).toHaveBeenCalledWith(['@canal_un', '123456', '-1001234567'], 'Nouveautés', 0);
    expect(c).toMatchObject({ status: 'completed', sentCount: 3 });
  });

  it('variables : texte personnalisé par destinataire (chacun reçoit son prénom)', async () => {
    const c = await communicationsService.createCampaign({
      channel: 'whatsapp', mode: 'broadcast', text: 'Bonjour {{prenom}} !', ...base,
      recipients: [{ to: '2250700000001', variables: { prenom: 'Awa' } }, { to: '2250700000002', variables: { prenom: 'Koffi' } }],
    }, 'adm');
    const sent = mockWaSend.mock.calls.map((c) => [c[0], c[1]]);
    expect(sent).toEqual([['2250700000001', 'Bonjour Awa !'], ['2250700000002', 'Bonjour Koffi !']]);
    expect(c.status).toBe('completed');
  });

  it('valeur par défaut d\'une variable pour qui n\'a pas la sienne ; destinataires au même texte regroupés', async () => {
    await communicationsService.createCampaign({
      channel: 'whatsapp', mode: 'broadcast', text: 'Bonjour {{prenom}}', variables: { prenom: 'cher client' }, ...base,
      recipients: [{ to: '2250700000001' }, { to: '2250700000002' }],
    }, 'adm');
    expect(mockWaBroadcast).toHaveBeenCalledTimes(1);
    expect(mockWaBroadcast.mock.calls[0][1]).toBe('Bonjour cher client');
  });

  it('envoi direct à plusieurs destinataires : un /send chacun', async () => {
    const c = await communicationsService.createCampaign({
      channel: 'whatsapp', mode: 'direct', text: 'Info', ...base,
      recipients: [{ to: '2250700000001' }, { to: '2250700000002' }],
    }, 'adm');
    expect(mockWaSend).toHaveBeenCalledTimes(2);
    expect(mockWaBroadcast).not.toHaveBeenCalled();
    expect(c.status).toBe('completed');
  });

  it('média WhatsApp et parseMode Telegram transmis à l\'envoi direct', async () => {
    await communicationsService.createCampaign({ channel: 'whatsapp', mode: 'direct', text: 'Voir', mediaUrl: 'https://cdn.example.com/a.png', ...base, recipients: [{ to: '2250700000001' }] }, 'adm');
    expect(mockWaSend).toHaveBeenCalledWith('2250700000001', 'Voir', 'https://cdn.example.com/a.png');
    await communicationsService.createCampaign({ channel: 'telegram', mode: 'direct', text: '<b>Hi</b>', parseMode: 'HTML', ...base, recipients: [{ to: '123456' }] }, 'adm');
    expect(mockTgSend).toHaveBeenCalledWith('123456', '<b>Hi</b>', undefined, undefined, 'HTML');
  });

  it('dédoublonne les destinataires (un numéro écrit de deux façons = un envoi)', async () => {
    const c = await communicationsService.createCampaign({
      channel: 'whatsapp', mode: 'broadcast', text: 'x', ...base,
      recipients: [{ to: '0700000001' }, { to: '2250700000001' }, { to: '+225 0700000001' }],
    }, 'adm');
    expect(c.totalRecipients).toBe(1);
  });
});

describe('statuts et erreurs', () => {
  it('échec complet → « failed », avec le motif par destinataire', async () => {
    mockWaBroadcast.mockResolvedValue({ ok: false, messageId: null, results: null, error: 'session déconnectée', raw: {} });
    const c = await communicationsService.createCampaign({ channel: 'whatsapp', mode: 'broadcast', text: 'x', ...base, recipients: [{ to: '2250700000001' }, { to: '2250700000002' }] }, 'adm');
    expect(c).toMatchObject({ status: 'failed', sentCount: 0, failedCount: 2 });
    expect(c.recipients[0].error).toBe('session déconnectée');
  });
  it('Norasend en erreur (exception) → « failed » sans faire échouer la requête', async () => {
    // Un seul destinataire : la diffusion passe par /send
    mockWaSend.mockRejectedValue(Object.assign(new Error('Échec de l\'appel Norasend (HTTP 500)'), { statusCode: 502 }));
    const c = await communicationsService.createCampaign({ channel: 'whatsapp', mode: 'broadcast', text: 'x', ...base, recipients: [{ to: '2250700000001' }] }, 'adm');
    expect(c.status).toBe('failed');
    expect(c.recipients[0].error).toContain('HTTP 500');
  });
  it('résultat détaillé par destinataire → « partial »', async () => {
    mockWaBroadcast.mockResolvedValue({ ok: true, messageId: null, error: null, raw: {}, results: [
      { to: '2250700000001', ok: true, messageId: 'a', error: null },
      { to: '2250700000002', ok: false, messageId: null, error: 'numéro sans WhatsApp' },
    ] });
    const c = await communicationsService.createCampaign({ channel: 'whatsapp', mode: 'broadcast', text: 'x', ...base, recipients: [{ to: '2250700000001' }, { to: '2250700000002' }] }, 'adm');
    expect(c).toMatchObject({ status: 'partial', sentCount: 1, failedCount: 1 });
    expect(c.recipients.find((r: Rec) => r.recipient === '2250700000002')?.error).toBe('numéro sans WhatsApp');
  });
});

describe('désinscriptions', () => {
  it('un désinscrit n\'est jamais contacté ; les autres reçoivent le message', async () => {
    optOuts = [{ channel: 'whatsapp', recipient: '2250700000002' }];
    const c = await communicationsService.createCampaign({ channel: 'whatsapp', mode: 'broadcast', text: 'Promo', ...base, recipients: [{ to: '2250700000001' }, { to: '2250700000002' }, { to: '2250700000003' }] }, 'adm');
    expect(mockWaBroadcast.mock.calls[0][0]).toEqual(['2250700000001', '2250700000003']);
    expect(c).toMatchObject({ status: 'completed', totalRecipients: 3, sentCount: 2, skippedCount: 1 });
    expect(c.recipients.find((r: Rec) => r.recipient === '2250700000002')).toMatchObject({ status: 'skipped', error: 'Désinscrit' });
  });
  it('tous désinscrits → refus, rien n\'est envoyé ni enregistré', async () => {
    optOuts = [{ channel: 'whatsapp', recipient: '2250700000001' }];
    await expect(communicationsService.createCampaign({ channel: 'whatsapp', mode: 'broadcast', text: 'x', ...base, recipients: [{ to: '2250700000001' }] }, 'adm')).rejects.toMatchObject({ statusCode: 400 });
    expect(mockWaBroadcast).not.toHaveBeenCalled();
    expect(mockPrisma.messagingCampaign.create).not.toHaveBeenCalled();
  });
  it('la désinscription est propre à chaque canal', async () => {
    optOuts = [{ channel: 'whatsapp', recipient: '123456' }];
    const c = await communicationsService.createCampaign({ channel: 'telegram', mode: 'broadcast', text: 'x', ...base, recipients: [{ to: '123456' }] }, 'adm');
    expect(c.sentCount).toBe(1);
  });
});

describe('journal et état', () => {
  it('trace chaque campagne dans le journal d\'audit', async () => {
    await communicationsService.createCampaign({ channel: 'telegram', mode: 'direct', text: 'x', ...base, recipients: [{ to: '123456' }] }, 'adm-9');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'adm-9', action: 'admin.messaging.campaign' }) });
  });
  it('getStatus ne renvoie aucun secret', () => {
    const s = communicationsService.getStatus();
    expect(JSON.stringify(s)).not.toContain('"k"');
    expect(s).toMatchObject({ configured: true, whatsapp: { ready: true }, telegram: { ready: true } });
  });
});
