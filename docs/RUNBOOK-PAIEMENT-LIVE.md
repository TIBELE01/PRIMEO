# Runbook — Recette paiement Genius Pay en production (bout-en-bout)

Dernière mise à jour : 2026-06-12

Ce document est le mode opératoire de la recette « argent réel » avant mise en
production. **Elle nécessite un opérateur humain** : la page de paiement hébergée
Genius Pay (saisie Mobile Money/carte) et la réception du webhook par le backend
**déployé publiquement** ne peuvent pas être simulées depuis l'environnement de
développement.

## 0. État de préparation du code (vérifié par tests automatisés)

Toute la chaîne applicative est couverte par la suite de tests (27 suites /
280 tests verts) :

| Maillon | Où | Preuve |
|---|---|---|
| Vérification signature HMAC du webhook | `common/utils/webhook-verifier` + `webhooks.router` (raw body préservé) | `webhook-verifier.spec.ts` |
| Paiement réussi → booking `confirmed`, dates bloquées, facture PDF Cloudinary | `webhooks/handlers/genius-pay.handler.ts` (`processSuccessfulPayment`) | `genius-pay.auto-conversation.spec.ts` |
| Notifications email (Brevo) + push (OneSignal) + SMS aux **deux** parties | idem + `notifications.service` | `notifications.service.spec.ts` |
| Conversation auto post-paiement | idem (`messagingService.saveMessage`) | `genius-pay.auto-conversation.spec.ts` |
| Filet anti-webhook-perdu (polling `GET /bookings/:id/payment-status`) | `bookings.service.syncPaymentStatus` + cron `webhook-recovery` (horaire) | revue de code |
| Remboursement partiel/total | `payments/services/refund.service.ts` + admin `POST /disputes/:id/refund` | `refund.service.spec.ts` |
| Idempotence (webhook rejoué) | statut `success` court-circuite le retraitement | `genius-pay.auto-conversation.spec.ts` |

## 1. Pré-requis (une fois)

1. Variables Render (dashboard, PAS dans le dépôt) : `GENIUS_PAY_API_KEY`,
   `GENIUS_PAY_SECRET_API_KEY`, `GENIUS_PAY_API_URL` (**URL live**, pas sandbox),
   `GENIUS_PAY_WEBHOOK_SECRET`.
2. Dashboard Genius Pay : URL de webhook = `https://<backend>/api/webhooks/genius-pay`,
   secret identique à `GENIUS_PAY_WEBHOOK_SECRET`.
3. Templates Brevo n°3/4/5 existants ; OneSignal configuré ; un appareil de test
   avec push token enregistré (sinon la vérif push se fait via le dashboard OneSignal).
4. Un bien actif à petit prix (créer une annonce de test à ~100 FCFA/nuit,
   `full_online`), un compte client de test, le compte pro propriétaire.

## 2. Scénario A — paiement 100 % en ligne

1. **Client (app mobile)** : réserver le bien test, option « 100 % en ligne » →
   la WebView Genius Pay s'ouvre. Payer réellement (montant minimal).
2. **Vérifier (≤ 1 min)** :
   - Logs Render : `Paiement réussi traité : type=client_payment` ; aucun
     `Signature webhook invalide`.
   - `transactions` : statut `success`, `webhookReceived=true`.
   - `bookings` : statut `confirmed`, `invoiceUrl` rempli (ouvrir le PDF Cloudinary).
   - `availabilities` : dates passées à `booked`.
   - `messages` : message auto d'ouverture de conversation présent.
   - Brevo (dashboard → Logs) : 2 emails partis (client + pro) ; `email_logs` en base.
   - OneSignal (dashboard → Delivery) : 2 push ; in-app `notifications` créées.
3. **Si le webhook n'arrive pas** : l'écran de confirmation mobile fait du polling
   (`payment-status`) qui interroge Genius Pay directement et applique le même
   traitement — la réservation doit quand même passer `confirmed`. Vérifier alors
   la config webhook côté Genius Pay.

## 3. Scénario B — remboursement partiel via litige (admin)

1. **Client** : ouvrir un litige sur la réservation du scénario A.
2. **Admin (dashboard)** : Litiges → litige → « Rembourser » avec un montant
   partiel (ex. 50 FCFA).
3. **Vérifier** :
   - Logs : `Remboursement effectué : transaction=… montant=… ref=…`.
   - `transactions` : l'originale passe `refunded` + nouvelle ligne `refund` `success`.
   - Genius Pay dashboard : remboursement visible.
   - Si le payout pro a déjà eu lieu (cron 05:00), noter que le remboursement
     est postérieur : ajuster manuellement le wallet pro si nécessaire (cas
     limite documenté — le cron exclut les réservations remboursées *avant*
     reversement).

## 4. Critères de réussite / échec

- ✅ Réussite : tous les points de §2.2 et §3.3 cochés sans intervention manuelle.
- ❌ Échec typique 1 — `Signature webhook invalide` : secret webhook différent
  entre Render et Genius Pay.
- ❌ Échec typique 2 — emails absents : template Brevo manquant (créer les
  templates n°3/4/5, sources versionnées dans
  `backend/src/modules/notifications/templates/`).
- ❌ Échec typique 3 — push absents : `EAS_PROJECT_ID` vide / token jamais
  enregistré (`push_tokens` vide).

Consigner chaque étape (succès/échec + extrait de log) dans ce fichier à la
date de la recette.

## 5. Journal des recettes

| Date | Opérateur | Scénario | Résultat | Notes |
|---|---|---|---|---|
| _à compléter_ | | A + B | | |
