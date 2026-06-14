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

function accentGradient(accent: Accent): string {
  switch (accent) {
    case 'success': return G.success;
    case 'danger': return G.danger;
    case 'secondary': return G.secondary;
    default: return G.primary;
  }
}

// ─── En-tête (logo + bandeau dégradé) ──────────────────────────────────────────

function renderHeader(accent: Accent): string {
  const logo = EMAIL_LOGO_URL
    ? `<img src="${EMAIL_LOGO_URL}" alt="Primeo" width="150" style="display:block;margin:0 auto;border:0;height:auto;max-width:150px;" />`
    : `<span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:32px;font-weight:800;color:#ffffff;letter-spacing:3px;">PRIMEO</span>`;

  return `
  <tr>
    <td style="background:${accentColor(accent)};background-image:${accentGradient(accent)};padding:36px 40px;text-align:center;">
      ${logo}
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;font-family:Arial,sans-serif;letter-spacing:0.5px;">${COMPANY.tagline}</p>
    </td>
  </tr>`;
}

// ─── Pied de page (réseaux sociaux + liens légaux) ─────────────────────────────

function renderSocialIcons(): string {
  const cells = EMAIL_SOCIALS.map(
    (s) => `
        <td style="padding:0 6px;">
          <a href="${s.url}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${s.icon}" alt="${s.name}" width="34" height="34" style="display:block;border:0;border-radius:8px;" />
          </a>
        </td>`,
  ).join('');
  return `<table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>${cells}</tr></table>`;
}

function renderFooter(): string {
  return `
  <tr>
    <td style="background-color:${C.footerBg};padding:32px 40px;text-align:center;">
      ${renderSocialIcons()}
      <p style="margin:20px 0 0;">
        <a href="${EMAIL_LINKS.vitrine}" target="_blank" style="color:#9FB4E0;font-family:Arial,sans-serif;font-size:13px;text-decoration:none;font-weight:600;">Visiter Primeo</a>
        <span style="color:#3C5488;font-size:13px;"> &nbsp;•&nbsp; </span>
        <a href="${EMAIL_LINKS.privacy}" target="_blank" style="color:#9FB4E0;font-family:Arial,sans-serif;font-size:13px;text-decoration:none;">Confidentialité</a>
        <span style="color:#3C5488;font-size:13px;"> &nbsp;•&nbsp; </span>
        <a href="${EMAIL_LINKS.terms}" target="_blank" style="color:#9FB4E0;font-family:Arial,sans-serif;font-size:13px;text-decoration:none;">Conditions</a>
      </p>
      <p style="margin:18px 0 0;color:#6E82AC;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;">
        © ${COMPANY.year} ${COMPANY.name} — ${COMPANY.address}<br>
        Cet email vous a été envoyé suite à une action sur votre compte Primeo.
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
</head>
<body style="margin:0;padding:0;background-color:${C.bodyBg};-webkit-text-size-adjust:100%;">
  ${preheaderBlock}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.bodyBg};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${C.cardBg};border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(11,27,58,0.10);">
          ${renderHeader(accent)}
          <tr>
            <td style="padding:40px 40px 32px;font-family:Arial,Helvetica,sans-serif;">
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

/** Titre principal de l'email (avec emoji optionnel intégré dans le texte). */
export function heading(text: string, accent: Accent = 'primary'): string {
  return `<h1 style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:24px;line-height:1.3;font-weight:800;color:${accentColor(accent)};">${text}</h1>`;
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

/** Bouton d'action principal. */
export function button(url: string, label: string, accent: Accent = 'primary'): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 24px;">
    <tr>
      <td align="center" style="border-radius:12px;background:${accentColor(accent)};background-image:${accentGradient(accent)};box-shadow:0 4px 12px rgba(0,85,255,0.25);">
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
        ? `font-size:17px;font-weight:800;color:${C.primary};`
        : `font-size:15px;font-weight:600;color:${C.heading};`;
      return `
        <tr>
          <td style="padding:11px 0;${border}font-family:Arial,sans-serif;font-size:14px;color:${C.textMuted};">${r.label}</td>
          <td style="padding:11px 0;${border}font-family:Arial,sans-serif;text-align:right;${valueStyle}">${r.value}</td>
        </tr>`;
    })
    .join('');

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.panelBg};border:1px solid ${C.border};border-radius:12px;margin:0 0 24px;">
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
