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
      'Pour réserver, recherchez un bien ou un restaurant, sélectionnez vos dates et le nombre de personnes, puis cliquez sur "Réserver". Selon l\'annonce, vous pourrez payer en ligne (totalement ou un acompte de 10 %) ou confirmer sans paiement immédiat.',
  },
  {
    id: 'booking_status',
    keywords: ['statut réservation', 'état réservation', 'où en est', 'ma réservation'],
    intent: 'booking_status',
    category: 'Réservations',
    response:
      'Consultez l\'état de vos réservations dans l\'onglet "Mes réservations". Les statuts possibles : En attente de paiement → Confirmée → Terminée. Si votre réservation est bloquée, contactez le support.',
  },
  {
    id: 'booking_cancel',
    keywords: ['annuler', 'annulation', 'cancel'],
    intent: 'booking_cancel',
    category: 'Réservations',
    response:
      'Pour annuler une réservation : accédez à "Mes réservations", ouvrez la réservation souhaitée et cliquez sur "Annuler". Les conditions de remboursement dépendent du délai avant l\'arrivée prévu.',
  },
  {
    id: 'booking_modify',
    keywords: ['modifier réservation', 'changer date', 'modifier dates'],
    intent: 'booking_cancel',
    category: 'Réservations',
    response:
      'La modification de dates n\'est pas possible directement. Annulez la réservation existante et créez-en une nouvelle avec les bonnes dates. Les frais d\'annulation s\'appliquent.',
  },
  // Payments
  {
    id: 'payment_methods',
    keywords: ['paiement', 'payer', 'comment payer', 'moyens de paiement'],
    intent: 'payment_issue',
    category: 'Paiements',
    response:
      'Primeo accepte les paiements via Genius Pay : Mobile Money Orange Money, MTN Mobile Money, cartes bancaires Visa et Mastercard. Le paiement est sécurisé et crypté.',
  },
  {
    id: 'payment_failed',
    keywords: ['echec paiement', 'paiement refusé', 'transaction échouée', 'payment failed'],
    intent: 'payment_issue',
    category: 'Paiements',
    response:
      'En cas d\'échec de paiement : vérifiez que votre compte Mobile Money est suffisamment approvisionné, ou que votre carte bancaire est valide et non expirée. Réessayez dans quelques minutes. Si le problème persiste, créez un ticket de support.',
  },
  // Refunds
  {
    id: 'refund',
    keywords: ['remboursement', 'remboursé', 'rembourser', 'refund'],
    intent: 'refund_request',
    category: 'Remboursements',
    response:
      'Les remboursements sont traités selon la politique d\'annulation de chaque annonce. Annulation plus de 7 jours avant : 100 % remboursé. Entre 3 et 7 jours : 50 %. Moins de 3 jours : 0 %. Le virement est effectué sous 5 à 10 jours ouvrables.',
  },
  // Account
  {
    id: 'password_reset',
    keywords: ['mot de passe', 'réinitialiser', 'connexion', 'oublié mot de passe'],
    intent: 'account_help',
    category: 'Compte',
    response:
      'Pour réinitialiser votre mot de passe : cliquez sur "Mot de passe oublié" sur l\'écran de connexion, saisissez votre email et suivez le lien reçu. Le lien est valable 2 heures.',
  },
  {
    id: 'register',
    keywords: ['créer compte', 'inscription', 's\'inscrire', 'register'],
    intent: 'account_help',
    category: 'Compte',
    response:
      'Créez votre compte Primeo gratuitement en cliquant sur "S\'inscrire". Fournissez votre email, numéro de téléphone et créez un mot de passe sécurisé. Une vérification OTP par SMS est requise.',
  },
  {
    id: 'kyc',
    keywords: ['kyc', 'vérification', 'documents', 'professionnel'],
    intent: 'account_help',
    category: 'Compte',
    response:
      'La vérification KYC est obligatoire pour les professionnels. Accédez à "Mon profil" → "Vérification KYC" et fournissez : pièce d\'identité (CNI ou passeport), RCCM si applicable, licence touristique pour les hébergements. La vérification prend 24 à 48 heures.',
  },
  // Platform
  {
    id: 'commission',
    keywords: ['commission', 'frais', 'tarif primeo'],
    intent: 'general_inquiry',
    category: 'Plateforme',
    response:
      'Les commissions Primeo varient selon votre plan d\'abonnement : Essentiel (gratuit) : 9 %, Prestige (9 000 FCFA/mois) : 5 %, Premium (24 000 FCFA/mois) : 0 %. Les commissions sont prélevées sur chaque réservation confirmée.',
  },
  {
    id: 'subscription',
    keywords: ['abonnement', 'formule', 'prestige', 'premium', 'essentiel'],
    intent: 'general_inquiry',
    category: 'Plateforme',
    response:
      'Primeo propose 3 plans professionnels : Essentiel (gratuit, 3 annonces, 9 % commission), Prestige (9 000 FCFA/mois, 15 annonces, 5 % commission, 2 boosts), Premium (24 000 FCFA/mois, illimité, 0 % commission, 10 boosts). Le plan Restaurant est également disponible.',
  },
  {
    id: 'boost',
    keywords: ['boost', 'mettre en avant', 'visibilité', 'booster'],
    intent: 'general_inquiry',
    category: 'Plateforme',
    response:
      'Les boosts permettent à votre annonce d\'apparaître en tête des résultats pendant 72h (payant : 2 000 FCFA) ou selon la durée incluse dans votre plan (Prestige : 3j, Premium : 7j). Activez un boost depuis "Mes annonces".',
  },
  {
    id: 'dispute',
    keywords: ['signaler litige', 'problème logement', 'plainte', 'litige'],
    intent: 'general_inquiry',
    category: 'Litiges',
    response:
      'Pour signaler un problème : ouvrez votre réservation concernée et cliquez sur "Signaler un problème". Un litige sera ouvert et notre équipe interviendra sous 24 heures.',
  },
  {
    id: 'review',
    keywords: ['avis', 'noter', 'évaluation', 'review'],
    intent: 'general_inquiry',
    category: 'Avis',
    response:
      'Vous pouvez laisser un avis après chaque séjour terminé. Accédez à "Mes réservations", sélectionnez la réservation terminée et cliquez sur "Laisser un avis". Les avis sont modifiables ou supprimables dans les 7 jours suivant la publication.',
  },
  {
    id: 'referral',
    keywords: ['parrainage', 'code parrainage', 'inviter', 'referral'],
    intent: 'general_inquiry',
    category: 'Parrainage',
    response:
      'Parrainez vos proches et recevez 2 000 FCFA de crédit sur votre portefeuille Primeo dès que votre filleul complète sa première réservation. Votre code de parrainage unique est disponible dans votre profil.',
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
