# Vérification de la communication entre les services — avant mise en production (27/11/2026)

Méthode : tests réels en production (API, Playwright, Firecrawl), base via MCP Supabase, Render,
Brevo, Genius Pay (API marchand), OneSignal, Upstash, Sentry, Cloudflare, Gmail (réception des
e-mails sur des alias `support.primeo+…@gmail.com`). Comptes de contrôle créés :
`support.primeo+controle@gmail.com` (client) et `support.primeo+pro@gmail.com` (professionnel).

## A. Résumé

**Préparation estimée : 85 %. Prêt avec réserves.**

> Mise à jour du 27/11 : builds Render débloqués. API, app et admin sont en ligne en `2796345`,
> qui contient toutes les corrections ci-dessous et les 3 améliorations du § F (KYC privés,
> newsletter vers Brevo, annonces non publiées masquées).

Corrigés pendant la vérification (bloquants pour l'encaissement ou la sécurité) :

| # | Gravité | Anomalie | Correction | Vérifié |
|---|---|---|---|---|
| 1 | Critique | Webhook Genius Pay enregistré vers `https://tibele.onrender.com` (0 livraison) | URL mise à jour vers `https://api.primeo.ci/api/webhooks/genius-pay` (API Genius Pay) | Webhook de test Genius Pay → 200 `received:true`, journal « webhook de test reçu et vérifié » |
| 2 | Critique | Signature attendue au mauvais format (`X-Genius-Signature`, HMAC du corps) | Format officiel : `X-Webhook-Signature` = HMAC(`X-Webhook-Timestamp`.payload), ancien format accepté | Idem + webhook signé simulé → réservation confirmée ; non signé → 400 |
| 3 | Critique | Rattrapage horaire : statut `completed` non reconnu | `completed` reconnu | Tests unitaires |
| 4 | Élevée | Rattrapage : délai 8 s dépassé à chaque passage depuis Render | 25 s pour la tâche (8 s pour l'écran client) | Tests unitaires — **non déployé** |
| 5 | Critique | Prélèvement mensuel `POST /payments/charge` inexistant (405) → tous les abonnements payants rétrogradés | Lien de paiement envoyé à l'échéance ; payé, le webhook prolonge d'un mois | Tests unitaires — **non déployé** ; 4 abonnements Entreprise échus le 16/12 |
| 6 | Critique (sécurité) | Clé secrète **live** Genius Pay en clair dans les journaux Render (erreurs axios journalisées en entier) | Masquage des secrets dans le logger et avant envoi à Sentry | Tests unitaires — **non déployé** |
| 7 | Moyenne | Redirection après paiement : paramètres non documentés | `success_url` / `error_url` ; l'app ouvre le détail de la réservation | Paiement Genius Pay : `success_url` présent |
| 8 | Moyenne | Base injoignable → 500 « Database error » | 503 + `Retry-After` ; l'app réessaie une fois les lectures | Tests unitaires |
| 9 | Faible | Liens profonds de l'app sur l'ancienne adresse Render | `https://app.primeo.ci` (ancienne acceptée) | Contrôle de types |
| 10 | Faible | Annonce publique « Annonce de contrôle modifiée » (compte hôtelier de test) | Suspendue (réversible) | Absente de la recherche |

## B. Détail par catégorie

**Backend ↔ base : OK.**
- Santé : base 50 ms, Redis 36 ms, Genius Pay et Brevo OK.
- Migrations : 51/51 appliquées, aucune en attente.
- CRUD vérifié sur comptes, annonces, réservations, commandes et codes promo (création, lecture, modification, annulation ou suspension).
- Orphelins : 3 réservations annulées pointent vers un code promo supprimé, sans effet. 0 compte sans Auth Supabase, 0 compte Auth orphelin.
- Temps mesurés depuis le bac à sable, réseau d'environ 220 ms compris :
  - recherche : 315 à 350 ms ;
  - fiche : 468 ms ;
  - mes réservations : 406 ms ;
  - conversations : 586 ms.

**App ↔ API : OK.**
- URL de base : `EXPO_PUBLIC_API_URL=https://api.primeo.ci` ; CORS limité à la liste blanche.
- Authentification, 15 contrôles sur 16 : inscription client sans OTP, connexion, rafraîchissement, 2FA (activation, connexion à deux facteurs, désactivation), déconnexion avec jeton révoqué.
- L'ancien refresh token reste réutilisable (réglage Supabase, voir § E).
- Réservation → URL de checkout → webhook signé → confirmée, facture et e-mails reçus.
- Conversation pré-remplie ; Socket.io en temps réel (190 ms) ; notifications in-app côté client et côté pro.

**Admin ↔ API : OK.**
- Lecture et validation KYC ; modération (en attente → active) ; code promo ; configuration ; CMS (modification visible sur le site public, puis rétablie).
- Export CSV des journaux ; envoi groupé (confirmation obligatoire, ciblage d'un destinataire) ; litige et remboursement.
- Genius Pay est bien appelé lors du remboursement ; il refuse (409) car le paiement de contrôle n'a pas été réellement encaissé.

**Vitrine ↔ API : OK.**
- Formulaires contact, newsletter, partenariat et candidature (avec CV) : réponse 201 et accusés de réception reçus.
- Chiffres réels issus de l'API. Boîtes internes : livraisons Brevo confirmées vers contact@, recrutement@, partenariat@ et dpo@.
- La newsletter alimente la liste Brevo « Newsletter Primeo » (inscription, désinscription, suppression).

**Site légal : OK.**
- Lien « Retour au site principal », 9 liens du pied de page de la vitrine, 15 liens de l'application : tous en 200.
- Lien cookies vers `/cookies/`.
- Parrainage cohérent (250 / 1 000 FCFA) entre API, app et site légal.

## C. Intégrations tierces

| Intégration | Test | Résultat | Détails |
|---|---|---|---|
| Genius Pay | Initiation, checkout, webhook, remboursement, clés | ✅ après correction | Clés live côté serveur seulement ; webhook réel vérifié ; remboursement appelé (409 attendu) ; aucun paiement réel encaissé pour l'instant |
| Brevo | Envoi, expéditeurs, domaine, webhook | ✅ | Domaine authentifié, 9 expéditeurs actifs ; 3 erreurs du 26/11 antérieures à l'authentification ; statuts « délivré » et « ouvert » reçus par webhook |
| SMS (Norasend) | OTP, alertes | ⚠️ Non vérifié | `sms_logs` vide : aucun SMS jamais envoyé ; OTP désormais par e-mail ; test avec un vrai numéro requis |
| OneSignal | Jetons, envoi | ⚠️ Non vérifié | Application configurée ; 0 appareil enregistré, 0 envoi : test sur téléphone requis ; `ONESIGNAL_WEBHOOK_SECRET` absent |
| Cloudinary | Upload, transformations, accès | ✅ | Upload KYC, WebP/AVIF ; documents KYC privés (liens signés 1 h) |
| Geoapify | Géocodage | ✅ | Annonce créée géocodée ; 56/56 annonces actives géocodées |
| Upstash Redis | Cache, limitation, idempotence | ✅ | Taux de change en cache, clés d'idempotence, compteurs par IP |
| Sentry | Capture, filtrage | ✅ | Erreur 502 de test remontée ; 4xx filtrées, sauf webhooks (alerte de sécurité voulue) |

## D. Flux métier

| Flux | Résultat | Blocage | Action |
|---|---|---|---|
| Réservation client (hébergement) | ✅ | — | — |
| Paiement (initiation → webhook → facture) | ✅ simulé | Aucun paiement réel testé | Payer 200 FCFA en réel |
| Restaurant (menu, commande, table) | ✅ | La commande n'ouvre pas de conversation (messagerie liée aux réservations) | — |
| Professionnel (OTP e-mail, KYC, annonce, modération) | ✅ | — | — |
| Réservation reçue par le pro | ✅ | Réservation instantanée (pas d'étape d'acceptation) | — |
| Abonnement | ✅ après correction | Prélèvement automatique impossible | Renouvellement par lien |
| Litige et remboursement | ✅ appel effectué | Non vérifié sur un vrai paiement | Tester après le paiement réel |
| Notifications e-mail et in-app | ✅ | — | — |
| Notifications push et SMS | ⚠️ | Aucun appareil ni numéro de test | Tester sur téléphone |

## E. Points restants (intervention de votre part)

Réglés depuis : redéploiement ; variables `CORS_ORIGIN` et `COOKIE_DOMAIN` supprimées ; documents
KYC privés (2 existants migrés : URL brute → 401, lien signé admin → 200) ; newsletter synchronisée
(liste Brevo « Newsletter Primeo », 7/7 contacts) ; fiche d'une annonce non publiée → 404 pour un
visiteur, 200 pour l'admin ; données de contrôle supprimées (2 comptes, 2 annonces, 3 réservations,
1 commande, 1 litige, 5 transactions dont le portefeuille fictif, 5 messages, CTRLPROD27, l'envoi
groupé, les entrées vitrine, le document KYC Cloudinary). Code promo **PREMIERE90** créé (90 %,
2 utilisations, valable jusqu'au 04/12/2026).

1. **Changer la clé secrète Genius Pay** (dashboard Genius Pay → Paramètres → API), puis mettre à
   jour `GENIUS_PAY_SECRET_API_KEY` sur Render.
2. **Faire un vrai paiement** avec PREMIERE90 (paiement intégral en ligne ; montant payé ≥ 200 FCFA).
3. Activer la 2FA du super-admin (Admin → Configuration → Sécurité du compte).
4. Supabase → Authentication → Sessions (ou Attack Protection) : activer « Detect and revoke
   potentially compromised refresh tokens », intervalle de réutilisation 10 s. Non modifiable par
   SQL ni par le MCP ; jeton d'accès non fourni.
5. Tester le push et le SMS sur un téléphone ; renseigner `ONESIGNAL_WEBHOOK_SECRET` si besoin.
6. Les 2 paiements Genius Pay en attente (MTX-WLDGKSQHRM, MTX-NOR51OLQCJ) expireront d'eux-mêmes.

## F. Recommandations

- **Avant l'ouverture :** points 1, 2 et 3 du § E.
- **Après l'ouverture :** push et SMS sur appareil réel.
- **À surveiller :**
  - journaux Render « Webhook recovery » ;
  - Sentry (webhooks) ;
  - événements Brevo (rebonds) ;
  - première échéance d'abonnement payant (16/12).

## G. Conclusion

**Prêt avec réserves.** Les communications entre les services sont opérationnelles et les blocages
d'encaissement sont corrigés. Il reste à changer la clé Genius Pay exposée et à valider un paiement réel.
