// Système de composition des emails Primeo — layout responsive + composants
// réutilisables, 100 % HTML/CSS inline (compatible Gmail, Outlook, Apple Mail,
// mobile). Aucun JavaScript. Les couleurs proviennent de la charte (theme.ts).

import {
  EMAIL_COLORS as C,
  EMAIL_GRADIENTS as G,
  EMAIL_LINKS,
  EMAIL_SOCIALS,
  EMAIL_LOGO_URL,
  COMPANY,
} from './theme';

export type Accent = 'primary' | 'success' | 'danger' | 'secondary';

function accentColor(accent: Accent): string {
  switch (accent) {
    case 'success': return C.success;
    case 'danger': return C.danger;
    case 'secondary': return C.secondary;
    default: return C.primary;
  }
}

// ─── En-tête : logo officiel sur fond blanc + bandeau bleu Primeo + liseré orange ──
// Le logo (texte bleu nuit) reste lisible sur fond blanc ; le bandeau bleu porte la
// signature de la marque. Identique pour tous les emails (cohérence de marque).

function renderHeader(_accent: Accent): string {
  const logo = EMAIL_LOGO_URL
    ? `<a href="${EMAIL_LINKS.vitrine}" target="_blank" style="text-decoration:none;"><img src="${EMAIL_LOGO_URL}" alt="Primeo" width="170" style="display:block;margin:0 auto;border:0;height:auto;max-width:170px;" /></a>`
    : `<span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:32px;font-weight:800;color:${C.primary};letter-spacing:2px;">Primeo</span>`;

  return `
  <tr>
    <td class="primeo-header" style="background-color:#ffffff;padding:28px 40px 22px;text-align:center;">
      ${logo}
    </td>
  </tr>
  <tr>
    <td style="background:${C.primary};background-image:${G.primary};padding:12px 40px;text-align:center;">
      <p style="margin:0;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;font-weight:600;letter-spacing:0.4px;">${COMPANY.tagline}</p>
    </td>
  </tr>
  <tr><td style="height:4px;background:${C.secondary};background-image:${G.secondary};font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

// ─── Pied de page : coordonnées, réseaux sociaux, liens légaux ──────────────────

function renderSocialIcons(): string {
  const cells = EMAIL_SOCIALS.map(
    (s) => `
        <td style="padding:0 6px;">
          <a href="${s.url}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${s.icon}" alt="${s.name}" width="32" height="32" style="display:block;border:0;border-radius:8px;" />
          </a>
        </td>`,
  ).join('');
  return `<table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>${cells}</tr></table>`;
}

function footerLink(url: string, label: string, strong = false): string {
  return `<a href="${url}" target="_blank" style="color:#B9CBF2;font-family:Arial,sans-serif;font-size:13px;text-decoration:none;${strong ? 'font-weight:700;' : ''}">${label}</a>`;
}

function renderFooter(): string {
  const sep = `<span style="color:#3C5488;font-size:13px;"> &nbsp;•&nbsp; </span>`;
  return `
  <tr><td style="height:4px;background:${C.secondary};background-image:${G.secondary};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr>
    <td style="background-color:${C.footerBg};padding:30px 40px 28px;text-align:center;">
      <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:15px;font-weight:800;color:#ffffff;letter-spacing:0.3px;">Besoin d’aide ? Nous sommes là.</p>
      <p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:13px;line-height:1.8;color:#B9CBF2;">
        <a href="mailto:${COMPANY.email}" style="color:#ffffff;text-decoration:none;font-weight:600;">${COMPANY.email}</a>
        &nbsp;·&nbsp;
        <a href="${COMPANY.phoneHref}" style="color:#ffffff;text-decoration:none;font-weight:600;">${COMPANY.phone}</a><br>
        ${COMPANY.address}
      </p>
      ${renderSocialIcons()}
      <p style="margin:20px 0 0;line-height:1.9;">
        ${footerLink(EMAIL_LINKS.vitrine, 'Site Primeo', true)}${sep}${footerLink(EMAIL_LINKS.help, 'Centre d’aide')}${sep}${footerLink(EMAIL_LINKS.privacy, 'Politique de confidentialité')}${sep}${footerLink(EMAIL_LINKS.terms, 'Conditions d’utilisation')}${sep}${footerLink(EMAIL_LINKS.legal, 'Mentions légales')}
      </p>
      <p style="margin:16px 0 0;color:#7F93BD;font-family:Arial,sans-serif;font-size:11px;line-height:1.6;">
        © ${COMPANY.year} ${COMPANY.name} — ${COMPANY.address}<br>
        Vous recevez cet email suite à une action sur votre compte Primeo ou une demande de votre part.
      </p>
    </td>
  </tr>`;
}

// ─── Layout principal ──────────────────────────────────────────────────────────

interface LayoutOptions {
  title: string; // <title> du document + accessibilité
  body: string; // contenu HTML déjà composé
  accent?: Accent; // couleur du bandeau d'en-tête (défaut : bleu primaire)
  preheader?: string; // texte d'aperçu (masqué) affiché dans la boîte de réception
}

export function renderEmail({ title, body, accent = 'primary', preheader }: LayoutOptions): string {
  const preheaderBlock = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <title>${title}</title>
  <style>
    /* Animations — prises en charge par les clients modernes (Apple Mail, iOS
       Mail, certains webmails). Ignorées sans dommage ailleurs : aucun effet de
       régression, le rendu statique reste impeccable. Le JavaScript étant
       supprimé par tous les clients email, l'animation passe par du CSS pur. */
    @keyframes primeoFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes primeoPop { 0% { opacity: 0; transform: scale(0.96); } 60% { transform: scale(1.02); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes primeoSheen { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes primeoPulse { 0%,100% { box-shadow: 0 4px 12px rgba(255,102,0,0.30); } 50% { box-shadow: 0 6px 22px rgba(255,102,0,0.55); } }
    .primeo-card { animation: primeoFadeUp 0.7s ease-out both; }
    .primeo-header { animation: primeoPop 0.6s ease-out both; }
    .primeo-info { animation: primeoFadeUp 0.8s ease-out 0.1s both; }
    .primeo-btn { animation: primeoPulse 2.4s ease-in-out 0.6s infinite; transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .primeo-btn:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 26px rgba(255,102,0,0.55) !important; }
    a[class="primeo-link"]:hover { text-decoration: underline !important; }
    @media (prefers-reduced-motion: reduce) {
      .primeo-card, .primeo-header, .primeo-info, .primeo-btn { animation: none !important; }
    }
    @media only screen and (max-width: 620px) {
      .primeo-card { width: 100% !important; border-radius: 0 !important; }
      .primeo-pad { padding: 28px 22px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.bodyBg};-webkit-text-size-adjust:100%;">
  ${preheaderBlock}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.bodyBg};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" class="primeo-card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${C.cardBg};border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(11,27,58,0.10);">
          ${renderHeader(accent)}
          <tr>
            <td class="primeo-pad" style="padding:40px 40px 32px;font-family:Arial,Helvetica,sans-serif;">
              ${body}
            </td>
          </tr>
          ${renderFooter()}
        </table>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <tr><td style="padding:16px 24px;text-align:center;font-family:Arial,sans-serif;font-size:11px;color:${C.textFaint};">
            Primeo — réservez résidences, hôtels, restaurants et biens immobiliers en toute sécurité.
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Composants de contenu ─────────────────────────────────────────────────────

/** Titre principal de l'email — toujours en bleu officiel (cohérence de marque). */
export function heading(text: string, _accent: Accent = 'primary'): string {
  return `<h1 style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:800;color:${C.primary};">${text}</h1>`;
}

/** Salutation personnalisée « Bonjour Prénom, ». */
export function greeting(firstName?: string): string {
  const name = firstName?.trim();
  return `<p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:16px;color:${C.text};">Bonjour${name ? ` <strong>${name}</strong>` : ''},</p>`;
}

/** Paragraphe de corps de texte. */
export function paragraph(html: string): string {
  return `<p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:15px;line-height:1.65;color:${C.text};">${html}</p>`;
}

/** Bouton d'action principal — toujours orange (couleur d'action Primeo). */
export function button(url: string, label: string, _accent: Accent = 'secondary'): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 24px;">
    <tr>
      <td class="primeo-btn" align="center" style="border-radius:12px;background:${C.secondary};background-image:${G.secondary};box-shadow:0 4px 12px rgba(255,102,0,0.30);">
        <a href="${url}" target="_blank" style="display:inline-block;padding:15px 38px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/** Lien secondaire discret (ex : télécharger une facture). */
export function secondaryLink(url: string, label: string): string {
  return `<p style="margin:0 0 18px;text-align:center;font-family:Arial,sans-serif;font-size:14px;"><a href="${url}" target="_blank" style="color:${C.primary};font-weight:600;text-decoration:none;">${label}</a></p>`;
}

export interface InfoRow {
  label: string;
  value: string;
  /** Met le montant/valeur en évidence (gras, plus gros). */
  highlight?: boolean;
}

/** Carte d'informations clés présentée sous forme de lignes label / valeur. */
export function infoCard(rows: InfoRow[], opts: { title?: string } = {}): string {
  const titleHtml = opts.title
    ? `<p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${C.textMuted};">${opts.title}</p>`
    : '';

  const body = rows
    .filter((r) => r.value !== '' && r.value != null)
    .map((r, i, arr) => {
      const isLast = i === arr.length - 1;
      const border = isLast ? '' : `border-bottom:1px solid ${C.border};`;
      const valueStyle = r.highlight
        ? `font-size:18px;font-weight:800;color:${C.success};`
        : `font-size:15px;font-weight:600;color:${C.heading};`;
      return `
        <tr>
          <td style="padding:11px 0;${border}font-family:Arial,sans-serif;font-size:14px;color:${C.textMuted};">${r.label}</td>
          <td style="padding:11px 0;${border}font-family:Arial,sans-serif;text-align:right;${valueStyle}">${r.value}</td>
        </tr>`;
    })
    .join('');

  return `
  <table role="presentation" class="primeo-info" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.panelBg};border:1px solid ${C.border};border-left:4px solid ${C.primary};border-radius:12px;margin:0 0 24px;">
    <tr><td style="padding:18px 22px;">
      ${titleHtml}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table>
    </td></tr>
  </table>`;
}

/** Encart d'alerte / mise en avant coloré (ex : motif de refus, rappel). */
export function alertBox(html: string, accent: Accent = 'primary'): string {
  const color = accentColor(accent);
  const bg =
    accent === 'danger' ? '#FFF1F1'
    : accent === 'success' ? '#ECFDF3'
    : accent === 'secondary' ? '#FFF6EC'
    : '#EDF3FF';
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
    <tr><td style="background-color:${bg};border-left:4px solid ${color};border-radius:8px;padding:14px 18px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:${C.text};">${html}</td></tr>
  </table>`;
}

/** Bloc de code/OTP en grands caractères espacés. */
export function codeBlock(code: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
    <tr><td align="center" style="background-color:${C.panelBg};border:1px dashed ${C.primary};border-radius:12px;padding:24px;">
      <span style="font-family:'Courier New',monospace;font-size:38px;font-weight:800;letter-spacing:10px;color:${C.primary};">${code}</span>
    </td></tr>
  </table>`;
}

/** Signature standard de l'équipe. */
export function signature(): string {
  return `<p style="margin:24px 0 0;font-family:Arial,sans-serif;font-size:14px;color:${C.textMuted};">À très vite,<br><strong style="color:${C.heading};">L'équipe Primeo</strong></p>`;
}

/** Séparateur horizontal léger. */
export function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${C.border};margin:24px 0;">`;
}

/** Note discrète (ex : lien direct, validité, avertissement). */
export function muted(html: string): string {
  return `<p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:${C.textFaint};">${html}</p>`;
}
