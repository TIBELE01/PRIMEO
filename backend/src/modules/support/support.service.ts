// Support service — ticket lifecycle management + chatbot integration
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { notificationsService } from '../notifications/notifications.service';
import { sendEmail } from '../../common/utils/mailer';
import { logger } from '../../common/utils/logger';
import {
  CreateTicketInput,
  AdminListTicketsInput,
  ChangeStatusInput,
} from './dto/support.dto';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

// ── Auto-priority mapping ─────────────────────────────────────────────────────

const CATEGORY_PRIORITY: Record<TicketCategory, TicketPriority> = {
  dispute:     TicketPriority.high,
  complaint:   TicketPriority.medium,
  technical:   TicketPriority.medium,
  information: TicketPriority.low,
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open:        'Ouvert',
  in_progress: 'En cours',
  resolved:    'Résolu',
  closed:      'Fermé',
};

// ── User-facing methods ───────────────────────────────────────────────────────

export const supportService = {
  async create(userId: string, input: CreateTicketInput) {
    const priority = CATEGORY_PRIORITY[input.category as TicketCategory];
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject:     input.subject,
        description: input.description,
        category:    input.category as TicketCategory,
        attachments: input.attachments ?? [],
        priority,
      },
    });
    logger.debug(`Support ticket created: ${ticket.id} priority=${priority}`);
    return ticket;
  },

  async listForUser(userId: string, page = 1, limit = 20) {
    const where = { userId };
    const [data, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, subject: true, category: true, status: true,
          priority: true, createdAt: true, updatedAt: true,
          _count: { select: { comments: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async getById(id: string, userId: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        comments: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!ticket || ticket.userId !== userId) throw new HttpError(404, 'Ticket introuvable');
    return ticket;
  },

  async addUserComment(ticketId: string, userId: string, content: string) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.userId !== userId) throw new HttpError(404, 'Ticket introuvable');
    if (ticket.status === TicketStatus.closed) {
      throw new HttpError(400, 'Impossible de commenter un ticket fermé');
    }
    return prisma.ticketComment.create({
      data: { ticketId, authorId: userId, content, isInternal: false },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
  },

  // ── Admin methods ─────────────────────────────────────────────────────────

  async adminListAll(query: AdminListTicketsInput) {
    const { status, category, priority, page, limit } = query;
    const where = {
      ...(status   ? { status:   status as TicketStatus }   : {}),
      ...(category ? { category: category as TicketCategory } : {}),
      ...(priority ? { priority: priority as TicketPriority } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user:     { select: { id: true, firstName: true, lastName: true, email: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          _count:   { select: { comments: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async adminGetById(id: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user:     { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!ticket) throw new HttpError(404, 'Ticket introuvable');
    return ticket;
  },

  async assign(ticketId: string, assigneeId: string) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new HttpError(404, 'Ticket introuvable');

    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) throw new HttpError(404, 'Agent introuvable');

    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedTo: assigneeId },
    });
  },

  async changeStatus(ticketId: string, input: ChangeStatusInput) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
    if (!ticket) throw new HttpError(404, 'Ticket introuvable');

    const newStatus = input.status as TicketStatus;
    const now = new Date();
    const extra: { resolvedAt?: Date; closedAt?: Date } = {};
    if (newStatus === TicketStatus.resolved) extra.resolvedAt = now;
    if (newStatus === TicketStatus.closed)   extra.closedAt   = now;

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: newStatus, ...extra },
    });

    // Notify via in-app + Brevo email
    notificationsService.notify({
      type: 'ticket_status_changed',
      recipientId: ticket.userId,
      data: { subject: ticket.subject, newStatus },
    }).catch((err) => logger.warn(`Notify ticket_status_changed failed: ${String(err)}`));

    if (ticket.user?.email) {
      sendEmail({
        to: [{ email: ticket.user.email, name: `${ticket.user.firstName} ${ticket.user.lastName}` }],
        subject: `Mise à jour de votre ticket : ${ticket.subject}`,
        htmlContent: `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr><td style="background:#1E3A5F;padding:28px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">PRIMEO</h1>
          <p style="color:#B0C4DE;margin:4px 0 0;font-size:12px;">Support client</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="font-size:16px;color:#333;margin:0 0 12px;">Bonjour <strong>${ticket.user.firstName}</strong>,</p>
          <p style="font-size:15px;color:#555;margin:0 0 20px;line-height:1.6;">
            Le statut de votre ticket <strong>#${ticket.id.slice(-8).toUpperCase()}</strong> a été mis à jour.
          </p>
          <div style="background:#F0F4FF;border-left:4px solid #1E3A5F;padding:16px;border-radius:4px;margin:0 0 20px;">
            <p style="margin:0 0 6px;font-size:13px;color:#888;">Objet du ticket</p>
            <p style="margin:0;font-size:15px;color:#1E3A5F;font-weight:600;">${ticket.subject}</p>
          </div>
          <p style="font-size:15px;color:#555;margin:0 0 8px;">Nouveau statut :</p>
          <span style="display:inline-block;padding:6px 16px;background:#E8F5E9;color:#2E7D32;border-radius:20px;font-size:14px;font-weight:600;">
            ${STATUS_LABELS[newStatus] ?? newStatus}
          </span>
          ${newStatus === TicketStatus.resolved || newStatus === TicketStatus.closed ? `
          <p style="font-size:14px;color:#666;margin:20px 0 0;line-height:1.6;">
            Si vous estimez que votre demande n'est pas résolue, vous pouvez rouvrir un ticket depuis votre espace.
          </p>` : `
          <p style="font-size:14px;color:#666;margin:20px 0 0;line-height:1.6;">
            Vous serez notifié de toute évolution. Vous pouvez consulter votre ticket dans votre espace client.
          </p>`}
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="font-size:12px;color:#aaa;margin:0;">© ${new Date().getFullYear()} Primeo CI — Abidjan, Côte d'Ivoire</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
      }).catch((err) => logger.warn(`Brevo ticket_status email failed: ${String(err)}`));
    }

    return updated;
  },

  async adminAddComment(ticketId: string, authorId: string, content: string, isInternal: boolean) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
    if (!ticket) throw new HttpError(404, 'Ticket introuvable');

    const comment = await prisma.ticketComment.create({
      data: { ticketId, authorId, content, isInternal },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!isInternal) {
      notificationsService.notify({
        type: 'ticket_comment_added',
        recipientId: ticket.userId,
        data: { subject: ticket.subject },
      }).catch((err) => logger.warn(`Notify ticket_comment_added failed: ${String(err)}`));

      if (ticket.user?.email) {
        sendEmail({
          to: [{ email: ticket.user.email, name: `${ticket.user.firstName} ${ticket.user.lastName}` }],
          subject: `Nouveau message sur votre ticket : ${ticket.subject}`,
          htmlContent: `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr><td style="background:#1E3A5F;padding:28px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">PRIMEO</h1>
          <p style="color:#B0C4DE;margin:4px 0 0;font-size:12px;">Support client</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="font-size:16px;color:#333;margin:0 0 12px;">Bonjour <strong>${ticket.user.firstName}</strong>,</p>
          <p style="font-size:15px;color:#555;margin:0 0 20px;line-height:1.6;">
            Un agent a répondu à votre ticket <strong>#${ticket.id.slice(-8).toUpperCase()}</strong>.
          </p>
          <div style="background:#F8F9FA;border:1px solid #E5E7EB;border-radius:6px;padding:20px;margin:0 0 20px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">Objet : ${ticket.subject}</p>
            <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">${content.replace(/\n/g, '<br>')}</p>
          </div>
          <p style="font-size:14px;color:#666;line-height:1.6;">
            Connectez-vous à votre espace pour répondre à cet agent.
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="font-size:12px;color:#aaa;margin:0;">© ${new Date().getFullYear()} Primeo CI — Abidjan, Côte d'Ivoire</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
        }).catch((err) => logger.warn(`Brevo ticket_comment email failed: ${String(err)}`));
      }
    }

    return comment;
  },

  // ── Admin stats ─────────────────────────────────────────────────────────────

  async adminGetStats() {
    const [
      byStatus,
      byCategory,
      byPriority,
      total,
      resolvedTickets,
    ] = await Promise.all([
      prisma.supportTicket.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.supportTicket.groupBy({ by: ['category'], _count: { id: true } }),
      prisma.supportTicket.groupBy({ by: ['priority'], _count: { id: true } }),
      prisma.supportTicket.count(),
      prisma.supportTicket.findMany({
        where: { resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
      }),
    ]);

    const avgResolutionMs = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => sum + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0) / resolvedTickets.length
      : 0;
    const avgResolutionHours = Math.round(avgResolutionMs / (1000 * 3600));

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count.id])),
      byCategory: Object.fromEntries(byCategory.map((r) => [r.category, r._count.id])),
      byPriority: Object.fromEntries(byPriority.map((r) => [r.priority, r._count.id])),
      avgResolutionHours,
    };
  },

  // ── Chatbot admin methods ───────────────────────────────────────────────────

  async adminGetChatbotStats() {
    const [total, escalated, unanswered, byIntent] = await Promise.all([
      prisma.auditLog.count({ where: { action: 'chatbot.message' } }),
      prisma.auditLog.count({ where: { action: 'chatbot.escalation' } }),
      prisma.auditLog.count({ where: { action: 'chatbot.no_match' } }),
      prisma.auditLog.groupBy({
        by: ['targetType'],
        where: { action: 'chatbot.message', targetType: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    const autoResolved = total - escalated;
    const resolutionRate = total > 0 ? Math.round((autoResolved / total) * 100) : 0;

    const avgEscalationQuery = await prisma.auditLog.findMany({
      where: { action: 'chatbot.escalation' },
      select: { metadata: true },
    });
    const escalationTimes = avgEscalationQuery
      .map((r) => (r.metadata as Record<string, unknown>)?.messageCount as number)
      .filter(Boolean);
    const avgMessagesBeforeEscalation = escalationTimes.length > 0
      ? Math.round(escalationTimes.reduce((a, b) => a + b, 0) / escalationTimes.length)
      : 0;

    return {
      total,
      escalated,
      unanswered,
      autoResolved,
      resolutionRate,
      avgMessagesBeforeEscalation,
      topIntents: byIntent.map((r) => ({ intent: r.targetType!, count: r._count.id })),
    };
  },

  async adminGetRecentChatbotConversations(limit = 20) {
    const logs = await prisma.auditLog.findMany({
      where: { action: { in: ['chatbot.message', 'chatbot.escalation', 'chatbot.no_match'] } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        description: true,
        targetType: true,
        targetId: true,
        metadata: true,
        createdAt: true,
        userId: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    return logs;
  },

  async adminGetUnansweredQuestions(limit = 50) {
    const logs = await prisma.auditLog.findMany({
      where: { action: 'chatbot.no_match' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        description: true,
        metadata: true,
        createdAt: true,
      },
    });
    return logs.map((log) => ({
      id: log.id,
      query: log.description ?? '',
      sessionId: (log.metadata as Record<string, unknown>)?.sessionId as string | undefined,
      createdAt: log.createdAt,
    }));
  },

  async adminGetChatbotFaq() {
    const config = await prisma.platformConfig.findUnique({
      where: { key: 'chatbot_faq' },
    });
    if (!config) return null;
    return config.value;
  },

  async adminUpdateChatbotFaq(faqEntries: unknown[], adminId: string) {
    await prisma.platformConfig.upsert({
      where: { key: 'chatbot_faq' },
      update: { value: faqEntries as never, updatedBy: adminId },
      create: { key: 'chatbot_faq', value: faqEntries as never, updatedBy: adminId },
    });
    return { success: true };
  },
};
