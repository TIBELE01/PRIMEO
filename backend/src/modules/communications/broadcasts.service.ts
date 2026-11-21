// Envois groupés depuis l'admin — notifications push (OneSignal / Expo) et emails (Brevo)
// à un groupe d'utilisateurs : tous, clients, professionnels (par activité) ou une sélection.
// Chaque envoi est historisé (table admin_broadcasts) avec ses compteurs.
//
// Règles :
//   - comptes suspendus / bannis et administrateurs exclus ;
//   - préférences respectées : push désactivé ⇒ pas de push, email désactivé ⇒ pas d'email ;
//   - le canal push crée aussi une notification dans l'application (centre de notifications) ;
//   - envoi en arrière-plan au-delà de quelques destinataires : l'historique se met à jour.
import { AccountType, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { logger } from '../../common/utils/logger';
import { sendEmail } from '../../common/utils/mailer';
import { pushProvider } from '../notifications/providers/push.provider';
import { DEFAULT_PREFERENCES, type NotificationPreferences } from '../notifications/notifications.types';

export const BROADCAST_AUDIENCES = [
  'all', 'clients', 'professionals',
  'professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur',
  'selection',
] as const;
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];
export type BroadcastChannel = 'push' | 'email';

export const MAX_BROADCAST_RECIPIENTS = 5000;
const SYNC_MAX = 20;      // au-delà : envoi en arrière-plan
const CONCURRENCY = 5;

const PRO_TYPES: AccountType[] = ['professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'];

export const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  all: 'Tous les utilisateurs',
  clients: 'Tous les clients',
  professionals: 'Tous les professionnels',
  professional_hebergement: 'Propriétaires de résidences',
  professional_hotel: 'Hôteliers',
  professional_immobilier: 'Agents immobiliers',
  restaurateur: 'Restaurateurs',
  selection: 'Sélection d’utilisateurs',
};

/** Filtre Prisma des destinataires d'une audience (comptes actifs ou en attente, jamais admin). */
export function audienceWhere(audience: BroadcastAudience, recipientIds: string[] = []): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { status: { in: ['active', 'pending'] }, accountType: { not: 'admin' } };
  switch (audience) {
    case 'all': return base;
    case 'clients': return { ...base, accountType: 'client' };
    case 'professionals': return { ...base, accountType: { in: PRO_TYPES } };
    case 'selection': return { ...base, id: { in: recipientIds } };
    default: return { ...base, accountType: audience };
  }
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Corps HTML de l'email (texte de l'admin échappé ; mise en page Primeo ajoutée par sendEmail). */
export function broadcastEmailHtml(title: string, message: string, firstName?: string | null): string {
  const paragraphs = escapeHtml(message.trim())
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<h2>${escapeHtml(title)}</h2><p style="margin:0 0 14px;">Bonjour${firstName ? ' ' + escapeHtml(firstName) : ''},</p>${paragraphs}`;
}

type Recipient = { id: string; email: string; firstName: string | null; notificationPreferences: unknown };

async function deliverOne(
  b: { id: string; title: string; message: string; channels: string[] },
  u: Recipient,
  counters: Record<'pushSent' | 'pushSkipped' | 'emailSent' | 'emailFailed' | 'emailSkipped', number>,
): Promise<void> {
  const prefs: NotificationPreferences = { ...DEFAULT_PREFERENCES, ...((u.notificationPreferences as Partial<NotificationPreferences>) ?? {}) };

  if (b.channels.includes('push')) {
    await prisma.notification
      .create({ data: { userId: u.id, type: 'admin_announcement', title: b.title, body: b.message, data: { broadcastId: b.id } } })
      .catch((err) => logger.warn('Envoi groupé : notification in-app non créée', err));
    const devices = prefs.push ? await prisma.pushToken.count({ where: { userId: u.id, isActive: true } }) : 0;
    if (devices > 0) {
      try {
        await pushProvider.sendToUser(u.id, 'admin_announcement', b.title, b.message, { broadcastId: b.id }, 'normal');
        counters.pushSent++;
      } catch (err) {
        logger.warn(`Envoi groupé : push échoué pour ${u.id}`, err);
        counters.pushSkipped++;
      }
    } else {
      counters.pushSkipped++;
    }
  }

  if (b.channels.includes('email')) {
    if (!prefs.email || !u.email) {
      counters.emailSkipped++;
    } else {
      try {
        await sendEmail({
          to: [{ email: u.email, name: u.firstName ?? undefined }],
          subject: `${b.title} — Primeo`,
          htmlContent: broadcastEmailHtml(b.title, b.message, u.firstName),
        });
        counters.emailSent++;
      } catch {
        counters.emailFailed++;
      }
    }
  }
}

export async function runBroadcast(broadcastId: string): Promise<void> {
  const b = await prisma.adminBroadcast.findUnique({ where: { id: broadcastId } });
  if (!b) return;
  const counters = { pushSent: 0, pushSkipped: 0, emailSent: 0, emailFailed: 0, emailSkipped: 0 };
  try {
    const users = await prisma.user.findMany({
      where: audienceWhere(b.audience as BroadcastAudience, b.recipientIds),
      select: { id: true, email: true, firstName: true, notificationPreferences: true },
      take: MAX_BROADCAST_RECIPIENTS,
      orderBy: { createdAt: 'asc' },
    });
    for (let i = 0; i < users.length; i += CONCURRENCY) {
      await Promise.all(users.slice(i, i + CONCURRENCY).map((u) => deliverOne(b, u, counters)));
      if (i % 100 === 0) await prisma.adminBroadcast.update({ where: { id: b.id }, data: counters }).catch(() => null);
    }
    const anyOk = counters.pushSent + counters.emailSent > 0;
    const status = counters.emailFailed === 0 ? 'completed' : anyOk ? 'partial' : 'failed';
    await prisma.adminBroadcast.update({ where: { id: b.id }, data: { ...counters, status, completedAt: new Date() } });
    logger.info('Envoi groupé terminé', { broadcastId: b.id, ...counters });
  } catch (err) {
    logger.error('Envoi groupé : erreur inattendue', { broadcastId, error: (err as Error).message });
    await prisma.adminBroadcast
      .update({ where: { id: broadcastId }, data: { ...counters, status: 'failed', error: (err as Error).message.slice(0, 300), completedAt: new Date() } })
      .catch(() => null);
  }
}

export const broadcastsService = {
  /** Nombre de destinataires par audience (et appareils push enregistrés). */
  async getAudiences() {
    const audiences = BROADCAST_AUDIENCES.filter((a) => a !== 'selection');
    const rows = await Promise.all(
      audiences.map(async (a) => {
        const where = audienceWhere(a);
        const [users, withPush] = await Promise.all([
          prisma.user.count({ where }),
          prisma.user.count({ where: { ...where, pushTokens: { some: { isActive: true } } } }),
        ]);
        return { audience: a, label: AUDIENCE_LABELS[a], users, withPush };
      }),
    );
    return { audiences: rows, maxRecipients: MAX_BROADCAST_RECIPIENTS };
  },

  async create(
    input: { title: string; message: string; channels: BroadcastChannel[]; audience: BroadcastAudience; recipientIds?: string[] },
    adminId: string,
  ) {
    const channels = [...new Set(input.channels)];
    if (!channels.length) throw new HttpError(400, 'Choisissez au moins un canal (push ou email).');
    const recipientIds = input.audience === 'selection' ? [...new Set(input.recipientIds ?? [])] : [];
    if (input.audience === 'selection' && !recipientIds.length) throw new HttpError(400, 'Sélectionnez au moins un destinataire.');

    const total = await prisma.user.count({ where: audienceWhere(input.audience, recipientIds) });
    if (total === 0) throw new HttpError(400, 'Aucun destinataire actif pour ce groupe.');
    if (total > MAX_BROADCAST_RECIPIENTS) {
      throw new HttpError(400, `Ce groupe compte ${total} destinataires : maximum ${MAX_BROADCAST_RECIPIENTS} par envoi.`);
    }

    const broadcast = await prisma.adminBroadcast.create({
      data: {
        title: input.title.trim(),
        message: input.message.trim(),
        channels,
        audience: input.audience,
        recipientIds,
        totalRecipients: total,
        createdBy: adminId,
      },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: adminId,
          action: 'admin.broadcast.send',
          targetType: 'admin_broadcast',
          targetId: broadcast.id,
          description: `${channels.join(' + ')} — ${AUDIENCE_LABELS[input.audience]} — ${total} destinataire(s)`,
        },
      })
      .catch((err) => logger.warn('Envoi groupé : audit non créé', err));

    if (total <= SYNC_MAX) await runBroadcast(broadcast.id);
    else void runBroadcast(broadcast.id);
    return broadcastsService.get(broadcast.id);
  },

  async get(id: string) {
    const b = await prisma.adminBroadcast.findUnique({ where: { id } });
    if (!b) throw new HttpError(404, 'Envoi introuvable');
    return { ...b, audienceLabel: AUDIENCE_LABELS[b.audience as BroadcastAudience] ?? b.audience };
  },

  async list(params: { page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const [items, total] = await Promise.all([
      prisma.adminBroadcast.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.adminBroadcast.count(),
    ]);
    const adminIds = [...new Set(items.map((i) => i.createdBy).filter(Boolean))] as string[];
    const admins = adminIds.length
      ? await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const names = new Map(admins.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]));
    return {
      data: items.map((b) => ({
        ...b,
        audienceLabel: AUDIENCE_LABELS[b.audience as BroadcastAudience] ?? b.audience,
        createdByName: b.createdBy ? names.get(b.createdBy) ?? null : null,
      })),
      total,
      page,
      limit,
    };
  },
};
