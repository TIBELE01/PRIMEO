// Rendu des emails transactionnels Primeo — un template par identifiant métier.
// Chaque template compose son corps à partir des composants partagés (layout.ts)
// et renvoie { subject, html }. Le HTML final est envoyé tel quel via l'API Brevo.

import { env } from '../../config/env.config';
import {
  renderEmail,
  heading,
  greeting,
  paragraph,
  button,
  secondaryLink,
  infoCard,
  alertBox,
  codeBlock,
  signature,
  muted,
  type InfoRow,
} from './layout';

// ─── Helpers de formatage ──────────────────────────────────────────────────────

/** Formate un montant : nombre → « 12 000 FCFA », chaîne déjà formatée → telle quelle. */
function fmtMoney(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return `${value.toLocaleString('fr-CI')} FCFA`;
  const str = String(value);
  // Si la chaîne est purement numérique, on la formate ; sinon on la laisse intacte.
  return /^\d+$/.test(str) ? `${Number(str).toLocaleString('fr-CI')} FCFA` : str;
}

/** Référence courte et lisible à partir d'un identifiant (8 premiers caractères). */
function refId(id: unknown): string {
  const str = String(id ?? '');
  return str ? str.slice(0, 8).toUpperCase() : '';
}

/** Étoiles ★ / ☆ à partir d'une note sur 5. */
function stars(rating: unknown): string {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/** Construit une URL applicative absolue (web mobile) à partir d'un chemin. */
function appUrl(path = '/'): string {
  const base = (env.FRONTEND_URL ?? env.PUBLIC_URL ?? 'https://primeo.ci').replace(/\/+$/, '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

// ─── Renderer principal ────────────────────────────────────────────────────────

export interface RenderedTemplate {
  subject: string;
  html: string;
}

export function renderLocalTemplate(
  templateId: number,
  params: Record<string, unknown>,
): RenderedTemplate {
  const p = (key: string, fallback = ''): string => String(params[key] ?? fallback);

  switch (templateId) {
    // ── 1 · Bienvenue client ────────────────────────────────────────────────
    case 1:
      return {
        subject: 'Bienvenue sur Primeo ! 🎉',
        html: renderEmail({
          title: 'Bienvenue sur Primeo',
          accent: 'primary',
          preheader: 'Votre compte Primeo est actif — découvrez des milliers d’annonces.',
          body:
            heading('Bienvenue sur Primeo 🎉') +
            greeting(p('firstName')) +
            paragraph(
              'Votre compte est désormais actif. Découvrez des milliers de résidences, hôtels, restaurants et biens immobiliers, et réservez en toute sécurité partout en Côte d’Ivoire.',
            ) +
            button(appUrl('/'), 'Découvrir Primeo', 'secondary') +
            signature(),
        }),
      };

    // ── 2 · Bienvenue professionnel ─────────────────────────────────────────
    case 2:
      return {
        subject: 'Votre espace professionnel Primeo est activé 🚀',
        html: renderEmail({
          title: 'Espace professionnel activé',
          accent: 'primary',
          preheader: 'Publiez vos annonces et gérez vos réservations depuis votre tableau de bord.',
          body:
            heading('Votre espace pro est activé 🚀') +
            greeting(p('firstName')) +
            paragraph(
              'Bienvenue parmi les professionnels Primeo. Publiez vos annonces, gérez vos réservations et suivez vos performances depuis votre tableau de bord.',
            ) +
            button(appUrl('/'), 'Accéder à mon espace pro', 'secondary') +
            signature(),
        }),
      };

    // ── 3 · Confirmation de réservation (client) ────────────────────────────
    case 3: {
      const isTable = p('mode') === 'table' || !!params['reservationTime'];
      const rows: InfoRow[] = [
        { label: isTable ? 'Établissement' : 'Bien', value: p('propertyTitle') },
        ...(isTable
          ? [{ label: 'Date', value: p('startDate') }]
          : [
              { label: 'Arrivée', value: p('startDate') },
              { label: 'Départ', value: p('endDate') },
            ]),
        { label: 'Heure', value: p('reservationTime') },
        { label: 'Voyageurs', value: p('guests') },
        { label: 'Montant total', value: fmtMoney(params['totalAmount']), highlight: true },
        { label: 'Déjà payé', value: fmtMoney(params['amountPaid']) },
        { label: 'Solde restant', value: fmtMoney(params['balanceDue']) },
        { label: 'Référence', value: refId(params['bookingId']) },
      ];
      return {
        subject: isTable
          ? `Table confirmée — ${p('propertyTitle')}`
          : `Réservation confirmée — ${p('propertyTitle')}`,
        html: renderEmail({
          title: 'Réservation confirmée',
          accent: 'success',
          preheader: 'Votre réservation est confirmée. Retrouvez tous les détails ici.',
          body:
            heading('✅ Votre réservation est confirmée', 'success') +
            greeting(p('firstName')) +
            paragraph(
              isTable
                ? 'Votre table est réservée. Nous avons hâte de vous accueillir !'
                : 'Bonne nouvelle ! Votre réservation est confirmée. Voici le récapitulatif :',
            ) +
            infoCard(rows, { title: 'Détails de la réservation' }) +
            button(p('bookingUrl') || appUrl('/'), 'Voir ma réservation', 'success') +
            (p('invoiceUrl') ? secondaryLink(p('invoiceUrl'), '⤓ Télécharger ma facture') : '') +
            signature(),
        }),
      };
    }

    // ── 4 · Annulation de réservation ───────────────────────────────────────
    case 4: {
      const by =
        p('cancelledBy') === 'client' ? ' à votre demande'
        : p('cancelledBy') === 'professional' ? ' par le responsable'
        : '';
      return {
        subject: `Réservation annulée — ${p('propertyTitle')}`,
        html: renderEmail({
          title: 'Réservation annulée',
          accent: 'danger',
          preheader: 'Votre réservation a été annulée.',
          body:
            heading('Réservation annulée', 'danger') +
            greeting(p('firstName')) +
            paragraph(
              `Votre réservation pour <strong>${p('propertyTitle')}</strong>${p('startDate') ? ` prévue le <strong>${p('startDate')}</strong>` : ''} a été annulée${by}.`,
            ) +
            (p('reason') ? alertBox(`<strong>Motif :</strong> ${p('reason')}`, 'danger') : '') +
            button(appUrl('/'), 'Trouver un autre bien', 'primary') +
            signature(),
        }),
      };
    }

    // ── 5 · Reçu de paiement ────────────────────────────────────────────────
    case 5: {
      const name = p('firstName') || p('name');
      const rows: InfoRow[] = [
        { label: 'Référence', value: refId(params['bookingId']) },
        { label: 'Bien', value: p('propertyTitle') },
        { label: 'Montant payé', value: fmtMoney(params['amount'] ?? params['totalAmount']), highlight: true },
        { label: 'Date', value: p('paymentDate') || new Date().toLocaleDateString('fr-CI') },
      ];
      return {
        subject: 'Reçu de paiement Primeo',
        html: renderEmail({
          title: 'Reçu de paiement',
          accent: 'primary',
          preheader: 'Votre paiement a bien été reçu — voici votre reçu.',
          body:
            heading('💳 Votre reçu de paiement') +
            greeting(name) +
            paragraph('Nous confirmons la bonne réception de votre paiement. Merci de votre confiance.') +
            infoCard(rows, { title: 'Détails du paiement' }) +
            (p('invoiceUrl') ? secondaryLink(p('invoiceUrl'), '⤓ Télécharger la facture PDF') : '') +
            signature(),
        }),
      };
    }

    // ── 6 · KYC approuvé ────────────────────────────────────────────────────
    case 6:
      return {
        subject: 'Votre identité est vérifiée — Compte professionnel validé ✅',
        html: renderEmail({
          title: 'Identité vérifiée',
          accent: 'success',
          preheader: 'Votre vérification d’identité est approuvée.',
          body:
            heading('✅ Votre identité est vérifiée', 'success') +
            greeting(p('name') || p('firstName')) +
            paragraph(
              'Votre vérification d’identité (KYC) a été approuvée. Votre compte professionnel est pleinement actif : vous pouvez publier des annonces et recevoir des paiements.',
            ) +
            button(appUrl('/'), 'Accéder à mon espace pro', 'success') +
            signature(),
        }),
      };

    // ── 7 · KYC rejeté ──────────────────────────────────────────────────────
    case 7:
      return {
        subject: "Vérification d'identité — Action requise",
        html: renderEmail({
          title: 'Vérification d’identité refusée',
          accent: 'danger',
          preheader: 'Votre vérification d’identité n’a pas pu être approuvée.',
          body:
            heading("Vérification d'identité refusée", 'danger') +
            greeting(p('name') || p('firstName')) +
            paragraph("Votre vérification d'identité n'a pas pu être approuvée.") +
            (p('reason') ? alertBox(`<strong>Motif :</strong> ${p('reason')}`, 'danger') : '') +
            paragraph('Vous pouvez soumettre à nouveau vos documents depuis l’application.') +
            button(appUrl('/'), 'Renvoyer mes documents', 'secondary') +
            signature(),
        }),
      };

    // ── 8 · Facture / renouvellement d'abonnement ───────────────────────────
    case 8: {
      const rows: InfoRow[] = [
        { label: 'Formule', value: p('planName') || p('newPlanName') },
        { label: 'Montant prélevé', value: fmtMoney(params['amount']), highlight: true },
        { label: 'Prochain renouvellement', value: p('nextBillingDate') },
      ];
      return {
        subject: `Facture d'abonnement Primeo${p('planName') ? ` — ${p('planName')}` : ''}`,
        html: renderEmail({
          title: 'Facture d’abonnement',
          accent: 'primary',
          preheader: 'Votre abonnement a été renouvelé — voici votre facture.',
          body:
            heading('📄 Votre facture d’abonnement') +
            greeting(p('firstName')) +
            paragraph('Votre abonnement Primeo a été renouvelé avec succès. Voici le récapitulatif :') +
            infoCard(rows, { title: 'Détails de l’abonnement' }) +
            (p('invoiceUrl') ? secondaryLink(p('invoiceUrl'), '⤓ Télécharger la facture') : '') +
            button(appUrl('/'), 'Gérer mon abonnement', 'primary') +
            signature(),
        }),
      };
    }

    // ── 9 · Code OTP ────────────────────────────────────────────────────────
    case 9:
      return {
        subject: 'Votre code de vérification Primeo',
        html: renderEmail({
          title: 'Code de vérification',
          accent: 'primary',
          preheader: 'Votre code de vérification Primeo.',
          body:
            heading('🔐 Votre code de vérification') +
            paragraph('Utilisez le code ci-dessous pour vérifier votre identité :') +
            codeBlock(p('otp') || p('otpCode')) +
            muted('Ce code est valable 5 minutes. Ne le communiquez à personne, même à un agent Primeo.'),
        }),
      };

    // ── 10 · Réinitialisation de mot de passe (rendu par ID) ────────────────
    // Utilisé surtout via sendPasswordResetEmail (mailer.ts) ; ce cas garantit
    // un rendu cohérent et non générique si le template est appelé par ID.
    case 10: {
      const resetUrl = p('resetUrl') || appUrl('/');
      return {
        subject: 'Réinitialisation de votre mot de passe Primeo',
        html: renderEmail({
          title: 'Réinitialisation de mot de passe',
          accent: 'primary',
          preheader: 'Réinitialisez votre mot de passe Primeo.',
          body:
            heading('🔑 Réinitialisation de mot de passe') +
            greeting(p('firstName')) +
            paragraph(
              'Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en créer un nouveau.',
            ) +
            button(resetUrl, 'Réinitialiser mon mot de passe', 'primary') +
            muted("Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe restera inchangé.") +
            signature(),
        }),
      };
    }

    // ── 11 · Récompense de parrainage ───────────────────────────────────────
    case 11: {
      const name = p('firstName') || p('name');
      const reward = fmtMoney(params['rewardAmount'] ?? params['reward'] ?? params['amount']);
      return {
        subject: 'Félicitations — Récompense de parrainage créditée ! 🎉',
        html: renderEmail({
          title: 'Récompense de parrainage',
          accent: 'secondary',
          preheader: 'Votre récompense de parrainage a été créditée.',
          body:
            heading('🎉 Récompense de parrainage', 'secondary') +
            greeting(name) +
            paragraph(
              `Votre filleul${p('refereeName') ? ` <strong>${p('refereeName')}</strong>` : ''} a effectué sa première réservation. ${reward ? `<strong>${reward}</strong> ont été crédités sur votre portefeuille Primeo.` : 'Votre récompense a été créditée sur votre portefeuille Primeo.'}`,
            ) +
            button(appUrl('/'), 'Voir mon portefeuille', 'secondary') +
            signature(),
        }),
      };
    }

    // ── 12 · Nouvelle réservation (professionnel) ───────────────────────────
    case 12: {
      const isTable = p('mode') === 'table' || !!params['reservationTime'];
      const rows: InfoRow[] = [
        { label: 'Client', value: p('clientName') || p('senderName') },
        { label: isTable ? 'Établissement' : 'Bien', value: p('propertyTitle') },
        ...(isTable
          ? [{ label: 'Date', value: p('startDate') }]
          : [
              { label: 'Arrivée', value: p('startDate') },
              { label: 'Départ', value: p('endDate') },
            ]),
        { label: 'Heure', value: p('reservationTime') },
        { label: 'Voyageurs', value: p('guests') },
        { label: 'Montant', value: fmtMoney(params['totalAmount']), highlight: true },
        { label: 'Référence', value: refId(params['bookingId']) },
      ];
      return {
        subject: `Nouvelle réservation — ${p('propertyTitle')}`,
        html: renderEmail({
          title: 'Nouvelle réservation',
          accent: 'primary',
          preheader: 'Vous avez reçu une nouvelle réservation.',
          body:
            heading('📩 Nouvelle réservation reçue') +
            greeting(p('firstName')) +
            paragraph(
              `<strong>${p('clientName') || p('senderName') || 'Un client'}</strong> vient de réserver ${isTable ? 'une table' : 'votre bien'}. Voici les détails :`,
            ) +
            infoCard(rows, { title: 'Détails de la réservation' }) +
            button(p('bookingUrl') || appUrl('/'), 'Gérer la réservation', 'primary') +
            signature(),
        }),
      };
    }

    // ── 13 · Expression d'intérêt — confirmation client ─────────────────────
    case 13:
      return {
        subject: `Votre intérêt a bien été transmis — ${p('propertyTitle')}`,
        html: renderEmail({
          title: 'Intérêt transmis',
          accent: 'primary',
          preheader: 'Votre demande d’intérêt a été transmise au responsable.',
          body:
            heading('Votre intérêt a été transmis ✓') +
            greeting(p('firstName')) +
            paragraph(
              `Votre intérêt pour <strong>${p('propertyTitle')}</strong> a bien été transmis au responsable. Une discussion a été ouverte : vous serez recontacté très prochainement.`,
            ) +
            infoCard([{ label: 'Bien', value: p('propertyTitle') }]) +
            button(appUrl('/'), 'Ouvrir la discussion', 'primary') +
            signature(),
        }),
      };

    // ── 14 · Expression d'intérêt — notification professionnel ──────────────
    case 14: {
      const rows: InfoRow[] = [
        { label: 'Bien', value: p('propertyTitle') },
        { label: 'Intéressé', value: p('senderName') },
        { label: 'Téléphone', value: p('contactPhone') },
        { label: 'Email', value: p('contactEmail') },
      ];
      return {
        subject: `Nouvelle demande d'intérêt — ${p('propertyTitle')}`,
        html: renderEmail({
          title: 'Nouvelle demande d’intérêt',
          accent: 'secondary',
          preheader: 'Un client est intéressé par l’un de vos biens.',
          body:
            heading('🏠 Nouvelle demande d’intérêt', 'secondary') +
            greeting(p('firstName')) +
            paragraph(
              `<strong>${p('senderName') || 'Un client'}</strong> a exprimé son intérêt pour <strong>${p('propertyTitle')}</strong>.`,
            ) +
            infoCard(rows, { title: 'Coordonnées du prospect' }) +
            (p('messagePreview') ? alertBox(`« ${p('messagePreview')} »`, 'secondary') : '') +
            button(appUrl('/'), 'Répondre via la messagerie', 'secondary') +
            signature(),
        }),
      };
    }

    // ── 15 · Nouveau message ────────────────────────────────────────────────
    case 15:
      return {
        subject: `Nouveau message de ${p('senderName') || 'un utilisateur'}`,
        html: renderEmail({
          title: 'Nouveau message',
          accent: 'primary',
          preheader: p('messagePreview') || 'Vous avez reçu un nouveau message.',
          body:
            heading('💬 Vous avez un nouveau message') +
            greeting(p('firstName')) +
            paragraph(`<strong>${p('senderName') || 'Un utilisateur'}</strong> vous a envoyé un message :`) +
            (p('messagePreview') ? alertBox(`« ${p('messagePreview')} »`, 'primary') : '') +
            button(appUrl('/'), 'Lire et répondre', 'primary') +
            signature(),
        }),
      };

    // ── 16 · Rappel de séjour (J-7 / J-1) ───────────────────────────────────
    case 16: {
      const rows: InfoRow[] = [
        { label: 'Bien', value: p('propertyTitle') },
        { label: 'Arrivée', value: p('startDate') },
        { label: 'Départ', value: p('endDate') },
        { label: 'Heure', value: p('reservationTime') },
      ];
      return {
        subject: `Rappel — votre séjour à ${p('propertyTitle')} approche`,
        html: renderEmail({
          title: 'Rappel de séjour',
          accent: 'secondary',
          preheader: 'Votre séjour approche — préparez-vous !',
          body:
            heading('📅 Votre séjour approche !', 'secondary') +
            greeting(p('firstName')) +
            paragraph(
              `Petit rappel : votre réservation à <strong>${p('propertyTitle')}</strong> ${p('daysBefore') === '7' ? 'commence dans une semaine' : 'commence bientôt'}. Nous vous souhaitons un excellent séjour !`,
            ) +
            infoCard(rows, { title: 'Votre réservation' }) +
            button(p('bookingUrl') || appUrl('/'), 'Voir ma réservation', 'secondary') +
            signature(),
        }),
      };
    }

    // ── 17 · Avis reçu (professionnel) ──────────────────────────────────────
    case 17:
      return {
        subject: `Nouvel avis sur ${p('propertyTitle')}`,
        html: renderEmail({
          title: 'Nouvel avis reçu',
          accent: 'primary',
          preheader: 'Vous avez reçu un nouvel avis client.',
          body:
            heading('⭐ Vous avez reçu un nouvel avis') +
            greeting(p('firstName')) +
            paragraph(
              `<strong>${p('senderName') || 'Un client'}</strong> a laissé un avis sur <strong>${p('propertyTitle')}</strong>.`,
            ) +
            (params['rating']
              ? alertBox(
                  `<span style="font-size:22px;letter-spacing:3px;color:#FF6600;">${stars(params['rating'])}</span> &nbsp;<strong>${Number(params['rating'])}/5</strong>`,
                  'secondary',
                )
              : '') +
            (p('comment') ? alertBox(`« ${p('comment')} »`, 'primary') : '') +
            button(appUrl('/'), 'Voir l’avis', 'primary') +
            signature(),
        }),
      };

    // ── 18 · Réponse à un avis (notifie le client) ──────────────────────────
    case 18:
      return {
        subject: `Le professionnel a répondu à votre avis`,
        html: renderEmail({
          title: 'Réponse à votre avis',
          accent: 'primary',
          preheader: 'Le professionnel a répondu à votre avis.',
          body:
            heading('💬 Réponse à votre avis') +
            greeting(p('firstName')) +
            paragraph(
              `Le responsable de <strong>${p('propertyTitle')}</strong> a répondu à l’avis que vous avez laissé.`,
            ) +
            (p('replyText') ? alertBox(`« ${p('replyText')} »`, 'primary') : '') +
            button(appUrl('/'), 'Voir la réponse', 'primary') +
            signature(),
        }),
      };

    // ── 19 · Boost activé ───────────────────────────────────────────────────
    case 19: {
      const rows: InfoRow[] = [
        { label: 'Annonce', value: p('propertyTitle') },
        { label: 'Durée', value: p('duration') },
        { label: 'Expire le', value: p('expiresAt') },
      ];
      return {
        subject: `Boost activé — ${p('propertyTitle')}`,
        html: renderEmail({
          title: 'Boost activé',
          accent: 'success',
          preheader: 'Votre boost est actif — visibilité maximale !',
          body:
            heading('⚡ Votre boost est activé', 'success') +
            greeting(p('firstName')) +
            paragraph(
              `Le boost de votre annonce <strong>${p('propertyTitle')}</strong> est désormais actif. Elle bénéficie d’une visibilité prioritaire dans les résultats.`,
            ) +
            infoCard(rows, { title: 'Détails du boost' }) +
            button(appUrl('/'), 'Voir mon annonce', 'success') +
            signature(),
        }),
      };
    }

    // ── 20 · Boost expirant bientôt ─────────────────────────────────────────
    case 20: {
      const rows: InfoRow[] = [
        { label: 'Annonce', value: p('propertyTitle') },
        { label: 'Expire le', value: p('expiresAt') },
      ];
      return {
        subject: `Votre boost expire bientôt — ${p('propertyTitle')}`,
        html: renderEmail({
          title: 'Boost bientôt expiré',
          accent: 'secondary',
          preheader: 'Votre boost expire dans moins de 24h.',
          body:
            heading('⚡ Votre boost expire bientôt', 'secondary') +
            greeting(p('firstName')) +
            paragraph(
              `Le boost de votre annonce <strong>${p('propertyTitle')}</strong> expire dans moins de 24 heures. Renouvelez-le pour conserver votre visibilité prioritaire.`,
            ) +
            infoCard(rows) +
            button(appUrl('/'), 'Renouveler le boost', 'secondary') +
            signature(),
        }),
      };
    }

    // ── Défaut ──────────────────────────────────────────────────────────────
    default:
      return {
        subject: 'Notification Primeo',
        html: renderEmail({
          title: 'Notification Primeo',
          accent: 'primary',
          body:
            heading('Notification Primeo') +
            paragraph(
              Object.entries(params)
                .filter(([, v]) => v != null && v !== '')
                .map(([k, v]) => `<strong>${k}</strong> : ${String(v)}`)
                .join('<br>') || 'Vous avez une nouvelle notification.',
            ) +
            signature(),
        }),
      };
  }
}
