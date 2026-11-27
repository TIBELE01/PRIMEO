# Vérification de la communication entre les services — avant mise en production (27/11/2026)

Méthode : tests réels en production (API, Playwright, Firecrawl), base via MCP Supabase, Render,
Brevo, Genius Pay (API marchand), OneSignal, Upstash, Sentry, Cloudflare, Gmail (réception des
e-mails sur des alias `support.primeo+…@gmail.com`). Comptes de contrôle créés :
`support.primeo+controle@gmail.com` (client) et `support.primeo+pro@gmail.com` (professionnel).

## A. Résumé

**Préparation estimée : 85 %. Prêt avec réserves.**

> ⚠️ **Builds Render bloqués** : l'espace de travail a épuisé ses minutes de build. La version en
> ligne de l'API et de l'app est `e4e1261` (corrections 1, 2, 3, 7, 8). Les corrections 4, 5, 6 et la
> redirection vers le détail de la réservation (commits `0fd9a8e`, `0b77e71`, `b230476`) sont
> poussées sur `main` mais **pas encore déployées**.

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
- La newsletter n'alimente pas Brevo : les abonnés sont en base, exportables en CSV.

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
| Cloudinary | Upload, transformations, accès | ✅ | Upload KYC, WebP/AVIF ; ⚠️ documents KYC publics par URL |
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

0. **Débloquer les builds Render** (Workspace → Settings → Build pipeline : augmenter la limite ou le forfait), puis relancer le déploiement de l'API et de l'app : 3 correctifs en attente.
1. **Changer la clé secrète Genius Pay** (dashboard Genius Pay → Paramètres → API), puis mettre à jour `GENIUS_PAY_SECRET_API_KEY` sur Render : elle figurait dans les journaux.
2. **Faire un vrai paiement de 200 FCFA** pour valider le circuit complet en conditions réelles.
3. Activer la 2FA du super-admin (Admin → Configuration → Sécurité du compte).
4. Supabase → Authentication → activer la détection des refresh tokens compromis (réutilisation).
5. Tester le push et le SMS sur un téléphone ; renseigner `ONESIGNAL_WEBHOOK_SECRET` si les webhooks OneSignal sont utilisés.
6. Nettoyer les variables obsolètes de l'API sur Render : `CORS_ORIGIN` et `COOKIE_DOMAIN` (`.onrender.com`), non utilisées.
7. Décider de la synchronisation newsletter → Brevo, et du passage des documents KYC en accès privé.
8. Données de contrôle à supprimer quand vous le souhaitez (je n'ai rien supprimé) :
   - les 2 comptes de contrôle ;
   - les 2 annonces suspendues ;
   - le code promo CTRLPROD27 (inactif) ;
   - 2 500 FCFA fictifs sur le portefeuille du client de contrôle ;
   - 2 paiements Genius Pay en attente (MTX-WLDGKSQHRM, MTX-NOR51OLQCJ), qui expireront d'eux-mêmes.

## F. Recommandations

- **Avant l'ouverture :** points 1, 2 et 3 du § E.
- **Après l'ouverture :**
  - push et SMS sur appareil réel ;
  - documents KYC privés ;
  - synchronisation Brevo de la newsletter ;
  - fiche d'une annonce en attente ou suspendue masquée aux visiteurs (aujourd'hui accessible par son identifiant).
- **À surveiller :**
  - journaux Render « Webhook recovery » ;
  - Sentry (webhooks) ;
  - événements Brevo (rebonds) ;
  - première échéance d'abonnement payant (16/12).

## G. Conclusion

**Prêt avec réserves.** Les communications entre les services sont opérationnelles et les blocages
d'encaissement sont corrigés. Il reste à changer la clé Genius Pay exposée et à valider un paiement réel.
