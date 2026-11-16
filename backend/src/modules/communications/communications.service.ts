// Campagnes WhatsApp / Telegram : validation, garde-fous (consentement, désinscriptions,
// plafonds), envoi via Norasend et historique en base.
//
// Deux modes :
//   - « direct »    : un message par destinataire (/send), envoyés l'un après l'autre
//                     avec une pause entre deux envois ;
//   - « broadcast » : diffusion (/broadcast, 100 destinataires par appel). Les variables
//                     ({{prenom}}…) sont substituées ICI, destinataire par destinataire ;
//                     les destinataires dont le texte final est identique partagent un appel.
import { MessagingChannel, CampaignStatus, CampaignRecipientStatus, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { logger } from '../../common/utils/logger';
import { norasendConfig } from '../../config/norasend.config';
import { isNorasendConfigured, type NorasendResult } from './norasend.client';
import { sendWhatsAppMessage, broadcastWhatsApp } from './norasend-whatsapp.service';
import { sendTelegramMessage, broadcastTelegram, type TelegramParseMode } from './norasend-telegram.service';

// ── Limites ───────────────────────────────────────────────────────────────────

export const MAX_RECIPIENTS_PER_CAMPAIGN = 500;
export const MAX_TEXT_LENGTH = 4000;
const MAX_DELAY_MS = 60_000;
// Pause par défaut entre deux envois : prudente pour WhatsApp (risque de bannissement)
const DEFAULT_DELAY_MS: Record<MessagingChannel, number> = { whatsapp: 3000, telegram: 1000 };
// Au-delà, l'envoi se poursuit en arrière-plan et l'historique se met à jour
const SYNC_SEND_MAX_RECIPIENTS = 5;

// ── Types d'entrée ────────────────────────────────────────────────────────────

export interface RecipientInput {
  to: string;
  variables?: Record<string, string>;
}

export interface CampaignInput {
  channel: MessagingChannel;
  mode: 'direct' | 'broadcast';
  recipients: RecipientInput[];
  text: string;
  title?: string;
  mediaUrl?: string;
  caption?: string;
  parseMode?: TelegramParseMode;
  /** Valeurs par défaut des variables, pour les destinataires qui n'ont pas la leur. */
  variables?: Record<string, string>;
  delayMs?: number;
  /** L'administrateur atteste que les destinataires ont consenti à recevoir ces messages. */
  consentConfirmed: boolean;
}

// ── Normalisation des destinataires ───────────────────────────────────────────

/**
 * Numéro WhatsApp au format international sans « + » (ex. 2250700000000).
 * Accepte « +225 07 00 00 00 00 », « 0700000000 » (numéro ivoirien local), etc.
 */
export function normalizePhone(raw: string): string | null {
  const digits = String(raw).replace(/[^\d]/g, '');
  if (/^0\d{9}$/.test(digits)) return `225${digits}`; // numéro local ivoirien à 10 chiffres
  if (digits.length >= 8 && digits.length <= 15 && !digits.startsWith('0')) return digits;
  return null;
}

/** chatId Telegram : identifiant numérique (éventuellement négatif) ou « @canal ». */
export function normalizeChatId(raw: string): string | null {
  const value = String(raw).trim();
  if (/^-?\d{4,20}$/.test(value)) return value;
  if (/^@[A-Za-z][A-Za-z0-9_]{4,31}$/.test(value)) return value;
  return null;
}

const normalizeRecipient = (channel: MessagingChannel, raw: string): string | null =>
  channel === 'whatsapp' ? normalizePhone(raw) : normalizeChatId(raw);

// ── Variables {{nom}} ─────────────────────────────────────────────────────────

const PLACEHOLDER = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function placeholdersOf(text: string): string[] {
  return [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1]))];
}

export function renderTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(PLACEHOLDER, (_m, name: string) => variables[name] ?? '');
}

const mask = (value: string): string => (value.length > 6 ? `${value.slice(0, 3)}***${value.slice(-2)}` : '***');

// ── Service ───────────────────────────────────────────────────────────────────

interface PreparedRecipient {
  to: string;
  variables: Record<string, string>;
  text: string;
}

function validate(input: CampaignInput): { recipients: PreparedRecipient[]; delayMs: number } {
  if (input.consentConfirmed !== true) {
    throw new HttpError(
      400,
      'Confirmez que les destinataires ont consenti à recevoir ces messages (obligation légale et exigence WhatsApp/Telegram).',
    );
  }
  const text = (input.text ?? '').trim();
  if (!text) throw new HttpError(400, 'Le message est vide');
  if (text.length > MAX_TEXT_LENGTH) throw new HttpError(400, `Message trop long (${MAX_TEXT_LENGTH} caractères maximum)`);
  if (input.mediaUrl && !/^https:\/\/\S+$/i.test(input.mediaUrl)) {
    throw new HttpError(400, 'L\'URL du média doit être une adresse https publique');
  }
  if (input.recipients.length === 0) throw new HttpError(400, 'Aucun destinataire');
  if (input.recipients.length > MAX_RECIPIENTS_PER_CAMPAIGN) {
    throw new HttpError(400, `Maximum ${MAX_RECIPIENTS_PER_CAMPAIGN} destinataires par campagne`);
  }
  if (input.channel !== 'telegram' && input.parseMode) {
    throw new HttpError(400, 'parseMode n\'existe que pour Telegram');
  }

  const delayMs = input.delayMs ?? DEFAULT_DELAY_MS[input.channel];
  if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > MAX_DELAY_MS) {
    throw new HttpError(400, `delayMs doit être un entier entre 0 et ${MAX_DELAY_MS}`);
  }

  const needed = placeholdersOf(text);
  const seen = new Set<string>();
  const invalid: string[] = [];
  const recipients: PreparedRecipient[] = [];
  const missing = new Set<string>();

  for (const r of input.recipients) {
    const to = normalizeRecipient(input.channel, r.to);
    if (!to) { invalid.push(String(r.to)); continue; }
    if (seen.has(to)) continue; // doublon : un seul envoi
    seen.add(to);
    const variables = { ...(input.variables ?? {}), ...(r.variables ?? {}) };
    for (const name of needed) if (!variables[name]?.trim()) missing.add(name);
    recipients.push({ to, variables, text: renderTemplate(text, variables) });
  }

  if (invalid.length > 0) {
    const shown = invalid.slice(0, 5).join(', ');
    throw new HttpError(
      400,
      `${invalid.length} destinataire(s) invalide(s) : ${shown}${invalid.length > 5 ? '…' : ''}. ` +
        (input.channel === 'whatsapp'
          ? 'Format attendu : numéro international (ex. 2250700000000).'
          : 'Format attendu : identifiant numérique ou @canal.'),
    );
  }
  if (missing.size > 0) {
    // Jamais de « {{prenom}} » brut envoyé à un client : on refuse avant tout envoi
    throw new HttpError(
      400,
      `Variable(s) sans valeur pour certains destinataires : ${[...missing].map((m) => `{{${m}}}`).join(', ')}. ` +
        'Renseignez-les pour chaque destinataire ou définissez une valeur par défaut.',
    );
  }
  return { recipients, delayMs };
}

const sleep = (ms: number): Promise<void> => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

async function markRecipients(
  campaignId: string,
  recipients: string[],
  data: { status: CampaignRecipientStatus; error?: string | null; providerMessageId?: string | null },
): Promise<void> {
  if (recipients.length === 0) return;
  await prisma.messagingCampaignRecipient.updateMany({
    where: { campaignId, recipient: { in: recipients } },
    data: { ...data, ...(data.status === 'sent' ? { sentAt: new Date() } : {}) },
  });
}

async function finalizeCampaign(campaignId: string, fatalError?: string): Promise<void> {
  const grouped = await prisma.messagingCampaignRecipient.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: { _all: true },
  });
  const count = (s: CampaignRecipientStatus): number => grouped.find((g) => g.status === s)?._count._all ?? 0;
  const sent = count('sent');
  const failed = count('failed') + count('pending'); // « pending » restant = jamais envoyé
  const status: CampaignStatus = sent === 0 ? 'failed' : failed > 0 ? 'partial' : 'completed';
  await prisma.messagingCampaign.update({
    where: { id: campaignId },
    data: { status, sentCount: sent, failedCount: failed, skippedCount: count('skipped'), completedAt: new Date(), error: fatalError ?? null },
  });
}

/** Envoie un lot (un appel Norasend) et enregistre le résultat par destinataire. */
async function sendBatch(
  campaign: { id: string; channel: MessagingChannel; text: string; mediaUrl: string | null; parseMode: string | null; delayMs: number },
  batch: PreparedRecipient[],
  mode: 'direct' | 'broadcast',
): Promise<void> {
  const tos = batch.map((b) => b.to);
  try {
    let result: NorasendResult;
    if (mode === 'direct' || batch.length === 1) {
      const [only] = batch;
      result = campaign.channel === 'whatsapp'
        ? await sendWhatsAppMessage(only.to, only.text, campaign.mediaUrl ?? undefined)
        : await sendTelegramMessage(only.to, only.text, campaign.mediaUrl ?? undefined, undefined, (campaign.parseMode as TelegramParseMode) ?? undefined);
    } else {
      result = campaign.channel === 'whatsapp'
        ? await broadcastWhatsApp(tos, batch[0].text, undefined, campaign.delayMs)
        : await broadcastTelegram(tos, batch[0].text, campaign.delayMs);
    }

    if (result.results && result.results.length > 0) {
      // Norasend détaille le résultat par destinataire
      const byTo = new Map(result.results.map((r) => [r.to, r]));
      for (const to of tos) {
        const r = byTo.get(to);
        if (!r || r.ok) await markRecipients(campaign.id, [to], { status: 'sent', providerMessageId: r?.messageId ?? result.messageId });
        else await markRecipients(campaign.id, [to], { status: 'failed', error: r.error });
      }
    } else if (result.ok) {
      await markRecipients(campaign.id, tos, { status: 'sent', providerMessageId: result.messageId });
    } else {
      await markRecipients(campaign.id, tos, { status: 'failed', error: result.error });
    }
  } catch (err) {
    await markRecipients(campaign.id, tos, { status: 'failed', error: (err as Error).message.slice(0, 300) });
  }
}

/** Exécute une campagne déjà enregistrée. Ne lève jamais : les erreurs sont tracées en base. */
export async function runCampaign(campaignId: string, prepared: PreparedRecipient[]): Promise<void> {
  try {
    const campaign = await prisma.messagingCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return;
    const mode = campaign.mode as 'direct' | 'broadcast';
    const active = prepared;

    if (mode === 'direct') {
      for (let i = 0; i < active.length; i++) {
        if (i > 0) await sleep(campaign.delayMs);
        await sendBatch(campaign, [active[i]], 'direct');
      }
    } else {
      // Destinataires au texte identique → un seul appel de diffusion (100 max)
      const groups = new Map<string, PreparedRecipient[]>();
      for (const p of active) groups.set(p.text, [...(groups.get(p.text) ?? []), p]);
      let first = true;
      for (const group of groups.values()) {
        for (let i = 0; i < group.length; i += norasendConfig.maxBroadcastBatch) {
          if (!first) await sleep(campaign.delayMs);
          first = false;
          await sendBatch(campaign, group.slice(i, i + norasendConfig.maxBroadcastBatch), 'broadcast');
        }
      }
    }
    await finalizeCampaign(campaignId);
  } catch (err) {
    logger.error('Campagne : erreur inattendue', { campaignId, error: (err as Error).message });
    await finalizeCampaign(campaignId, (err as Error).message.slice(0, 300)).catch(() => null);
  }
}

export const communicationsService = {
  /** État de configuration des canaux (aucun secret renvoyé). */
  getStatus() {
    const configured = isNorasendConfigured();
    return {
      configured,
      whatsapp: { ready: configured, sessionConfigured: !!norasendConfig.whatsappSessionId },
      telegram: { ready: configured, botConfigured: !!norasendConfig.telegramBotId },
      limits: { maxRecipientsPerCampaign: MAX_RECIPIENTS_PER_CAMPAIGN, maxBroadcastBatch: norasendConfig.maxBroadcastBatch, maxTextLength: MAX_TEXT_LENGTH },
    };
  },

  /**
   * Valide, enregistre puis envoie une campagne. Pour 5 destinataires ou moins la
   * réponse contient le résultat final ; au-delà l'envoi continue en arrière-plan
   * (statut « processing » dans l'historique).
   */
  async createCampaign(input: CampaignInput, adminId: string) {
    if (!isNorasendConfigured()) {
      throw new HttpError(503, 'Norasend n\'est pas configuré : la clé NORASEND_API_KEY est manquante.');
    }
    const { recipients, delayMs } = validate(input);

    // Désinscrits : jamais contactés
    const optedOut = await prisma.messagingOptOut.findMany({
      where: { channel: input.channel, recipient: { in: recipients.map((r) => r.to) } },
      select: { recipient: true },
    });
    const blocked = new Set(optedOut.map((o) => o.recipient));
    const sendable = recipients.filter((r) => !blocked.has(r.to));
    if (sendable.length === 0) {
      throw new HttpError(400, 'Tous les destinataires sont désinscrits : aucun message n\'a été envoyé.');
    }

    const campaign = await prisma.messagingCampaign.create({
      data: {
        channel: input.channel,
        mode: input.mode,
        title: input.title?.trim() || null,
        text: input.text.trim(),
        mediaUrl: input.mediaUrl ?? null,
        parseMode: input.parseMode ?? null,
        totalRecipients: recipients.length,
        skippedCount: blocked.size,
        delayMs,
        consentConfirmed: true,
        createdBy: adminId,
        recipients: {
          create: recipients.map((r) => ({
            recipient: r.to,
            variables: Object.keys(r.variables).length > 0 ? (r.variables as Prisma.InputJsonValue) : undefined,
            status: blocked.has(r.to) ? ('skipped' as const) : ('pending' as const),
            error: blocked.has(r.to) ? 'Désinscrit' : null,
          })),
        },
      },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: adminId,
          action: 'admin.messaging.campaign',
          targetType: 'messaging_campaign',
          targetId: campaign.id,
          description: `${input.channel} ${input.mode} — ${sendable.length} destinataire(s)`,
        },
      })
      .catch((err) => logger.warn('Campagne : audit non créé', err));

    logger.info('Campagne créée', {
      campaignId: campaign.id, channel: input.channel, mode: input.mode,
      recipients: sendable.length, sample: mask(sendable[0].to),
    });

    if (sendable.length <= SYNC_SEND_MAX_RECIPIENTS) {
      await runCampaign(campaign.id, sendable);
    } else {
      void runCampaign(campaign.id, sendable);
    }
    return communicationsService.getCampaign(campaign.id);
  },

  async getCampaign(id: string) {
    const campaign = await prisma.messagingCampaign.findUnique({
      where: { id },
      include: { recipients: { orderBy: { recipient: 'asc' }, take: 1000 } },
    });
    if (!campaign) throw new HttpError(404, 'Campagne introuvable');
    return campaign;
  },

  async listCampaigns(params: { page?: number; limit?: number; channel?: MessagingChannel; status?: CampaignStatus }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const where: Prisma.MessagingCampaignWhereInput = {
      ...(params.channel ? { channel: params.channel } : {}),
      ...(params.status ? { status: params.status } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.messagingCampaign.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.messagingCampaign.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  // ── Désinscriptions ─────────────────────────────────────────────────────────

  async listOptOuts(channel?: MessagingChannel) {
    return prisma.messagingOptOut.findMany({
      where: channel ? { channel } : {},
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  },

  async addOptOut(channel: MessagingChannel, rawRecipient: string, reason: string | undefined, adminId: string) {
    const recipient = normalizeRecipient(channel, rawRecipient);
    if (!recipient) throw new HttpError(400, 'Destinataire invalide');
    return prisma.messagingOptOut.upsert({
      where: { channel_recipient: { channel, recipient } },
      create: { channel, recipient, reason: reason?.trim() || null, createdBy: adminId },
      update: { reason: reason?.trim() || null },
    });
  },

  async removeOptOut(id: string) {
    const found = await prisma.messagingOptOut.findUnique({ where: { id } });
    if (!found) throw new HttpError(404, 'Désinscription introuvable');
    await prisma.messagingOptOut.delete({ where: { id } });
  },

  /**
   * Au démarrage : une campagne restée « processing » (redémarrage du serveur en cours
   * d'envoi) est clôturée ; les destinataires jamais envoyés sont marqués en échec.
   */
  async recoverInterrupted(): Promise<number> {
    const stuck = await prisma.messagingCampaign.findMany({ where: { status: 'processing' }, select: { id: true } });
    for (const { id } of stuck) {
      await prisma.messagingCampaignRecipient.updateMany({
        where: { campaignId: id, status: 'pending' },
        data: { status: 'failed', error: 'Envoi interrompu par un redémarrage du serveur' },
      });
      await finalizeCampaign(id, 'Interrompue par un redémarrage du serveur');
    }
    return stuck.length;
  },
};
