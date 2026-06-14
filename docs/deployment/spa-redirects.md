# Routage SPA & 404 — Admin et Vitrine

## Admin (`admin.primeo.ci`)

Fichier : `admin/public/_redirects`

```
/*    /index.html   200
```

Le dashboard admin est une application à page unique (SPA). Cette règle renvoie
`index.html` (HTTP 200) pour toute route afin que le routeur client gère la
navigation profonde (ex: `/admin/properties/123`) sans 404 serveur.

> Note : l'admin tourne en `next start` (`output: standalone`). Next gère
> déjà son propre routage et ses 404 ; le fichier `_redirects` est conservé
> pour les déploiements statiques (Netlify/export) et reste inoffensif sous Next.

## Vitrine (`primeo.ci`)

**Pas de `_redirects`.** La vitrine est un site **multi-pages** (chaque page a
son propre HTML : `/a-propos/`, `/aide/`, `/blog/`…). Une règle
`/* /index.html 200` serait **incorrecte** : elle servirait la page d'accueil à
la place de chaque page manquante au lieu d'un vrai 404.

Le routage et le 404 sont gérés par `render.yaml` :

```yaml
routes:
  - type: rewrite
    source: /404
    destination: /404.html
  # + réécritures /legal/* et redirections 301 des anciennes URLs
```

Render sert automatiquement `Primeo/404.html` (présent à la racine de publication)
pour toute route non résolue. La redirection vers 404 fonctionne donc nativement.

## Vérification

| Site | Test | Résultat attendu |
|------|------|------------------|
| Admin | `GET /admin/route-inexistante` | `index.html` (200), routeur SPA affiche son 404 |
| Vitrine | `GET /page-inexistante` | `404.html` (404) |
| Vitrine | `GET /tarifs` | 301 → `/tarification/` |
| Vitrine | `GET /legal/cgu` | `/legal/cgu.html` (200) |
