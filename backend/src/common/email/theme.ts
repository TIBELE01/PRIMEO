// Charte graphique des emails transactionnels Primeo.
// Toutes les couleurs et constantes de marque sont centralisées ici afin que
// l'ensemble des templates partage une identité visuelle cohérente.

export const EMAIL_COLORS = {
  // Couleurs officielles Primeo
  primary: '#0055FF', // bleu principal — boutons, titres, liens, bordures
  secondary: '#FF6600', // orange secondaire — accents
  danger: '#FF3333', // rouge tertiaire — alertes / annulations
  success: '#00CC66', // vert complémentaire — confirmations

  // Neutres
  text: '#333333', // texte principal
  textMuted: '#6B7280', // texte secondaire / labels
  textFaint: '#9CA3AF', // mentions discrètes (footer)
  heading: '#111827', // titres sombres

  // Surfaces
  bodyBg: '#EEF2F8', // fond extérieur très clair
  cardBg: '#FFFFFF', // carte de contenu
  panelBg: '#F5F8FF', // panneaux d'information (teinté bleu)
  border: '#E5EAF2', // bordures légères
  footerBg: '#0B1B3A', // pied de page bleu nuit
} as const;

// Dégradés (réutilisés dans l'en-tête et les bandeaux d'accent)
export const EMAIL_GRADIENTS = {
  hero: 'linear-gradient(135deg, #0047D9 0%, #0055FF 55%, #3B82FF 100%)',
  primary: 'linear-gradient(135deg, #0055FF 0%, #2E7BFF 100%)',
  success: 'linear-gradient(135deg, #00CC66 0%, #19E07E 100%)',
  danger: 'linear-gradient(135deg, #FF3333 0%, #FF6A6A 100%)',
  secondary: 'linear-gradient(135deg, #FF6600 0%, #FF9036 100%)',
} as const;

// Liens publics — réseaux sociaux officiels + site vitrine + mentions légales.
// Les URLs des services sont configurables via variables d'environnement afin de
// suivre les déploiements (Render, domaine personnalisé…) sans toucher au code.
const VITRINE_FALLBACK = 'https://primeo-vitrine-152o.onrender.com';
const LEGAL_FALLBACK = 'https://primeo-legal-kg6t.onrender.com';
const LEGAL_BASE = process.env['LEGAL_URL']?.trim() || LEGAL_FALLBACK;

export const EMAIL_LINKS = {
  vitrine: process.env['VITRINE_URL']?.trim() || VITRINE_FALLBACK,
  help: `${process.env['VITRINE_URL']?.trim() || VITRINE_FALLBACK}/aide/`,
  privacy: process.env['PRIVACY_URL']?.trim() || `${LEGAL_BASE}/confidentialite/`,
  terms: process.env['TERMS_URL']?.trim() || `${LEGAL_BASE}/cgu/`,
  legal: `${LEGAL_BASE}/mentions-legales/`,
  /** Espace client : application web si configurée, sinon page de téléchargement de l'app */
  app: process.env['FRONTEND_URL']?.trim() || `${process.env['VITRINE_URL']?.trim() || VITRINE_FALLBACK}/telechargement/`,
} as const;

// Réseaux sociaux — icônes PNG (compatibles tous clients email, contrairement au
// SVG bloqué par Gmail). Icônes colorées « fluency » hébergées sur le CDN Icons8.
export const EMAIL_SOCIALS: ReadonlyArray<{ name: string; url: string; icon: string }> = [
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=61590079695276',
    icon: 'https://img.icons8.com/fluency/48/facebook-new.png',
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/primeo.ci?igsh=MW5keHhiMmd5bWdsbw==',
    icon: 'https://img.icons8.com/fluency/48/instagram-new.png',
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@primeo.ci?_r=1&t=ZN-97Cjr3dKrfG',
    icon: 'https://img.icons8.com/color/48/tiktok--v1.png',
  },
];

// Logo officiel (PNG, compatible tous clients email) — hébergé sur le site vitrine, surchargeable par variable d'environnement.
const ASSETS = `${process.env['VITRINE_URL']?.trim() || VITRINE_FALLBACK}/assets/img`;
// Logo officiel Primeo (carré bleu, « P » blanc) — le même que sur le site vitrine et le site légal.
export const EMAIL_LOGO_URL =
  process.env['EMAIL_LOGO_URL']?.trim() ||
  'https://res.cloudinary.com/dlnnxvepd/image/upload/e_trim/c_fit,w_160,h_160,f_png/v1782345787/Logo_Primeo_1_gzcjq2.png';

/** Badges des stores (PNG) — mènent à la page de téléchargement de l'application */
export const EMAIL_STORE_BADGES: ReadonlyArray<{ name: string; image: string; url: string }> = [
  { name: 'Télécharger dans l’App Store', image: `${ASSETS}/stores/app-store-badge.png`, url: `${process.env['VITRINE_URL']?.trim() || VITRINE_FALLBACK}/telechargement/` },
  { name: 'Disponible sur Google Play', image: `${ASSETS}/stores/google-play-badge.png`, url: `${process.env['VITRINE_URL']?.trim() || VITRINE_FALLBACK}/telechargement/` },
];

export const COMPANY = {
  name: 'Primeo CI',
  tagline: 'Résidences · Hôtels · Restaurants · Immobilier en Côte d’Ivoire',
  address: 'Abidjan, Côte d’Ivoire',
  email: 'support.primeo@gmail.com',
  phone: '+225 07 07 16 16 84',
  phoneHref: 'tel:+2250707161684',
  year: new Date().getFullYear(),
} as const;
