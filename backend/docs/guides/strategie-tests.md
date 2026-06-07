# Stratégie de tests & couverture — Primeo

Date : 2026-06-07

## 1. État actuel (après durcissement)

| Périmètre | Suites | Tests | Couverture (statements) |
|---|---|---|---|
| Backend | 15 | 167 | ~27 % global · **modules critiques 85–100 %** |
| Mobile (logique) | 5 | 55 | ciblée (utils 100 %) |
| Mobile (composants RNTL) | 1 | 4 | parcours KYC/inscription |

## 2. CI bloquante (GitHub Actions)

Les workflows `ci-backend.yml` et `ci-mobile.yml` échouent désormais si :

- ❌ un test unitaire / d'intégration échoue ;
- ❌ le **lint** ESLint renvoie une erreur (les avertissements restent tolérés) ;
- ❌ la **couverture** passe sous les seuils (`coverageThreshold`) ;
- ❌ **`tsc`** signale une erreur de types (build backend / `tsc --noEmit` mobile).

`--passWithNoTests` et `continue-on-error` sur le lint ont été **supprimés**.

## 3. Seuils de couverture (coverageThreshold)

### Backend (`jest.config.js`)
- Plancher **global** bas (point de départ historique ~5 %), à relever par paliers.
- Seuils **dédiés élevés** sur les modules critiques, qui verrouillent leur couverture :
  - `payments/services/genius-pay.service.ts` — 85 %
  - `payments/services/refund.service.ts` — 85 %
  - `payments/payments.service.ts` — 85 %
  - `bookings/services/pricing.service.ts` — 90 %
  - `bookings/services/cancellation.service.ts` — 95 %
  - `subscriptions/subscriptions.service.ts` — 35 %
  - `webhooks/webhooks.service.ts` — 50 %
  - `auth/auth.service.ts` — 55 %

> Jest exclut du bucket « global » les fichiers ayant un seuil dédié ; le plancher
> global porte donc sur le reste du code.

### Mobile (`package.json > jest`)
- Plancher global minimal + seuils dédiés sur les utilitaires testés
  (`auth.utils` 100 %, `normalizeProperty`, `safeJson`).

## 4. Tests ajoutés (modules critiques)

- **Paiements** : `genius-pay.service.spec` (initiate/status/refund/charge),
  `payments.service.spec` (404/403/400/pagination), `refund.service.spec`.
- **Webhooks** : `webhooks.service.spec` (HMAC, anti-rejeu timestamp, nonce, dispatch).
- **Réservations** : `cancellation.service.spec` (paliers 100/50/0 %), `pricing.service.spec`.
- **Abonnements** : `subscriptions.service.spec`.
- **Smoke d'intégration** (Supertest) : `__tests__/smoke.spec.ts` — l'API démarre
  et répond `200` sur `/api/health`.
- **Mobile** : `authUtils.test` (parcours inscription), `FileUploader.test.tsx` (RNTL).

## 5. Smoke test & base de données

`smoke.spec.ts` instancie `createApp()` et vérifie `GET /api/health → 200`.
La vérification de connectivité **base de données** se fait via la commande
`npx prisma migrate status` (exécutée dans un environnement disposant d'un accès
DB — staging/CI avec DATABASE_URL provisionné). En local sandbox sans réseau DB,
ce contrôle est ignoré ; il est réintégré dès qu'une base de test est branchée.

## 6. Feuille de route couverture (objectif 60 %)

| Échéance | Objectif | Modules prioritaires |
|---|---|---|
| Sprint en cours | Verrouiller les modules critiques (fait) | paiements, réservations, webhooks |
| Semaine +1 | `bookings.service`, `availability.service`, `subscriptions` 60 % | réservations, abonnements |
| Semaine +2 | **Global backend ≥ 60 %** ; controllers via Supertest | admin, properties, disputes |
| Continu | Mobile : RNTL sur inscription / recherche / réservation / navigation | parcours utilisateurs |

**Méthode de montée** : à chaque PR touchant un module critique, relever son seuil
dédié de quelques points (effet cliquet). Ne jamais abaisser un seuil sans justification.
