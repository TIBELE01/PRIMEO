# Alertes Sentry — Configuration

## Vue d'ensemble

Primeo utilise Sentry pour la capture d'erreurs backend (Node.js) et mobile (React Native). Les alertes email sont configurées dans le dashboard Sentry (impossible via code).

## Alertes déjà actives (via code)

| Déclencheur | Canal | Seuil |
|---|---|---|
| Taux d'erreur élevé | Slack + Sentry warning | ≥ 10 erreurs/minute |
| Échec webhook | Sentry error | Toute erreur sur `/webhooks/*` |
| Erreurs Express (500) | Sentry (auto via `setupExpressErrorHandler`) | Toutes |

## Configurer les alertes email dans Sentry

### 1. Alertes d'erreur critiques

1. Connectez-vous à **sentry.io** → Projet **primeo-backend**
2. **Alerts → Create Alert → Issues**
3. Conditions :
   ```
   WHEN: An issue is first seen
   IF:   level is error OR fatal
   THEN: Send an email to [your-team@example.com]
   ```
4. **Alerts → Create Alert → Metric**
5. Pour taux d'erreur > 5 % :
   ```
   Dataset:    Transactions
   Metric:     Failure rate
   Threshold:  Critical > 5%
   Window:     5 minutes
   Action:     Email + Slack (channel: #ops-alerts)
   ```

### 2. Alertes webhook spécifiques

1. **Alerts → Create Alert → Issues**
2. Filter : `tags[alert_type]:webhook_failure`
3. Seuil : **Tout échec** → notifier immédiatement

### 3. Performance — latence search

1. **Alerts → Create Alert → Metric**
2. Dataset : Transactions
3. Filter : `transaction:/api/properties`
4. Métrique : P95 latence > 500 ms → Warning
5. Métrique : P95 latence > 1 500 ms → Critical

## Variables d'environnement requises

```env
# Backend (.env)
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/YYYY

# Mobile (mobile/.env)
EXPO_PUBLIC_SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/ZZZZ
```

> Créez **deux projets distincts** dans Sentry (un Node.js, un React Native) pour isoler les erreurs backend et mobile.

## Vérification de l'intégration

```bash
# Backend — déclencher une erreur test (mode dev uniquement)
curl -X POST https://api.primeo.ci/api/health/sentry-test

# Mobile — vérifier dans Sentry que les sessions sont bien rapportées
# App.tsx: Sentry.nativeCrash() en dev uniquement
```

## Healthcheck Render

L'endpoint `GET /api/health/ready` est configuré comme healthcheck Render (`render.yaml`).

| État | HTTP | Comportement Render |
|---|---|---|
| DB + Redis + Genius Pay + Brevo OK | 200 `{ status: "ok" }` | Service considéré sain |
| Un service dégradé | 200 `{ status: "degraded" }` | Service considéré sain |
| DB ou service critique down | 503 `{ status: "down" }` | Render relance le service |
