# Audit, mode maintenance & analytics — Guide d'exploitation

Date : 2026-06-11

## 1. Journal d'audit admin

### Ce qui est enregistré
Chaque action sensible d'un administrateur crée une entrée `audit_logs` via le
helper `createAudit()` (`admin.service.ts`) : date, identifiant admin, action
(`kyc.approve`, `user.ban`, `property.reject`, `refund`, `maintenance.enable`…),
description, **avant/après** dans `metadata` quand pertinent, adresse IP,
type + identifiant de la cible. Plus de 25 points d'appel couvrent la
validation KYC, la suspension/bannissement de comptes, la modération
d'annonces, les remboursements, les litiges, la config plateforme et le mode
maintenance.

### Immuabilité (garantie au niveau base)
Migration `20260611000001_audit_immutability_app_events` :
- trigger `audit_logs_immutable` : **tout UPDATE est rejeté** ; **tout DELETE
  est rejeté** sauf s'il provient de la fonction d'archivage (GUC local
  `app.audit_archival`, positionnable uniquement dans sa transaction) ;
- la table d'archive `audit_logs_archive` est protégée par le même trigger ;
- la fonction `archive_old_audit_logs()` est SECURITY DEFINER et **révoquée
  pour anon/authenticated** : seul le backend peut la lancer.

### Rétention & archivage (1 an)
- Le job quotidien `cleanup.job.ts` (02:00) appelle `archive_old_audit_logs()` :
  les entrées de plus d'un an sont **déplacées** vers `audit_logs_archive`
  (jamais supprimées). L'ancienne purge à 6 mois a été retirée.
- L'archive conserve la date d'origine + `archivedAt`.

### Consultation (admins uniquement)
- API : `GET /api/admin/audit-logs` — filtres `action`, `targetType`, `userId`,
  `from`, `to`, pagination ; `format=csv` renvoie l'export CSV.
- Mobile : **Dashboard admin → Journal d'audit** (`AdminAuditLogsScreen`) —
  recherche, filtres rapides par famille d'action, pagination, export CSV via
  la feuille de partage native. Aucune action de modification n'existe.

## 2. Mode maintenance

### Activation
Deux moyens, combinés par OU :
1. **Variable d'environnement** `MAINTENANCE_MODE=true` (Render) — prend effet
   au déploiement ;
2. **À chaud, sans redéploiement** : `PUT /api/admin/maintenance` (admin) :
   ```json
   { "enabled": true, "message": "Mise à jour majeure en cours",
     "estimatedEnd": "2026-06-12T08:00:00Z", "notifyUsers": true }
   ```
   `notifyUsers: true` diffuse une **notification push** à tous les appareils
   abonnés (OneSignal, segment « Subscribed Users ») — à faire de préférence
   AVANT d'activer le mode. Chaque bascule est journalisée dans l'audit.

### Comportement
- Toute l'API renvoie **503** `{ error: "maintenance", message, estimatedEnd }`.
- Routes exemptées : `/`, `/api/health`, `/api/maintenance` (statut public),
  `/api/admin/*` (les admins continuent de travailler), `/api-docs`,
  `/api/webhooks/*` (les PSP rejouent mal les 503 prolongés).
- Le statut est mis en cache 30 s côté middleware (1 lecture DB max/30 s).

### Côté clients
- **Mobile** : vérification au démarrage + intercepteur Axios sur tout 503
  `maintenance` → écran dédié plein écran (`MaintenanceScreen` : illustration,
  message, heure de retour estimée, bouton Réessayer).
- **Vitrine** : `main.js` interroge `/api/maintenance` au chargement et
  redirige vers la page statique `/maintenance/` (auto-recheck 30 s, retour
  automatique à la page d'origine à la fin).

## 3. Analytics

### Choix : first-party respectueux de la vie privée (+ GA4 optionnel)
Les événements clés sont envoyés à l'API Primeo (`POST /api/analytics/events`)
et stockés dans `app_events` **sans aucune donnée personnelle** : ni userId,
ni email, ni IP — uniquement la plateforme, le rôle générique
(client/professional/anonymous), un identifiant de session aléatoire local et
des métadonnées de contenu. Liste blanche d'événements : `signup`, `login`,
`search`, `property_view`, `booking_created`, `payment_success`,
`interest_expressed`, `page_view`.

### Consentement préalable (conformité)
- **Mobile** : bandeau au premier lancement (`AnalyticsConsentBanner`) —
  aucun événement n'est émis tant que l'utilisateur n'a pas accepté
  (`src/services/analytics.ts`, choix persisté).
- **Vitrine** : l'analytics ne démarre que si le cookie
  `primeo_cookie_consent=accepted` existe (bandeau cookies déjà en place).

### Google Analytics 4 (vitrine, optionnel)
Pour activer GA4, ajouter sur les pages (ou dans le template de tête) :
```html
<meta name="ga-measurement-id" content="G-XXXXXXXXXX">
```
`main.js` charge alors gtag **après consentement**, avec `anonymize_ip`,
signaux publicitaires désactivés. Action manuelle : créer la propriété GA4
sur analytics.google.com et y inviter les admins (le tableau de bord GA sert
de dashboard).

### Tableaux de bord
- **Admins** : `GET /api/analytics/events/summary?days=30` — totaux par
  événement + série quotidienne (et GA4 si configuré).
- **Professionnels** (déjà en place, vérifié) : vues (`viewsCount` incrémenté
  à chaque consultation de fiche), réservations, taux d'occupation via
  `/api/analytics/properties|bookings|occupancy` — affichés dans l'écran
  Statistiques du dashboard pro. Correctif au passage : le garde des
  analytics avancés référençait encore les plans `prestige/premium`
  → `business/entreprise`.

## 4. Points de vigilance
- L'export CSV mobile partage le contenu en texte (pas de fichier joint) —
  suffisant pour transfert vers email/drive ; côté web admin, utiliser
  directement `GET /api/admin/audit-logs?format=csv`.
- La diffusion push de maintenance nécessite OneSignal configuré
  (`ONESIGNAL_APP_ID` / `ONESIGNAL_REST_API_KEY`).
- `app_events` est en RLS sans politique (accès service_role uniquement),
  comme le reste du schéma.
