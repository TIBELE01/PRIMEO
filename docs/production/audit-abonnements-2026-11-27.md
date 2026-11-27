# Audit des formules d'abonnement et du renouvellement via Genius Pay — 27/11/2026

## 1. Inventaire des fonctionnalités par formule

| Fonctionnalité | Starter | Business | Entreprise | Contrôle côté serveur | Statut |
|---|---|---|---|---|---|
| 0 % de commission | ✓ | ✓ | ✓ | `COMMISSION_RATES` = 0 | OK |
| Publications 3 / 10 / 40 (resto Entreprise : illimité) | 3 | 10 | 40 | `effectivePublicationLimit` à la publication et à la duplication ; annonces excédentaires suspendues à la rétrogradation | OK (testé en réel) |
| Réservations, calendrier, messagerie, paiements sécurisés | ✓ | ✓ | ✓ | non restreints | OK |
| Synchronisation Google Calendar (flux iCal) | ✓ | ✓ | ✓ | lien d'abonnement public | OK |
| Périodes indisponibles | ✓ | ✓ | ✓ | blocage de dates | OK |
| Support : email 48 h / chat 12 h / VIP 4 h | basse | haute | urgente | priorité du ticket = max(catégorie, formule) | **Corrigé** (ne dépendait pas de la formule) |
| Tableau de bord basique / analytique / avancé | basique | ✓ | ✓ | drapeau `analytics` de la formule active | **Corrigé** (liste figée, ignorait le statut) |
| Vidéos | — | ✓ | ✓ | `videoUpload` vérifié à l'upload | OK |
| Badge Vérifié / Premium | — | Vérifié | Premium | calculé par l'API | **Corrigé** : Premium jamais affiché ; les deux badges absents des cartes de l'accueil |
| Visibilité +30 % / prioritaire | — | +30 % | prioritaire | score de recherche `visibilityBoostPct` | OK |
| Boosts gratuits 2 / 7 par mois | — | 2 | 7 | `freeBoostsPerMonth`, remise à zéro le 1er | OK |
| Visite 3D | — | — | ✓ | `virtualTour` vérifié à l'upload et à l'affichage | OK |
| Multi-utilisateurs | — | — | ✓ | Entreprise active exigée | OK |
| Rapport mensuel PDF | — | — | ✓ | tâche du 1er du mois + envoi admin | **Implémenté** (n'existait pas) |
| Accès bêta | — | ✓ | ✓ | aucune fonctionnalité bêta à ce jour | Déclaratif |
| Programme de fidélité | — | — | ✓ | — | **Non implémenté** |

## 2. Test de rétrogradation (tibeleyeo01, Entreprise, 27 annonces actives)

1. Rétrogradation programmée laissée par un ancien test supprimée.
2. Échéance placée 31 jours dans le passé.
3. Traitement lancé (`POST /admin/subscriptions/run-renewals`) → Starter, vidéo / 3D / multi-utilisateurs / boosts
   désactivés, tableau analytique → 403, 24 annonces masquées (3 restent), formule d'origine mémorisée.
4. Lien de rétablissement Genius Pay (24 000 XOF, Mobile Money et carte) envoyé par email ; page de paiement vérifiée.

## 3. Réactivation via webhook Genius Pay

5. Webhook `payment.success` signé (HMAC) avec la référence du lien ; non signé → 400.
6. En 0,6 s : formule Entreprise rétablie, avantages réactivés, tableau analytique → 200, 27 annonces de nouveau en
   ligne, échéance = paiement + 1 mois.
7. Emails « Votre formule Entreprise est rétablie » et facture ; notifications in-app « Abonnement réactivé »,
   « Abonnement renouvelé ». Push : non vérifiable (aucun appareil de test).

## 4. Codes promo sur les abonnements

Implémenté (API + champ dans l'écran Abonnement). Test sur tibeleyeo03 : code −20 % → Business 9 000 → 7 200 FCFA,
code faux refusé, utilisation comptée, formule activée par webhook ; code à 100 % → activation sans paiement.

## 5. Anomalies corrigées

1. **Critique** — montée en gamme payée jamais appliquée (note « business — proraté… » non reconnue par le webhook).
2. **Critique** — réabonnement après expiration facturé ≈ 300 FCFA (prorata sur une échéance passée).
3. **Élevée** — délai de grâce compté en exécutions de la tâche (faussé par la mise en veille du serveur) ; prélèvement
   automatique inexistant (405) tenté chaque nuit.
4. **Élevée** — réactivation de toutes les annonces suspendues, y compris par la modération.
5. **Élevée** — rattrapage des webhooks perdus limité aux réservations (abonnements exclus).
6. Renouvellement payé sans facture ni notification ; échec de paiement d'abonnement non notifié.
7. Tous les événements d'abonnement envoyaient l'email « Facture d'abonnement ».
8. Badges Premium / Vérifié non affichés ; priorité du support indépendante de la formule ; analytics.
9. Rapport mensuel PDF inexistant.
10. Textes des formules (app + serveur) différents de la grille officielle.
11. Recalcul admin : fausse notification « changement de formule ».

## 6. Restant

- Programme de fidélité : à définir (fonctionnement, récompenses) puis développer — retiré ou conservé dans les textes ?
- Accès bêta : aucune fonctionnalité bêta pour l'instant.
- Business et Entreprise ont le même tableau analytique (pas de niveau « avancé » distinct).
- Les liens de renouvellement envoyés par email n'acceptent pas de code promo (le code s'applique depuis l'app).
- Un même code promo vaut pour les réservations et les abonnements (pas de champ « portée »).
