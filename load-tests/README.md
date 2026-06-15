# Tests de charge (k6)

Tests de performance pour les endpoints les plus sollicités de l'API Primeo.

| Script | Cible | Charge | Seuils |
|---|---|---|---|
| `search.load.js` | `GET /api/properties` (recherche) | 50 req/s pendant 30 s | p95 < 500 ms, erreurs < 1 % |

> Un test plus complet (montée en charge progressive) existe aussi dans `k6/search-load.test.js`.
> Celui-ci (`load-tests/`) est volontairement simple et ciblé sur le SLA demandé.

## Installer k6

```bash
# macOS
brew install k6
# Linux (Debian/Ubuntu)
sudo gpg -k && \
  curl -fsSL https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg && \
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list && \
  sudo apt-get update && sudo apt-get install k6
# Docker (sans installation)
docker run --rm -i grafana/k6 run - < load-tests/search.load.js
```

## Exécuter

```bash
# Contre le backend local (http://localhost:4000)
k6 run load-tests/search.load.js

# Contre un environnement déployé
k6 run --env BASE_URL=https://primeo-api-sszr.onrender.com load-tests/search.load.js
```

Le test échoue (code de sortie ≠ 0) si un seuil n'est pas respecté
(`p95 ≥ 500 ms` ou `erreurs ≥ 1 %`), ce qui permet de l'utiliser en CI.

## Intégration CI (optionnelle, non bloquante pour l'instant)

Un workflow GitHub Actions est déjà prêt : `.github/workflows/load-test.yml`
(déclenchement manuel ou après déploiement staging). Pour ajouter ce test ciblé,
remplacer le chemin du script par `load-tests/search.load.js` ou l'ajouter en step :

```yaml
- name: Test de charge recherche (non bloquant)
  continue-on-error: true
  run: k6 run --env BASE_URL=${{ env.TARGET }} load-tests/search.load.js
```

## Interprétation

- **p95 < 500 ms** : 95 % des recherches répondent en moins de 500 ms.
- **erreurs < 1 %** : moins de 1 % des requêtes renvoient un statut ≠ 200 ou dépassent 500 ms.
- Sur le plan Render gratuit, un *cold start* peut fausser la première exécution :
  lancer un appel de préchauffage avant la mesure, ou tester sur un plan payant.
