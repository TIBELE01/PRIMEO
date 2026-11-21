// Système de composition des emails Primeo — gabarit « entreprise » 100 % responsive.
// HTML/CSS inline à base de tableaux (Gmail, Outlook desktop/web, Apple Mail, iOS, Android),
// boutons compatibles Outlook (VML), mode sombre, texte d'aperçu, accessibilité (role, lang, alt).
// Aucun JavaScript. Les couleurs et liens proviennent de la charte (theme.ts).

import {
  EMAIL_COLORS as C,
  EMAIL_GRADIENTS as G,
  EMAIL_LINKS,
  EMAIL_SOCIALS,
  EMAIL_LOGO_URL,
  EMAIL_STORE_BADGES,
  COMPANY,
} from './theme';

export type Accent = 'primary' | 'success' | 'danger' | 'secondary';

const FONT = "'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function accentColor(accent: Accent): string {
  switch (accent) {
    case 'success': return C.success;
    case 'danger': return C.danger;
    case 'secondary': return C.secondary;
    default: return C.secondary; // liseré orange par défaut (couleur d'accent Primeo)
  }
}

// ─── Titre (bandeau « hero ») ─────────────────────────────────────────────────
// heading() insère un marqueur que renderEmail déplace dans le bandeau bleu en tête d'email :
// les templates existants bénéficient ainsi du nouveau design sans être réécrits.

const HERO_OPEN = '<!--PRIMEO_HERO-->';
const HERO_CLOSE = '<!--/PRIMEO_HERO-->';
const EMOJI_EDGE = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*|\s*(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)$/u;

function splitIcon(text: string): { icon: string; title: string } {
  const m = text.trim().match(EMOJI_EDGE);
  if (!m) return { icon: '', title: text.trim() };
  const icon = (m[1] ?? m[2] ?? '').trim();
  return { icon, title: text.trim().replace(m[0], '').trim() };
}

function renderHero(text: string, accent: Accent): string {
  const { icon, title } = splitIcon(text);
  const iconCell = icon
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 8px;">
        <tr><td align="center" valign="middle" width="34" height="34" class="hero-icon" style="width:34px;height:34px;border-radius:17px;background-color:#ffffff;font-size:17px;line-height:34px;text-align:center;">${icon}</td></tr>
      </table>`
    : '';
  return `
  <tr>
    <td class="hero" align="center" style="background-color:${C.primary};background-image:${G.hero};padding:18px 22px 16px;text-align:center;">
      ${iconCell}
      <h1 class="hero-title" style="margin:0;font-family:${FONT};font-size:18px;line-height:1.3;font-weight:800;color:#ffffff;letter-spacing:-0.1px;">${title}</h1>
    </td>
  </tr>
  <tr><td style="height:3px;line-height:3px;font-size:0;background-color:${accentColor(accent)};">&nbsp;</td></tr>`;
}

// ─── En-tête : petit logo discret ────────────────────────────────────────────
// Logo volontairement petit (22 px) ; l'image source est aussi demandée en petite
// taille, pour rester discrète même dans un client email qui ignorerait width/height.

function renderTopBar(): string {
  const logo = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="center-table"><tr>
      <td style="padding-right:6px;vertical-align:middle;"><img src="${EMAIL_LOGO_URL}" alt="Primeo" width="22" height="22" style="display:block;border:0;outline:none;width:22px;height:22px;max-width:22px;" /></td>
      <td style="vertical-align:middle;font-family:${FONT};font-size:14px;font-weight:800;color:${C.primary};letter-spacing:-0.2px;">Primeo</td>
    </tr></table>`;
  return `
  <tr>
    <td class="px topbar" style="background-color:#ffffff;padding:10px 22px;">
      <a href="${EMAIL_LINKS.vitrine}" target="_blank" style="text-decoration:none;display:inline-block;">${logo}</a>
    </td>
  </tr>`;
}

// ─── Bloc confiance (3 colonnes, empilées sur mobile) ─────────────────────────

function renderTrust(): string {
  const items = [
    { icon: '🔒', title: 'Paiement sécurisé' },
    { icon: '✅', title: 'Annonces vérifiées' },
    { icon: '💬', title: 'Support réactif' },
  ];
  // Icône + titre uniquement (sans texte descriptif), alignés au centre de chaque colonne
  const cols = items.map((i) => `
          <td class="trust-col" width="33%" valign="middle" style="width:33%;padding:0 3px;text-align:center;vertical-align:middle;">
            <p class="txt trust-title" style="margin:0;font-family:${FONT};font-size:10.5px;line-height:1.3;font-weight:700;color:${C.heading};white-space:nowrap;"><span class="trust-icon" style="font-size:11px;">${i.icon}</span>&nbsp;${i.title}</p>
          </td>`).join('');
  return `
  <tr>
    <td class="px panel-row trust-row" style="background-color:${C.panelBg};padding:8px 12px;border-top:1px solid ${C.border};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cols}</tr></table>
    </td>
  </tr>`;
}

// ─── Bloc application mobile ──────────────────────────────────────────────────

function renderAppBlock(): string {
  const badges = EMAIL_STORE_BADGES.map((b) => `
              <td style="padding:0 4px;">
                <a href="${b.url}" target="_blank" style="text-decoration:none;display:inline-block;">
                  <img src="${b.image}" alt="${b.name}" height="28" style="display:block;border:0;height:28px;width:auto;" />
                </a>
              </td>`).join('');
  return `
  <tr>
    <td class="px content-row" align="center" style="background-color:#ffffff;padding:14px 22px 16px;text-align:center;border-top:1px solid ${C.border};">
      <p class="txt" style="margin:0 0 2px;font-family:${FONT};font-size:13px;font-weight:800;color:${C.heading};">Primeo dans votre poche</p>
      <p class="muted" style="margin:0 0 10px;font-family:${FONT};font-size:11.5px;line-height:1.4;color:${C.textMuted};">Réservez, payez et échangez avec les professionnels depuis l’application.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>${badges}</tr></table>
    </td>
  </tr>`;
}

// ─── Pied de page ─────────────────────────────────────────────────────────────

function renderSocialIcons(): string {
  const cells = EMAIL_SOCIALS.map(
    (s) => `
        <td style="padding:0 5px;">
          <a href="${s.url}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${s.icon}" alt="${s.name}" width="22" height="22" style="display:block;border:0;width:22px;height:22px;" />
          </a>
        </td>`,
  ).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>${cells}</tr></table>`;
}

function footerLink(url: string, label: string): string {
  return `<a href="${url}" target="_blank" style="color:#C7D6F7;font-family:${FONT};font-size:11px;text-decoration:none;white-space:nowrap;">${label}</a>`;
}

function renderFooter(): string {
  const sep = `<span style="color:#3C5488;font-size:11px;">&nbsp;|&nbsp;</span>`;
  return `
  <tr>
    <td class="px" style="background-color:${C.footerBg};padding:18px 22px 16px;text-align:center;">
      <p style="margin:0 0 2px;font-family:${FONT};font-size:13px;font-weight:800;color:#ffffff;letter-spacing:0.2px;">${COMPANY.name}</p>
      <p style="margin:0 0 8px;font-family:${FONT};font-size:11px;line-height:1.5;color:#9FB2DA;">${COMPANY.tagline}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 10px;">
        <tr>
          <td class="stack-col" style="padding:2px 8px;font-family:${FONT};font-size:11.5px;">
            <a href="mailto:${COMPANY.email}" style="color:#ffffff;text-decoration:none;font-weight:600;">✉️&nbsp; ${COMPANY.email}</a>
          </td>
          <td class="stack-col" style="padding:2px 8px;font-family:${FONT};font-size:11.5px;">
            <a href="${COMPANY.phoneHref}" style="color:#ffffff;text-decoration:none;font-weight:600;">📞&nbsp; ${COMPANY.phone}</a>
          </td>
        </tr>
      </table>
      ${renderSocialIcons()}
      <p style="margin:10px 0 0;line-height:1.8;">
        ${footerLink(EMAIL_LINKS.help, 'Centre d’aide')}${sep}${footerLink(EMAIL_LINKS.privacy, 'Confidentialité')}${sep}${footerLink(EMAIL_LINKS.terms, 'Conditions d’utilisation')}${sep}${footerLink(EMAIL_LINKS.legal, 'Mentions légales')}
      </p>
      <p style="margin:8px 0 0;font-family:${FONT};font-size:9.5px;line-height:1.55;color:#7F93BD;">
        © ${COMPANY.year} ${COMPANY.name} · ${COMPANY.address}<br>
        Email de service envoyé suite à une action sur votre compte Primeo. Pour ne rien manquer, ajoutez ${COMPANY.email} à vos contacts.
      </p>
    </td>
  </tr>`;
}

// ─── Layout principal ──────────────────────────────────────────────────────────

interface LayoutOptions {
  title: string; // <title> du document + titre du bandeau si le corps n'a pas de heading()
  body: string; // contenu HTML déjà composé
  accent?: Accent; // couleur du liseré sous le bandeau (succès, alerte…)
  preheader?: string; // texte d'aperçu (masqué) affiché dans la boîte de réception
  /** false : masque le bloc « application mobile » (ex. codes de sécurité) */
  showAppBlock?: boolean;
}

export function renderEmail({ title, body, accent = 'primary', preheader, showAppBlock = true }: LayoutOptions): string {
  // Le premier heading() du corps devient le bandeau-titre de l'email
  let heroText = title;
  const start = body.indexOf(HERO_OPEN);
  if (start !== -1) {
    const end = body.indexOf(HERO_CLOSE, start);
    heroText = body.slice(start + HERO_OPEN.length, end);
    body = body.slice(0, start) + body.slice(end + HERO_CLOSE.length);
  }
  // Les heading() suivants éventuels deviennent de simples intertitres
  body = body.split(HERO_OPEN).join(`<h2 class="txt" style="margin:4px 0 8px;font-family:${FONT};font-size:14.5px;font-weight:800;color:${C.heading};">`).split(HERO_CLOSE).join('</h2>');

  const preheaderText = preheader ?? splitIcon(heroText).title;
  // Remplissage invisible : empêche les clients d'afficher le début du corps après l'aperçu
  const spacer = '&#847;&zwnj;&nbsp;'.repeat(60);

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="x-primeo-layout" content="2">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${splitIcon(title).title}</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    u + #body a, #MessageViewBody a { color: inherit; text-decoration: none; }
    .btn a:hover { filter: brightness(1.06); }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .outer-pad { padding: 0 !important; }
      .px { padding-left: 16px !important; padding-right: 16px !important; }
      .content { padding: 16px 16px 2px !important; }
      .hero { padding: 14px 16px 13px !important; }
      .hero-title { font-size: 16px !important; }
      .hero-icon { width: 30px !important; height: 30px !important; line-height: 30px !important; font-size: 15px !important; }
      .greet { font-size: 13.5px !important; }
      .body-p { font-size: 13px !important; line-height: 1.5 !important; }
      .stack-col { display: block !important; width: 100% !important; max-width: 100% !important; text-align: center !important; }
      .trust-row { padding: 8px 6px !important; }
      .trust-col { padding: 0 2px !important; }
      .trust-title { font-size: 9.5px !important; white-space: normal !important; }
      .info-label, .info-value { display: block !important; width: 100% !important; text-align: left !important; }
      .info-label { padding: 6px 0 0 !important; border-bottom: 0 !important; font-size: 11px !important; }
      .info-value { padding: 0 0 6px !important; font-size: 12.5px !important; }
      .btn, .btn a { display: block !important; width: 100% !important; box-sizing: border-box; }
      .btn a { font-size: 13.5px !important; padding: 10px 16px !important; }
      .code { font-size: 22px !important; letter-spacing: 5px !important; }
    }
    @media (prefers-color-scheme: dark) {
      .outer { background-color: #0B1220 !important; }
      .card, .content-row { background-color: #111827 !important; }
      .panel, .panel-row { background-color: #172033 !important; border-color: #263247 !important; }
      .txt { color: #E5E7EB !important; }
      .muted { color: #9CA3AF !important; }
    }
    [data-ogsc] .card, [data-ogsc] .content-row { background-color: #111827 !important; }
    [data-ogsc] .txt { color: #E5E7EB !important; }
  </style>
</head>
<body id="body" class="outer" style="margin:0;padding:0;width:100%;background-color:${C.bodyBg};">
  <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.bodyBg};">${preheaderText}${spacer}</div>
  <table role="presentation" class="outer" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.bodyBg};">
    <tr>
      <td class="outer-pad" align="center" style="padding:16px 8px;">
        <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" class="container card" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background-color:${C.cardBg};border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(11,27,58,0.08);">
          ${renderTopBar()}
          ${renderHero(heroText, accent)}
          <tr>
            <td class="content content-row" style="background-color:${C.cardBg};padding:18px 22px 4px;font-family:${FONT};">
              ${body}
            </td>
          </tr>
          ${renderTrust()}
          ${showAppBlock ? renderAppBlock() : ''}
          ${renderFooter()}
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Composants de contenu ─────────────────────────────────────────────────────

/** Titre principal de l'email — affiché dans le bandeau bleu (l'emoji initial/final devient l'icône). */
export function heading(text: string, _accent: Accent = 'primary'): string {
  return `${HERO_OPEN}${text}${HERO_CLOSE}`;
}

/** Salutation personnalisée « Bonjour Prénom, ». */
export function greeting(firstName?: string): string {
  const name = firstName?.trim();
  return `<p class="txt greet" style="margin:0 0 8px;font-family:${FONT};font-size:14px;font-weight:600;color:${C.heading};">Bonjour${name ? ` ${name}` : ''},</p>`;
}

/** Paragraphe de corps de texte. */
export function paragraph(html: string): string {
  return `<p class="txt body-p" style="margin:0 0 10px;font-family:${FONT};font-size:13px;line-height:1.55;color:${C.text};">${html}</p>`;
}

/** Bouton d'action principal — orange (couleur d'action Primeo), compatible Outlook (VML). */
export function button(url: string, label: string, accent: Accent = 'secondary'): string {
  const color = accent === 'danger' ? C.danger : accent === 'primary' ? C.primary : C.secondary;
  const gradient = accent === 'danger' ? G.danger : accent === 'primary' ? G.primary : G.secondary;
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:4px auto 14px;">
    <tr>
      <td class="btn" align="center" style="border-radius:9px;background-color:${color};background-image:${gradient};">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:38px;v-text-anchor:middle;width:230px;" arcsize="22%" stroke="f" fillcolor="${color}">
          <w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;">${label}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${url}" target="_blank" style="display:inline-block;padding:10px 24px;font-family:${FONT};font-size:13.5px;font-weight:700;line-height:18px;color:#ffffff;text-decoration:none;border-radius:9px;text-align:center;">${label}</a>
        <!--<![endif]-->
      </td>
    </tr>
  </table>`;
}

/** Lien secondaire discret (ex : télécharger une facture). */
export function secondaryLink(url: string, label: string): string {
  return `<p style="margin:-6px 0 12px;text-align:center;font-family:${FONT};font-size:12px;"><a href="${url}" target="_blank" style="color:${C.primary};font-weight:700;text-decoration:none;">${label}</a></p>`;
}

export interface InfoRow {
  label: string;
  value: string;
  /** Met le montant/valeur en évidence (gras, plus gros). */
  highlight?: boolean;
}

/** Carte d'informations clés (label / valeur), lignes empilées sur mobile. */
export function infoCard(rows: InfoRow[], opts: { title?: string } = {}): string {
  const titleHtml = opts.title
    ? `<tr><td colspan="2" style="padding:0 0 3px;font-family:${FONT};font-size:10.5px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;color:${C.primary};">${opts.title}</td></tr>`
    : '';

  const body = rows
    .filter((r) => r.value !== '' && r.value != null)
    .map((r, i, arr) => {
      const isLast = i === arr.length - 1;
      const border = isLast ? '' : `border-bottom:1px solid ${C.border};`;
      const valueStyle = r.highlight
        ? `font-size:14.5px;font-weight:800;color:${C.primary};`
        : `font-size:12.5px;font-weight:700;color:${C.heading};`;
      return `
        <tr>
          <td class="info-label muted" width="45%" style="padding:6px 0;${border}font-family:${FONT};font-size:12px;color:${C.textMuted};vertical-align:top;">${r.label}</td>
          <td class="info-value txt" width="55%" style="padding:6px 0;${border}font-family:${FONT};text-align:right;vertical-align:top;${valueStyle}">${r.value}</td>
        </tr>`;
    })
    .join('');

  return `
  <table role="presentation" class="panel" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.panelBg};border:1px solid ${C.border};border-radius:10px;margin:2px 0 14px;">
    <tr><td style="padding:10px 14px 6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${titleHtml}${body}</table>
    </td></tr>
  </table>`;
}

/** Encart d'alerte / mise en avant coloré (ex : motif de refus, rappel). */
export function alertBox(html: string, accent: Accent = 'primary'): string {
  const color = accent === 'primary' ? C.primary : accentColor(accent);
  const bg =
    accent === 'danger' ? '#FFF1F1'
    : accent === 'success' ? '#ECFDF3'
    : accent === 'secondary' ? '#FFF6EC'
    : '#EDF3FF';
  return `
  <table role="presentation" class="panel" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;border-radius:9px;background-color:${bg};">
    <tr><td class="txt" style="border-left:3px solid ${color};border-radius:9px;padding:9px 12px;font-family:${FONT};font-size:12.5px;line-height:1.5;color:${C.text};">${html}</td></tr>
  </table>`;
}

/** Bloc de code/OTP en grands caractères espacés. */
export function codeBlock(code: string): string {
  return `
  <table role="presentation" class="panel" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 14px;background-color:${C.panelBg};border:2px dashed ${C.primary};border-radius:10px;">
    <tr><td align="center" style="padding:14px 10px;">
      <span class="code" style="font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:26px;font-weight:800;letter-spacing:6px;color:${C.primary};">${code}</span>
    </td></tr>
  </table>`;
}

/** Signature standard de l'équipe. */
export function signature(): string {
  return `<p class="muted" style="margin:12px 0 14px;font-family:${FONT};font-size:12.5px;line-height:1.5;color:${C.textMuted};">À très vite,<br><strong class="txt" style="color:${C.heading};">L’équipe Primeo</strong></p>`;
}

/** Séparateur horizontal léger. */
export function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;"><tr><td style="border-top:1px solid ${C.border};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/** Note discrète (ex : lien direct, validité, avertissement). */
export function muted(html: string): string {
  return `<p class="muted" style="margin:0 0 8px;font-family:${FONT};font-size:11px;line-height:1.5;color:${C.textFaint};">${html}</p>`;
}
