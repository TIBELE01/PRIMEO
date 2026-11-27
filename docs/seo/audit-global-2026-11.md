# Audit et optimisation globale — écosystème Primeo (26-27 novembre 2026)

Plateformes : application web (`app.primeo.ci`, Expo / React Native Web), vitrine (`primeo.ci`,
site statique + CMS via l'API), admin (`admin.primeo.ci`, Next.js 14), site légal
(`legal.primeo.ci`, site statique). Outils : Playwright (rendu réel, 5 formats d'écran, réseau 3G et
hors ligne), axe-core 4.10 (WCAG 2 A/AA), Firecrawl (liens externes), API Render et Cloudflare.

## 1. Compréhension de l'activité (constat, sans modification)

| Où | Constat |
|---|---|
| Vitrine, accueil | Le titre H1 (« réservez hébergements, hôtels, restaurants et biens immobiliers en Côte d'Ivoire ») est masqué ; le visiteur voit d'abord « L'hébergement d'exception, en toute confiance » puis les 3 autres accroches du carrousel. Le bandeau « Notre mission » ne parle que d'hébergement. Les 4 métiers et les 2 publics (voyageurs, professionnels) n'apparaissent qu'à partir de la section « Solutions ». Aucun bouton d'action dans le premier écran. |
| Application, visiteur | Compréhensible : « Bienvenue — Découvrez les meilleures propriétés », 4 cartes (Résidences, Hôtels, Immobilier, Restaurants), annonces avec prix. Le titre « Choisissez votre expérience : Résidence ou Hôtel » oublie l'immobilier et les restaurants. Les nouvelles annonces affichent « ★ 0.0 ». |
| Application, client connecté | « Bonjour, <prénom> », même contenu ; pas de surcharge. |

## 2-3-5. Titres, méta-descriptions, Open Graph

- 50 pages publiques (22 vitrine, 28 légal) : `<title>` unique (30-60 caractères), méta-description
  unique (150-160 caractères), `canonical`, Open Graph complet (`og:type/site_name/locale/url/title/
  description/image/image:width/height/alt`) et Twitter Card `summary_large_image`.
- Accueil : `home.js` remplaçait le titre et la description par l'accroche du CMS (« Primeo – Primeo, la
  plateforme… », 112 caractères) — supprimé.
- Images de partage : créées pour la documentation et le site légal ; textes non vérifiables retirés
  (« #1 en Côte d'Ivoire », « +1 200 professionnels », « Disponible sur iOS et Android »).
- Application : titre, description et aperçu de partage ; admin : description neutre (déjà en place).
- Vérifié avec les robots de Facebook, LinkedIn, X et WhatsApp : titre et image (200, PNG 1200×630).

## 4. Audit complémentaire

| Plateforme | Problème | Correction |
|---|---|---|
| Vitrine | « 12 000 utilisateurs actifs », « 14 villes », « 30 % d'économies » (À propos) et « 14 villes » (Carrières) figés et contraires aux données réelles (55 propriétés, 6 villes, 18 réservations) | Chiffres lus depuis `/api/website/stats` |
| Vitrine | Année « 2 025 » formatée comme un nombre | Affichée en texte |
| Vitrine | `blog.js` : image de secours `og-home.jpg` inexistante | Chemin corrigé |
| Vitrine, légal | Lien « En savoir plus sur les cookies » vers la politique de confidentialité | Pointe vers `/cookies/` (31 pages) |
| Vitrine | Préférence « réduire les animations » sans effet (valeur CSS invalide `NaNs`) | Réparée |
| Légal | Accueil : « documents mis à jour le 8 juin 2026 » alors que la plupart datent du 17 ou 26 novembre | Texte corrigé |
| Application | Pas de bannière hors connexion sur l'accueil | Bannière existante ajoutée |
| Admin | 375 px : onglets et boutons coupés (Analytiques, Communication, Support, Chatbot, Communauté), 4 tableaux non défilables | Onglets défilables, tableaux défilables, en-têtes repliables |
| Toutes | Accessibilité (axe) : contrastes, lien non souligné, ARIA Téléchargement, champs sans libellé, boutons et liens sans nom (admin), 19 images sans `alt` (app) | Corrigé ; 0 violation sur vitrine, légal et admin |

Vérifié sans problème : 68 liens uniques (56 vers les domaines Primeo, 12 externes), aucun lien cassé ni boucle, liens
institutionnels externes (ARTCI, CCI-CI, OAPI, CEDEAO) ; admin : 60 pages, 1,6 à 3,7 s, aucune erreur
JS ni 5xx, routes protégées ; application : 12 onglets client et pro sans erreur JS ; 3G : interface
en 8 s, annonces en 9,3 s ; hors ligne : pas d'écran blanc, retour automatique.

## 6. Liens internes

Aucun lien interne cassé, aucune boucle de redirection. Liens profonds de l'application : chaque
onglet client et pro s'ouvre par son URL (`/MainTabs/<onglet>/<écran>`).

## 7. Texte alternatif

Sites publics : toutes les images ont un `alt`. Application : `alt=""` par défaut pour les images
décoratives (texte voisin descriptif) ; les images avec `accessibilityLabel` gardent leur libellé.

## 8. Responsive (375×667, 390×844, 768×1024, 1440×900, 1920×1080)

Vitrine et légal : aucun débordement horizontal (les tableaux larges sont dans des conteneurs
défilables). Application : aucun débordement ni élément coupé sur les 12 onglets. Admin : corrigé ci-dessus.

## 9. Images

- Captures de la page Téléchargement : JPG → WebP (-45 %, ex. 119 → 67 Ko).
- Fond du carrousel d'accueil : originaux (156-307 Ko) → `f_auto,q_auto` 1 600 px (900 px sur mobile).
- Logos Cloudinary : PNG → `f_auto` (4,1 → 1,5 Ko) ; logo de pied de page en chargement différé.
- Images Cloudinary venant de l'API (équipe, partenaires…) : redimensionnées automatiquement (800 px).
- Application : photos des cartes servies en 640 px WebP/AVIF au lieu de l'original.

## 10-11-12. GA4, Search Console, sitemaps, robots

- GA4 : code prêt sur la vitrine et le site légal, chargé uniquement après « Accepter » ; IP anonymisée,
  signaux publicitaires désactivés ; événements `open_app`, `contact_click`, `generate_lead`.
  **Inactif tant que l'ID n'est pas renseigné** (variable `GA4_MEASUREMENT_ID` de l'API). Politique
  cookies complétée (mention de Google Analytics 4).
- Application et admin : pas de GA4 (risque de fuite de données internes). Alternative déjà en place :
  événements internes `/api/analytics/events` et tableau de bord Analytiques de l'admin.
- Search Console : aucun enregistrement de vérification Google dans la zone DNS — à faire (§ actions).
- Sitemaps : vitrine 21 URL (page de maintenance noindex retirée, génération automatique au build) ;
  légal 28 URL avec date de mise à jour (`lastmod`) tirée de chaque document.
- robots.txt : légal n'interdit plus `/assets/` (CSS et image d'aperçu) ; application : `Disallow: /`
  (fichier créé, il renvoyait 404) + `noindex` + en-tête `X-Robots-Tag` ; admin : `Disallow: /` +
  `noindex` + `X-Robots-Tag`.

## Tests

Backend 996/996, application 180/180 (+2 tests `listPhotoUrl`), build Next.js de l'admin OK, build de
la vitrine OK (copie de travail), contrôle de types inchangé. Re-tests en production après
déploiement : 49 pages publiques sans anomalie de métadonnées, axe 0 violation (sites publics, admin).

## Actions à réaliser par vous

1. **Google Analytics 4** : créer la propriété (flux Web `primeo.ci`), copier l'ID `G-…` dans Render →
   service API → Environment → `GA4_MEASUREMENT_ID`. Aucune modification de code nécessaire.
2. **Search Console** : ajouter une propriété « Domaine » `primeo.ci` (couvre `legal.primeo.ci`),
   ajouter l'enregistrement TXT fourni par Google dans Cloudflare (ou me le transmettre), puis
   soumettre `https://primeo.ci/sitemap.xml` et `https://legal.primeo.ci/sitemap.xml`.
3. Faire relire par votre juriste l'ajout « Google Analytics 4 » de la politique cookies (version 1.2).
4. Vérifier les chiffres encore saisis à la main : « 12 collaborateurs » et « 4 secteurs » (Carrières),
   « 12 médias partenaires » (Espace presse).
5. Aperçus de partage : en cas d'ancien aperçu en cache, le rafraîchir avec le Sharing Debugger de
   Facebook et le Post Inspector de LinkedIn (connexion requise).
