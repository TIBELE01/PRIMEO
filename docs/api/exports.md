# Export de données professionnel

Permet à un professionnel (hébergement, hôtel, immobilier, restaurateur) d'exporter
ses données au format **CSV** ou **PDF** pour son propre archivage. La génération est
**asynchrone** : la requête retourne immédiatement, le fichier est généré en arrière-plan,
puis un **email** contenant le lien de téléchargement est envoyé. Le fichier reste aussi
téléchargeable depuis l'application (Paramètres → *Exporter mes données*).

## Types d'export

| Type | Contenu | Plans |
|---|---|---|
| `bookings` | Réservations (client, dates, montants, commission, statut) | Tous |
| `properties` | Annonces (statut, prix, vues, réservations, disponibilité) | Tous |
| `transactions` | Transactions (type, montants, frais, net, statut) | Tous |
| `advanced_stats` | Statistiques avancées (vues, conversion, revenus, taux par bien) | **Business / Entreprise** |

- Période par défaut : **3 derniers mois** (personnalisable via `from`/`to`).
- `properties` exporte toujours l'inventaire complet (pas de filtre temporel).
- Lien de téléchargement valable **7 jours**, puis le fichier est purgé automatiquement
  (cron quotidien de nettoyage) et l'export passe au statut `expired`.
- Limite anti-abus : **10 exports par heure** par compte.

## Endpoints

Tous les endpoints exigent un JWT (`Authorization: Bearer …`) d'un compte professionnel.

### `POST /api/exports`

Lance la génération. Répond `202 Accepted` immédiatement.

```json
// Requête
{
  "type": "bookings",          // bookings | properties | transactions | advanced_stats
  "format": "csv",             // csv (défaut) | pdf
  "from": "2026-03-01T00:00:00Z",  // optionnel
  "to":   "2026-06-01T00:00:00Z"   // optionnel
}

// Réponse 202
{
  "message": "Export en cours de génération. Vous recevrez un email dès qu'il sera prêt.",
  "export": { "id": "…", "status": "pending", … }
}
```

Erreurs : `403` (compte client, ou `advanced_stats` sans plan Business/Entreprise),
`429` (quota horaire dépassé), `400` (période invalide).

### `GET /api/exports`

Liste les 50 derniers exports de l'utilisateur (statut, période, lien, expiration).

### `GET /api/exports/:id`

Détail d'un export (pour suivre `pending → processing → ready | failed`).

### `GET /api/exports/:id/download`

Vérifie la propriété, le statut (`ready`) et l'expiration, puis **redirige (302)**
vers l'URL du fichier. Erreurs : `404` (pas le propriétaire), `409` (pas prêt),
`410` (lien expiré — relancer un export).

## Cycle de vie

```
POST /exports          cron quotidien (02:00)
     │                        │
  pending ── processing ── ready ──(7 jours)── expired (fichier purgé)
                 │
               failed (message dans `error`)
```

À `ready` : upload du fichier sur Cloudinary (dossier `primeo/exports`, ressource `raw`,
URL non devinable) + email Brevo au professionnel avec le lien et sa date d'expiration.

## Utilisation côté mobile

Écran **Paramètres → Exporter mes données** (`mobile/src/screens/pro/Exports/ExportsScreen.tsx`) :
choix du jeu de données et du format, lancement, suivi du statut (rafraîchi toutes les 5 s
tant qu'un export est actif), téléchargement, et verrouillage visuel de `advanced_stats`
pour les plans Starter.

## Implémentation

- Service : `backend/src/modules/exports/exports.service.ts` (génération CSV RFC 4180 avec
  BOM UTF-8 pour Excel ; PDF via PDFKit en paysage).
- Job de purge : intégré au cron `cleanup.job.ts` (`exportsService.purgeExpired()`).
- Modèle : `DataExport` (`data_exports`), migration `20260611000003_add_data_exports`.
- Tests : `exports.service.spec.ts` (gating, quota, cycle de vie, échappement CSV,
  contrôle d'accès, expiration, purge).
