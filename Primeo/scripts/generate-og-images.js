/**
 * generate-og-images.js — Generate branded Open Graph share images (1200×630).
 *
 * Produces one PNG per public page under assets/img/og/. Images are committed
 * to the repo so the static host serves them without needing sharp at deploy.
 * Re-run after changing branding or page list:  npm run og
 *
 * Requires sharp (dev only):  npm install --no-save sharp
 */
'use strict';

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('✗ sharp is required: run `npm install --no-save sharp` first.');
  process.exit(1);
}

const OUT_DIR = path.join(__dirname, '..', 'assets', 'img', 'og');
const W = 1200;
const H = 630;

// Official Primeo palette (from assets/css/style.css :root)
const C = {
  dark: '#0a1024',
  dark2: '#0f1733',
  primary: '#1056e0',
  primaryLight: '#3b82f6',
  cta: '#5bbd15',
  gold: '#d67309',
  white: '#ffffff',
};

// XML-escape for safe SVG text injection
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Wrap a title into up to `maxLines` lines of at most `maxChars` characters,
 * returning <tspan> rows positioned from `y` with `lh` line-height.
 */
function wrapTitle(title, { x = 80, y = 300, maxChars = 24, lh = 74 } = {}) {
  const words = String(title).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines
    .slice(0, 3)
    .map((l, i) => `<tspan x="${x}" y="${y + i * lh}">${esc(l)}</tspan>`)
    .join('');
}

function svg({ title, subtitle, accent = C.cta }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.dark}"/>
      <stop offset="0.55" stop-color="${C.dark2}"/>
      <stop offset="1" stop-color="#0a1633"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.18" r="0.7">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.primary}"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- subtle dot grid -->
  <g fill="#ffffff" fill-opacity="0.035">
    ${Array.from({ length: 7 }, (_, r) =>
      Array.from({ length: 14 }, (_, c) =>
        `<circle cx="${90 + c * 80}" cy="${70 + r * 80}" r="2"/>`,
      ).join(''),
    ).join('')}
  </g>

  <!-- accent bar -->
  <rect x="80" y="120" width="64" height="8" rx="4" fill="url(#bar)"/>

  <!-- wordmark -->
  <text x="80" y="205" font-family="Liberation Sans, DejaVu Sans, Arial, sans-serif"
        font-size="58" font-weight="bold" letter-spacing="1">
    <tspan fill="${C.white}">PRIM</tspan><tspan fill="${accent}">EO</tspan>
  </text>

  <!-- title -->
  <text font-family="Liberation Sans, DejaVu Sans, Arial, sans-serif"
        font-size="62" font-weight="bold" fill="${C.white}">
    ${wrapTitle(title, { x: 80, y: 320, maxChars: 26, lh: 76 })}
  </text>

  <!-- subtitle -->
  <text x="80" y="${title.length > 40 ? 560 : 500}"
        font-family="Liberation Sans, DejaVu Sans, Arial, sans-serif"
        font-size="30" fill="#aab4cf">${esc(subtitle)}</text>

  <!-- domain pill -->
  <rect x="80" y="${H - 86}" width="220" height="46" rx="23" fill="#ffffff" fill-opacity="0.08"/>
  <text x="106" y="${H - 55}" font-family="Liberation Sans, DejaVu Sans, Arial, sans-serif"
        font-size="24" font-weight="bold" fill="${C.white}">primeo.ci</text>
</svg>`;
}

// One entry per generated image: filename → { title, subtitle, accent }
const IMAGES = {
  'og-default': { title: "Réservez votre hébergement en Côte d'Ivoire", subtitle: 'Hôtels · Résidences · Restaurants · Immobilier', accent: C.cta },
  'og-home': { title: "La plateforme de réservation #1 en Côte d'Ivoire", subtitle: '3 modes de paiement · Visites 3D · 0 % de commission', accent: C.cta },
  'og-solutions': { title: 'Des solutions pour chaque professionnel', subtitle: 'Hôtellerie · Restauration · Immobilier · Événementiel', accent: C.primaryLight },
  'og-produits': { title: 'Tous les outils pour gérer votre activité', subtitle: 'Réservations · Paiements · Statistiques · Boosts', accent: C.primaryLight },
  'og-tarification': { title: '0 % de commission, sans frais cachés', subtitle: 'Starter · Business · Entreprise — sans engagement', accent: C.cta },
  'og-pro': { title: 'Développez votre activité avec Primeo', subtitle: 'Rejoignez +1 200 professionnels en Côte d\'Ivoire', accent: C.gold },
  'og-blog': { title: 'Le blog Primeo', subtitle: "Conseils, actualités et analyses du secteur", accent: C.primaryLight },
  'og-a-propos': { title: 'Notre mission : simplifier la réservation', subtitle: "Primeo — la fierté tech ivoirienne", accent: C.cta },
  'og-contact': { title: 'Contactez l\'équipe Primeo', subtitle: 'Support, partenariats et devis personnalisés', accent: C.primaryLight },
  'og-aide': { title: "Centre d'aide Primeo", subtitle: 'Réponses rapides à toutes vos questions', accent: C.primaryLight },
  'og-communaute': { title: 'Rejoignez la communauté Primeo', subtitle: 'Hôtes, voyageurs et professionnels réunis', accent: C.cta },
  'og-engagement': { title: 'Nos engagements envers vous', subtitle: 'Sécurité · Transparence · Proximité', accent: C.cta },
  'og-presse': { title: 'Espace presse Primeo', subtitle: 'Communiqués, kit média et contacts', accent: C.primaryLight },
  'og-telechargement': { title: "Téléchargez l'application Primeo", subtitle: 'Disponible sur iOS et Android', accent: C.cta },
  'og-documentation': { title: 'Documentation & guides Primeo', subtitle: 'Tout pour bien démarrer sur la plateforme', accent: C.primaryLight },
  'og-carrieres': { title: 'Rejoignez l\'aventure Primeo', subtitle: 'Construisons la tech ivoirienne de demain', accent: C.gold },
};

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  let count = 0;
  for (const [name, cfg] of Object.entries(IMAGES)) {
    const buf = Buffer.from(svg(cfg));
    const out = path.join(OUT_DIR, `${name}.png`);
    await sharp(buf).png({ quality: 90, compressionLevel: 9 }).toFile(out);
    const kb = (fs.statSync(out).size / 1024).toFixed(0);
    console.log(`  ✓ ${name}.png (${kb} KB)`);
    count++;
  }
  console.log(`\nGenerated ${count} OG images → assets/img/og/`);
})();
