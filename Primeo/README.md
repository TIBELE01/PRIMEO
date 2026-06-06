# Primeo — Site vitrine

Site vitrine statique de Primeo (HTML / CSS / JavaScript, sans build step).
Chaque page charge son contenu dynamiquement depuis le backend Primeo, avec un
repli (fallback) sur des fichiers JSON locaux si l'API est indisponible.

- **Production vitrine** : https://primeo.ci · (Render : https://primeo-vitrine.onrender.com)
- **Backend API** : https://primeo-api.onrender.com
- **Admin** : https://primeo-admin.onrender.com

---

## 1. Lancer le site en local

Le site est 100 % statique : aucun `npm install`, aucun bundler. Il suffit de le
servir avec n'importe quel serveur HTTP statique (un simple `file://` ne
fonctionne pas car `fetch()` sur les templates/JSON est bloqué par CORS).

```bash
# Depuis le dossier Primeo/
npx serve .
# ou
python3 -m http.server 3000
```

Puis ouvrir http://localhost:3000.

> Les en-têtes/pieds de page sont injectés via `templates/header.html` et
> `templates/footer.html` par `assets/js/main.js`. Ils nécessitent donc un
> serveur HTTP (pas d'ouverture directe du fichier).

---

## 2. Configuration de l'URL du backend

L'URL de l'API est résolue par `assets/js/api.js` (et chaque script de page)
dans cet ordre de priorité :

1. **Balise meta** dans le `<head>` de la page :
   ```html
   <meta name="api-url" content="https://primeo-api.onrender.com">
   ```
2. **Variable globale** `window.PRIMEO_API_URL` (ex. injectée par un
   `assets/js/config.js` généré au build — voir ci-dessous).
3. **Valeur par défaut** : `https://primeo-api.onrender.com`.

### Générer un `config.js` au build (optionnel)

Pour piloter l'URL via une variable d'environnement de build sur Render, on peut
générer un petit fichier `assets/js/config.js` et l'inclure avant `api.js` :

```bash
# Build command (Static Site Render)
echo "window.PRIMEO_API_URL='${API_BASE_URL:-https://primeo-api.onrender.com}';" > assets/js/config.js
```

```html
<!-- à placer juste avant api.js si on utilise config.js -->
<script src="assets/js/config.js"></script>
```

En pratique, la balise `<meta name="api-url">` suffit et est déjà présente sur
toutes les pages dynamiques.

---

## 3. Variables d'environnement (front)

| Variable            | Où                         | Rôle                                                        |
|---------------------|----------------------------|-------------------------------------------------------------|
| `API_BASE_URL`      | build → `config.js` (opt.) | URL du backend. Défaut : `https://primeo-api.onrender.com`. |
| Clé **Geoapify**    | **côté backend**           | Servie au front via `GET /api/website/public-config` (`geoapifyKey`). N'est **jamais** stockée en clair dans le front. |

La page **Contact** récupère la clé Geoapify via `public-config` pour afficher la
carte statique. Si la clé est absente, elle bascule automatiquement sur un
embed OpenStreetMap (aucune clé requise).

---

## 4. Fallback JSON

Si un appel API échoue (réseau, backend en veille sur Render, etc.), les pages
se replient sur des fichiers JSON situés dans `data/` :

| Fichier             | Page          |
|---------------------|---------------|
| `data/home.json`    | Accueil       |
| `data/solutions.json` | Solutions   |
| `data/produits.json`  | Produits    |
| `data/a-propos.json`  | À propos    |
| `data/blog.json`      | Blog        |
| `data/jobs.json`      | Carrières   |
| `data/faq.json`       | Centre d'aide |

### Régénérer les fallbacks depuis l'API

Les fichiers JSON sont une photographie du contenu courant. Pour les rafraîchir,
on interroge le backend et on enregistre la réponse, par ex. :

```bash
BASE=https://primeo-api.onrender.com
curl -s $BASE/api/website/solutions/blocs   > data/_blocs.json
curl -s $BASE/api/website/products/subscriptions > data/_subs.json
# …puis recomposer les fichiers data/*.json selon la structure attendue par chaque page.
```

> Astuce : ouvrir une page en laissant l'API répondre, copier l'objet rendu
> depuis la console, est souvent le plus simple pour garder la structure exacte.

---

## 5. Structure

```
Primeo/
├── index.html              Accueil
├── solutions/              Nos solutions
├── produits/               Nos produits
├── tarification/           Tarification
├── a-propos/               À propos
├── carrieres/              Carrières
├── contact/                Contact (+ merci.html)
├── blog/                   Blog (liste + article.html)
├── aide/                   Centre d'aide
├── documentation/          Guides
├── communaute/             Forum communautaire
├── espace-presse/          Espace presse
├── devenir-partenaire/     Formulaire partenaire
├── engagement/             Engagement RSE
├── telechargement/         Téléchargement de l'app
├── legal/                  Pages légales (.html)
├── templates/              header.html, footer.html (injectés au runtime)
├── data/                   Fallbacks JSON
├── assets/css/             Styles (style.css global + 1 par page)
└── assets/js/              api.js (client), main.js (header/footer/nav), 1 par page
```

---

## 6. Déploiement (Render — Static Site)

- **Publish directory** : `Primeo/`
- **Build command** : aucune (ou la génération `config.js` ci-dessus)
- Le backend doit autoriser l'origine de la vitrine via `CORS_ORIGINS`
  (déjà inclus par défaut : `https://primeo.ci`, `https://www.primeo.ci`,
  `*.onrender.com`).

Voir [`API.md`](./API.md) pour la liste des endpoints publics consommés.
