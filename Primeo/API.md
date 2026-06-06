# API publique Primeo — endpoints consommés par le site vitrine

Base URL (production) : `https://primeo-api.onrender.com`
Toutes les routes publiques sont préfixées par `/api/website`.

Réponses : JSON. Les routes `GET` renvoient le contenu géré depuis l'admin
(`https://primeo-admin.onrender.com`). Les routes d'écriture publiques sont
limitées en débit (rate limiting) et protégées par un honeypot côté formulaire.

> Les routes d'administration (`/api/website/admin/*`, méthodes `PUT/POST/DELETE`)
> exigent un JWT Supabase avec le rôle `admin` (`Authorization: Bearer <token>`)
> et ne sont **pas** appelées par le site vitrine.

---

## Accueil

| Méthode | Endpoint                                  | Description                         |
|---------|-------------------------------------------|-------------------------------------|
| GET     | `/api/website/home/hero`                  | Titre, sous-titre, bouton, image    |
| GET     | `/api/website/home/mission`               | Phrase de mission                   |
| GET     | `/api/website/home/solutions_preview`     | Cartes solutions (accueil)          |
| GET     | `/api/website/home/products_preview`      | Cartes produits (accueil)           |
| GET     | `/api/website/home/why`                   | Cartes « Pourquoi Primeo »          |
| GET     | `/api/website/home/testimonials`          | Témoignages clients                 |
| GET     | `/api/website/stats`                      | Statistiques publiques (compteurs)  |

## Configuration publique

| Méthode | Endpoint                       | Description                                  |
|---------|--------------------------------|----------------------------------------------|
| GET     | `/api/website/public-config`   | `{ geoapifyKey }` pour la carte de contact   |

## Solutions

| Méthode | Endpoint                          | Description                  |
|---------|-----------------------------------|------------------------------|
| GET     | `/api/website/solutions/intro`    | Titre + sous-texte           |
| GET     | `/api/website/solutions/blocs`    | Blocs accordéon (4 profils)  |

## Produits

| Méthode | Endpoint                                | Description                       |
|---------|-----------------------------------------|-----------------------------------|
| GET     | `/api/website/products/intro`           | Intro de la page                  |
| GET     | `/api/website/products/subscriptions`   | Plans + tableau comparatif        |
| GET     | `/api/website/products/boost`           | Section Boost                     |
| GET     | `/api/website/products/ads`             | Section Publicités                |
| GET     | `/api/website/products/data`            | Data packs                        |
| GET     | `/api/website/products/upcoming`        | Produits à venir                  |

## À propos

| Méthode | Endpoint                          | Description          |
|---------|-----------------------------------|----------------------|
| GET     | `/api/website/about/history`      | Histoire             |
| GET     | `/api/website/about/mission`      | Mission              |
| GET     | `/api/website/about/values`       | Valeurs              |
| GET     | `/api/website/about/team`         | Équipe fondatrice    |
| GET     | `/api/website/about/partners`     | Partenaires          |

## Carrières

| Méthode | Endpoint                                   | Description                               |
|---------|--------------------------------------------|-------------------------------------------|
| GET     | `/api/website/careers/presentation`        | Texte de présentation                     |
| GET     | `/api/website/careers/team`                | Photo + texte équipe                      |
| GET     | `/api/website/careers/values`              | Valeurs                                   |
| GET     | `/api/website/careers/benefits`            | Avantages                                 |
| GET     | `/api/website/careers/faq`                 | FAQ carrières                             |
| GET     | `/api/website/careers/jobs`                | Liste des offres                          |
| GET     | `/api/website/careers/jobs/:id`            | Détail d'une offre                        |
| POST    | `/api/website/careers/spontaneous`         | Candidature spontanée (multipart, CV) — *rate limit 3/h* |

## Blog

| Méthode | Endpoint                                          | Description                  |
|---------|---------------------------------------------------|------------------------------|
| GET     | `/api/website/blog/categories`                    | Catégories                   |
| GET     | `/api/website/blog/posts`                         | Articles (query : `limit`, `status`, `category`, `page`) |
| GET     | `/api/website/blog/posts/:slug`                   | Article par slug             |
| GET     | `/api/website/blog/posts/:slug/related`           | Articles liés                |
| POST    | `/api/website/blog/subscribe`                     | Inscription newsletter       |
| POST    | `/api/website/blog/posts/:postId/comments`        | Déposer un commentaire       |

## Centre d'aide

| Méthode | Endpoint               | Description          |
|---------|------------------------|----------------------|
| GET     | `/api/website/faq`     | FAQ par catégories   |

## Contact

| Méthode | Endpoint                   | Description                                   |
|---------|----------------------------|-----------------------------------------------|
| POST    | `/api/website/contact`     | Envoi du formulaire de contact — *rate limit 5/h* |

Corps : `{ name, email, phone?, subject, message }`.

## Devenir partenaire

| Méthode | Endpoint                       | Description                                  |
|---------|--------------------------------|----------------------------------------------|
| POST    | `/api/website/partnership`     | Demande de partenariat — *rate limit 3/h*    |

## Communauté (forum anonyme)

| Méthode | Endpoint                                              | Description                          |
|---------|------------------------------------------------------|--------------------------------------|
| GET     | `/api/website/community/posts`                       | Fil des publications (query : `page`, `limit`, `challengeId`) |
| GET     | `/api/website/community/challenges`                  | Challenges actifs                    |
| GET     | `/api/website/community/comments/:postId`            | Commentaires d'une publication       |
| POST    | `/api/website/community/posts`                       | Publier — *rate limit 5/h*           |
| POST    | `/api/website/community/posts/:postId/comments`      | Commenter — *rate limit 20/h*        |
| POST    | `/api/website/community/posts/:postId/like`          | Liker (`{ anonymousId }`)            |
| POST    | `/api/website/community/report`                      | Signaler (`{ targetType, targetId, reason }`) |

---

## CORS

Le backend autorise par défaut les origines : `https://primeo.ci`,
`https://www.primeo.ci`, `*.onrender.com`, `*.netlify.app`, `*.vercel.app` et
les hôtes localhost de développement. La liste est surchargeable via la variable
d'environnement `CORS_ORIGINS` (valeurs séparées par des virgules, wildcards
`*.domaine.tld` supportés).
