// Chatbot service — rule-based FAQ with session-aware dissatisfaction detection
import { classifyIntent, SupportIntent } from './intent-handler';
import { logger } from '../../../common/utils/logger';
import { prisma } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

// ── FAQ knowledge base ─────────────────────────────────────────────────────────

export interface FaqEntry {
  id: string;
  keywords: string[];
  response: string;
  intent: SupportIntent;
  category?: string;
}

export const DEFAULT_FAQ_ENTRIES: FaqEntry[] = [
  // Reservations
  {
    id: 'booking_how',
    keywords: ['comment réserver', 'faire une réservation', 'book', 'reserver', 'réserver'],
    intent: 'booking_status',
    category: 'Réservations',
    response:
      'Pour réserver : trouvez un bien avec la recherche, choisissez vos dates et le nombre de personnes, puis l\'option de paiement proposée par l\'hôte (100 % en ligne, acompte de 10 % en ligne avec solde en espèces à l\'arrivée, ou 100 % sur place). Pour un restaurant, la réservation de table est gratuite et confirmée immédiatement ; pour l\'immobilier, touchez « Exprimer mon intérêt ».',
  },
  {
    id: 'booking_status',
    keywords: ['statut réservation', 'état réservation', 'où en est', 'ma réservation'],
    intent: 'booking_status',
    category: 'Réservations',
    response:
      'Consultez vos réservations dans l\'onglet « Réservations ». Statuts : En attente de paiement (2 h pour payer) → Confirmée → Terminée (après la date de départ), ou Annulée. Si votre réservation reste bloquée, créez un ticket de support.',
  },
  {
    id: 'booking_cancel',
    keywords: ['annuler', 'annulation', 'cancel'],
    intent: 'booking_cancel',
    category: 'Réservations',
    response:
      'Pour annuler : ouvrez la réservation dans « Réservations », touchez « Annuler la réservation » et indiquez un motif. Remboursement du montant payé en ligne : 100 % à 7 jours ou plus avant l\'arrivée, 50 % de 3 à 6 jours, 0 % en dessous. Il est crédité sur votre portefeuille Primeo. Si c\'est l\'hôte qui annule, vous êtes remboursé intégralement.',
  },
  {
    id: 'booking_modify',
    keywords: ['modifier réservation', 'changer date', 'modifier dates'],
    intent: 'booking_cancel',
    category: 'Réservations',
    response:
      'L\'application ne permet pas de modifier les dates d\'une réservation. Annulez-la (selon le barème d\'annulation) puis effectuez une nouvelle réservation avec les bonnes dates.',
  },
  // Payments
  {
    id: 'payment_methods',
    keywords: ['paiement', 'payer', 'comment payer', 'moyens de paiement'],
    intent: 'payment_issue',
    category: 'Paiements',
    response:
      'Le paiement en ligne se fait sur la page sécurisée Genius Pay (Mobile Money comme Wave ou Orange Money, selon les moyens affichés). Vous pouvez aussi choisir un acompte de 10 % ou le paiement 100 % sur place si l\'hôte le propose. Aucun frais de service n\'est ajouté. Un numéro de téléphone doit figurer dans votre profil pour payer en ligne.',
  },
  {
    id: 'payment_failed',
    keywords: ['echec paiement', 'paiement refusé', 'transaction échouée', 'payment failed'],
    intent: 'payment_issue',
    category: 'Paiements',
    response:
      'En cas d\'échec de paiement : vérifiez votre solde Mobile Money et votre connexion, puis relancez le paiement depuis la réservation (vous avez 2 heures, après quoi elle est annulée automatiquement). Si vous avez été débité sans confirmation, créez un ticket de support ou ouvrez un litige « Problème de paiement ».',
  },
  // Refunds
  {
    id: 'refund',
    keywords: ['remboursement', 'remboursé', 'rembourser', 'refund'],
    intent: 'refund_request',
    category: 'Remboursements',
    response:
      'Remboursement d\'une annulation : 100 % du montant payé en ligne si vous annulez 7 jours ou plus avant l\'arrivée, 50 % de 3 à 6 jours, 0 % en dessous. Il est crédité sur votre portefeuille Primeo et déduit automatiquement de vos prochaines réservations. Une réservation non payée ne coûte rien : le solde et le code promo utilisés sont restitués.',
  },
  // Account
  {
    id: 'password_reset',
    keywords: ['mot de passe', 'réinitialiser', 'connexion', 'oublié mot de passe'],
    intent: 'account_help',
    category: 'Compte',
    response:
      'Pour réinitialiser votre mot de passe : touchez « Mot de passe oublié » sur l\'écran de connexion, saisissez votre e-mail et suivez le lien reçu. Le lien est valable 1 heure.',
  },
  {
    id: 'register',
    keywords: ['créer compte', 'inscription', 's\'inscrire', 'register'],
    intent: 'account_help',
    category: 'Compte',
    response:
      'Créez votre compte en touchant « Créer un compte » : prénom, nom, e-mail, téléphone ivoirien (+225) et mot de passe (8 caractères minimum, 1 majuscule, 1 minuscule, 1 chiffre). Le compte client est créé immédiatement. Les professionnels passent par « Inscription professionnelle » : un code de vérification valable 10 minutes leur est envoyé par e-mail, puis leur dossier est validé par notre équipe.',
  },
  {
    id: 'kyc',
    keywords: ['kyc', 'vérification', 'documents', 'professionnel'],
    intent: 'account_help',
    category: 'Compte',
    response:
      'La vérification KYC est obligatoire pour les professionnels : pièce d\'identité et extrait RCCM (obligatoires), licence touristique (facultative), fournis à l\'inscription professionnelle. L\'équipe Primeo valide généralement sous 24 à 48 h ; en cas de refus, le motif s\'affiche et vous pouvez soumettre à nouveau vos documents.',
  },
  // Platform
  {
    id: 'dispute',
    keywords: ['signaler litige', 'problème logement', 'plainte', 'litige'],
    intent: 'general_inquiry',
    category: 'Litiges',
    response:
      'Pour signaler un problème : ouvrez la réservation concernée et touchez « Signaler un problème » (catégorie, description d\'au moins 20 caractères, pièces jointes facultatives). Un administrateur examine le dossier et décide d\'un rejet, d\'un remboursement partiel ou total. Suivi dans « Mes litiges ».',
  },
  {
    id: 'review',
    keywords: ['avis', 'noter', 'évaluation', 'review'],
    intent: 'general_inquiry',
    category: 'Avis',
    response:
      'Vous pouvez laisser un avis une fois la réservation Terminée et la date de départ passée (la réservation passe automatiquement à Terminée le lendemain du départ). Ouvrez-la dans « Réservations » puis « Laisser un avis ». Un seul avis par réservation ; modifiable ou supprimable pendant 7 jours.',
  },
  {
    id: 'referral',
    keywords: ['parrainage', 'code parrainage', 'inviter', 'referral'],
    intent: 'general_inquiry',
    category: 'Parrainage',
    response:
      'Parrainage : partagez votre code (Profil → Parrainage). Vous recevez 250 FCFA sur votre portefeuille Primeo quand un client parrainé effectue sa première réservation confirmée, ou 1 000 FCFA quand un professionnel parrainé voit son dossier validé.',
  },
];

// ── Negative-sentiment detection ───────────────────────────────────────────────

const NEGATIVE_KEYWORDS = [
  'pas satisfait', 'insatisfait', 'inacceptable', 'scandaleux', 'honteux',
  'arnaque', 'escroquerie', 'fraudé', 'volé', 'nul', 'catastrophe', 'horrible',
  'terrible', 'mauvais', 'rien ne fonctionne', 'ça ne marche pas', 'bloqué',
  'problème grave', 'urgent', 'urgence', 'très en colère', 'furieux',
  'j\'exige', 'je veux un remboursement', 'je vais porter plainte',
];

function detectNegativeSentiment(text: string): boolean {
  const normalized = text.toLowerCase();
  return NEGATIVE_KEYWORDS.some((kw) => normalized.includes(kw));
}

// ── Session store (in-memory, TTL 30 min) ─────────────────────────────────────

interface ChatSession {
  messageCount: number;
  unresolvedStreak: number;
  negativeHits: number;
  lastActivity: number;
  userId?: string;
}

const sessions = new Map<string, ChatSession>();
const SESSION_TTL_MS = 30 * 60 * 1000;
const UNRESOLVED_THRESHOLD = 2;
const NEGATIVE_THRESHOLD = 1;

function getSession(sessionId: string, userId?: string): ChatSession {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastActivity > SESSION_TTL_MS) sessions.delete(id);
  }

  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { messageCount: 0, unresolvedStreak: 0, negativeHits: 0, lastActivity: now, userId });
  }
  const session = sessions.get(sessionId)!;
  session.lastActivity = now;
  if (userId) session.userId = userId;
  return session;
}

// ── Async audit logging ───────────────────────────────────────────────────────

function logChatbotEvent(opts: {
  action: 'chatbot.message' | 'chatbot.no_match' | 'chatbot.escalation';
  description: string;
  sessionId: string;
  intent?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
}): void {
  prisma.auditLog.create({
    data: {
      action: opts.action,
      description: opts.description,
      userId: opts.userId ?? null,
      targetType: opts.intent ?? null,
      targetId: opts.sessionId,
      metadata: (opts.metadata ?? {}) as Prisma.InputJsonValue,
    },
  }).catch((err) => logger.warn(`Chatbot audit log failed: ${String(err)}`));
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ChatbotResult {
  reply: string;
  suggestTicket: boolean;
  intent: SupportIntent;
}

export const chatbotService = {
  respond(query: string, sessionId: string, userId?: string): ChatbotResult {
    const session = getSession(sessionId, userId);
    session.messageCount++;

    const normalized = query.toLowerCase().trim();
    const intent = classifyIntent(query);

    const isNegative = detectNegativeSentiment(normalized);
    if (isNegative) {
      session.negativeHits++;
    }

    const faqEntries = DEFAULT_FAQ_ENTRIES;
    const matched = faqEntries.find((entry) =>
      entry.keywords.some((kw) => normalized.includes(kw.toLowerCase())),
    );

    if (matched) {
      session.unresolvedStreak = 0;
      logger.debug(`Chatbot matched: ${matched.keywords[0]}`);

      const suggestTicket = session.negativeHits >= NEGATIVE_THRESHOLD;

      logChatbotEvent({
        action: 'chatbot.message',
        description: query,
        sessionId,
        intent: matched.intent,
        metadata: { messageCount: session.messageCount, matched: matched.id, suggestTicket },
        userId,
      });

      return {
        reply: matched.response + (suggestTicket
          ? '\n\nJe perçois que vous n\'êtes pas satisfait. Souhaitez-vous créer un ticket de support pour qu\'un agent humain vous aide ?'
          : ''),
        suggestTicket,
        intent: matched.intent,
      };
    }

    // No match
    session.unresolvedStreak++;
    const suggestTicket =
      session.unresolvedStreak >= UNRESOLVED_THRESHOLD ||
      session.negativeHits >= NEGATIVE_THRESHOLD;

    logChatbotEvent({
      action: 'chatbot.no_match',
      description: query,
      sessionId,
      intent,
      metadata: { messageCount: session.messageCount, unresolvedStreak: session.unresolvedStreak },
      userId,
    });

    if (suggestTicket) {
      logChatbotEvent({
        action: 'chatbot.escalation',
        description: query,
        sessionId,
        intent,
        metadata: { messageCount: session.messageCount, reason: isNegative ? 'negative_sentiment' : 'unresolved_streak' },
        userId,
      });
    }

    const baseReply =
      session.unresolvedStreak === 1
        ? 'Je n\'ai pas trouvé de réponse précise à votre question. Pouvez-vous reformuler ou préciser votre demande ?'
        : 'Je ne parviens pas à répondre à votre demande.';

    const ticketProposal = suggestTicket
      ? ' Je vous propose de créer un ticket de support pour qu\'un agent de notre équipe vous réponde personnellement.'
      : '';

    return {
      reply: baseReply + ticketProposal,
      suggestTicket,
      intent,
    };
  },

  respondLegacy(query: string): string | null {
    const result = chatbotService.respond(query, 'legacy');
    return result.suggestTicket ? null : result.reply;
  },

  getDefaultFaq(): FaqEntry[] {
    return DEFAULT_FAQ_ENTRIES;
  },
};
