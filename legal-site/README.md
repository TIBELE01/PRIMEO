# PRIMEO Legal Site

Static HTML/CSS site hosting all legal documents for the PRIMEO platform, served at **legal.primeo.ci**.

## What this site is

A standalone, dependency-free static site that centralises every legal document required by PRIMEO:
CGU, CGV, privacy policies, terms for professionals, RGPD charter, API conditions, community charter,
mediation, intellectual property, and more. It is intentionally kept as plain HTML/CSS/JS so it can be
deployed anywhere without a build step and loads instantly even on slow connections.

## Running locally

Open `index.html` directly in your browser, or serve the folder with Python's built-in server for
proper relative-path resolution:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Directory structure (20 pages)

```
legal-site/
├── index.html                        # Home — all 20 documents listed
├── _redirects                        # Render/Netlify redirect rules
├── 404.html                          # Custom 404 page
├── assets/
│   ├── css/style.css
│   └── js/cookies.js
│
├── cgu/index.html                    # Conditions Générales d'Utilisation
├── conditions-vente/index.html       # Conditions Générales de Vente (CGV)
├── confidentialite/index.html        # Politique de confidentialité
├── mentions-legales/index.html       # Mentions légales
├── professionnels/index.html         # Conditions professionnels
├── a-propos/index.html               # À propos de PRIMEO
├── contact/index.html                # Contact
│
├── reglement-interieur/index.html    # Règlement intérieur
├── charte-donnees/index.html         # Charte RGPD
├── conditions-api/index.html         # Conditions API
├── parrainage/index.html             # Politique de parrainage
├── jeux-concours/index.html          # Jeux-concours & promotions
├── disclaimer/index.html             # Avis juridique
├── propriete-intellectuelle/         # Propriété intellectuelle
│   └── index.html
├── signalement/index.html            # Signalement de contenus
├── litiges-mediation/index.html      # Litiges & Médiation
├── charte-communaute/index.html      # Charte communauté
├── recrutement-confidentialite/      # Confidentialité recrutement
│   └── index.html
├── transferts-donnees/index.html     # Transferts hors CEDEAO
└── confidentialite-pros/index.html   # Confidentialité professionnels
```

## Deploying on Render

The site is configured as a static service in `/render.yaml` (`primeo-legal`).
Render detects the `legal-site/` root directory, serves the folder as-is (no build command),
and maps the custom domain **legal.primeo.ci**.

Manual steps before first deploy:
1. In the Render dashboard, go to the `primeo-legal` service → Settings → Custom Domains.
2. Add `legal.primeo.ci` and follow the DNS instructions (CNAME to Render).
3. Push to `main` — Render will deploy automatically.

Security headers applied via `render.yaml`:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Cache-Control: public, max-age=3600`

## Adding a new legal page

1. Create a new folder under `legal-site/` with the slug as the folder name, e.g. `nouvelle-page/`.
2. Copy an existing `index.html` from a nearby page and update the title, heading, and body content.
3. Add a card in `legal-site/index.html` inside the `card-grid` section.
4. Add the link to the relevant footer column in `legal-site/index.html`.
5. If the page should appear in the mobile app, add an entry to:
   - `mobile/src/screens/client/Profile/LegalLinksScreen.tsx` (LINKS array)
   - `mobile/src/screens/client/Home/HomeFooter.tsx` (FOOTER_LEGAL array, if appropriate)
6. If the page should appear in the vitrine footer, add a link in `Primeo/templates/footer.html`.

## Contact

Legal team: **legal@primeo.ci**
