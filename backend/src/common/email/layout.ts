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
  EMAIL_LOGO_WHITE_URL,
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
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px;">
        <tr><td align="center" valign="middle" width="64" height="64" style="width:64px;height:64px;border-radius:32px;background-color:#ffffff;font-size:30px;line-height:64px;text-align:center;box-shadow:0 6px 18px rgba(0,26,102,0.25);">${icon}</td></tr>
      </table>`
    : '';
  return `
  <tr>
    <td class="hero" align="center" style="background-color:${C.primary};background-image:${G.hero};padding:38px 40px 36px;text-align:center;">
      ${iconCell}
      <h1 class="hero-title" style="margin:0;font-family:${FONT};font-size:27px;line-height:1.25;font-weight:800;color:#ffffff;letter-spacing:-0.2px;">${title}</h1>
    </td>
  </tr>
  <tr><td style="height:5px;line-height:5px;font-size:0;background-color:${accentColor(accent)};">&nbsp;</td></tr>`;
}

// ─── En-tête : logo + accès à l'espace client ────────────────────────────────

function renderTopBar(): string {
  const logo = EMAIL_LOGO_URL
    ? `<img src="${EMAIL_LOGO_URL}" alt="Primeo" width="132" style="display:block;border:0;outline:none;height:auto;width:132px;max-width:132px;" />`
    : `<span style="font-family:${FONT};font-size:26px;font-weight:800;color:${C.primary};">Primeo</span>`;
  return `
  <tr>
    <td class="px topbar" style="background-color:#ffffff;padding:22px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="stack-col center-mobile" valign="middle" style="vertical-align:middle;">
            <a href="${EMAIL_LINKS.vitrine}" target="_blank" style="text-decoration:none;display:inline-block;">${logo}</a>
          </td>
          <td class="stack-col center-mobile topbar-link" valign="middle" align="right" style="vertical-align:middle;text-align:right;font-family:${FONT};font-size:13px;">
            <a href="${EMAIL_LINKS.app}" target="_blank" style="color:${C.primary};font-weight:700;text-decoration:none;">Mon espace Primeo&nbsp;→</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// ─── Bloc confiance (3 colonnes, empilées sur mobile) ─────────────────────────

function renderTrust(): string {
  const items = [
    { icon: '🔒', title: 'Paiement sécurisé', text: 'Transactions chiffrées et protégées' },
    { icon: '✅', title: 'Annonces vérifiées', text: 'Professionnels contrôlés par Primeo' },
    { icon: '💬', title: 'Support réactif', text: 'Une équipe à votre écoute' },
  ];
  const cols = items.map((i) => `
          <td class="stack-col trust-col" width="33%" valign="top" style="width:33%;padding:0 8px;text-align:center;vertical-align:top;">
            <div style="font-size:24px;line-height:32px;">${i.icon}</div>
            <p class="txt" style="margin:6px 0 2px;font-family:${FONT};font-size:14px;font-weight:700;color:${C.heading};">${i.title}</p>
            <p class="muted" style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.textMuted};">${i.text}</p>
          </td>`).join('');
  return `
  <tr>
    <td class="px panel-row" style="background-color:${C.panelBg};padding:26px 32px;border-top:1px solid ${C.border};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cols}</tr></table>
    </td>
  </tr>`;
}

// ─── Bloc application mobile ──────────────────────────────────────────────────

function renderAppBlock(): string {
  const badges = EMAIL_STORE_BADGES.map((b) => `
              <td style="padding:0 5px;">
                <a href="${b.url}" target="_blank" style="text-decoration:none;display:inline-block;">
                  <img src="${b.image}" alt="${b.name}" height="40" style="display:block;border:0;height:40px;width:auto;" />
                </a>
              </td>`).join('');
  return `
  <tr>
    <td class="px content-row" align="center" style="background-color:#ffffff;padding:28px 40px 30px;text-align:center;border-top:1px solid ${C.border};">
      <p class="txt" style="margin:0 0 4px;font-family:${FONT};font-size:16px;font-weight:800;color:${C.heading};">Primeo dans votre poche</p>
      <p class="muted" style="margin:0 0 16px;font-family:${FONT};font-size:13px;color:${C.textMuted};">Réservez, payez et échangez avec les professionnels depuis l’application.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>${badges}</tr></table>
    </td>
  </tr>`;
}

// ─── Pied de page ─────────────────────────────────────────────────────────────

function renderSocialIcons(): string {
  const cells = EMAIL_SOCIALS.map(
    (s) => `
        <td style="padding:0 6px;">
          <a href="${s.url}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${s.icon}" alt="${s.name}" width="30" height="30" style="display:block;border:0;width:30px;height:30px;" />
          </a>
        </td>`,
  ).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>${cells}</tr></table>`;
}

function footerLink(url: string, label: string): string {
  return `<a href="${url}" target="_blank" style="color:#C7D6F7;font-family:${FONT};font-size:12px;text-decoration:none;white-space:nowrap;">${label}</a>`;
}

function renderFooter(): string {
  const sep = `<span style="color:#3C5488;font-size:12px;">&nbsp;&nbsp;|&nbsp;&nbsp;</span>`;
  const logo = EMAIL_LOGO_WHITE_URL
    ? `<img src="${EMAIL_LOGO_WHITE_URL}" alt="Primeo" width="110" style="display:block;margin:0 auto;border:0;height:auto;width:110px;max-width:110px;" />`
    : `<span style="font-family:${FONT};font-size:22px;font-weight:800;color:#ffffff;">Primeo</span>`;
  return `
  <tr>
    <td class="px" style="background-color:${C.footerBg};padding:34px 40px 30px;text-align:center;">
      ${logo}
      <p style="margin:14px 0 18px;font-family:${FONT};font-size:13px;line-height:1.6;color:#9FB2DA;">${COMPANY.tagline}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 20px;">
        <tr>
          <td class="stack-col" style="padding:4px 10px;font-family:${FONT};font-size:13px;">
            <a href="mailto:${COMPANY.email}" style="color:#ffffff;text-decoration:none;font-weight:600;">✉️&nbsp; ${COMPANY.email}</a>
          </td>
          <td class="stack-col" style="padding:4px 10px;font-family:${FONT};font-size:13px;">
            <a href="${COMPANY.phoneHref}" style="color:#ffffff;text-decoration:none;font-weight:600;">📞&nbsp; ${COMPANY.phone}</a>
          </td>
        </tr>
      </table>
      ${renderSocialIcons()}
      <p style="margin:22px 0 0;line-height:2;">
        ${footerLink(EMAIL_LINKS.help, 'Centre d’aide')}${sep}${footerLink(EMAIL_LINKS.privacy, 'Confidentialité')}${sep}${footerLink(EMAIL_LINKS.terms, 'Conditions d’utilisation')}${sep}${footerLink(EMAIL_LINKS.legal, 'Mentions légales')}
      </p>
      <p style="margin:16px 0 0;font-family:${FONT};font-size:11px;line-height:1.7;color:#7F93BD;">
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
  body = body.split(HERO_OPEN).join(`<h2 class="txt" style="margin:8px 0 14px;font-family:${FONT};font-size:19px;font-weight:800;color:${C.heading};">`).split(HERO_CLOSE).join('</h2>');

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
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .outer-pad { padding: 0 !important; }
      .px { padding-left: 22px !important; padding-right: 22px !important; }
      .content { padding: 28px 22px 8px !important; }
      .hero { padding: 30px 22px 28px !important; }
      .hero-title { font-size: 22px !important; }
      .stack-col { display: block !important; width: 100% !important; max-width: 100% !important; text-align: center !important; }
      .trust-col { padding: 10px 0 !important; }
      .center-mobile img { margin: 0 auto !important; }
      .topbar-link { padding-top: 10px !important; }
      .info-label, .info-value { display: block !important; width: 100% !important; text-align: left !important; }
      .info-label { padding: 12px 0 2px !important; border-bottom: 0 !important; }
      .info-value { padding: 0 0 12px !important; }
      .btn, .btn a { display: block !important; width: 100% !important; box-sizing: border-box; }
      .code { font-size: 30px !important; letter-spacing: 7px !important; }
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
      <td class="outer-pad" align="center" style="padding:28px 12px;">
        <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" class="container card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${C.cardBg};border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(11,27,58,0.10);">
          ${renderTopBar()}
          ${renderHero(heroText, accent)}
          <tr>
            <td class="content content-row" style="background-color:${C.cardBg};padding:36px 40px 12px;font-family:${FONT};">
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
  return `<p class="txt" style="margin:0 0 16px;font-family:${FONT};font-size:17px;font-weight:600;color:${C.heading};">Bonjour${name ? ` ${name}` : ''},</p>`;
}

/** Paragraphe de corps de texte. */
export function paragraph(html: string): string {
  return `<p class="txt" style="margin:0 0 18px;font-family:${FONT};font-size:15px;line-height:1.7;color:${C.text};">${html}</p>`;
}

/** Bouton d'action principal — orange (couleur d'action Primeo), compatible Outlook (VML). */
export function button(url: string, label: string, accent: Accent = 'secondary'): string {
  const color = accent === 'danger' ? C.danger : accent === 'primary' ? C.primary : C.secondary;
  const gradient = accent === 'danger' ? G.danger : accent === 'primary' ? G.primary : G.secondary;
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:10px auto 26px;">
    <tr>
      <td class="btn" align="center" style="border-radius:12px;background-color:${color};background-image:${gradient};box-shadow:0 6px 16px rgba(0,0,0,0.12);">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:50px;v-text-anchor:middle;width:280px;" arcsize="24%" stroke="f" fillcolor="${color}">
          <w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${label}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${url}" target="_blank" style="display:inline-block;padding:16px 40px;font-family:${FONT};font-size:16px;font-weight:700;line-height:18px;color:#ffffff;text-decoration:none;border-radius:12px;text-align:center;">${label}</a>
        <!--<![endif]-->
      </td>
    </tr>
  </table>`;
}

/** Lien secondaire discret (ex : télécharger une facture). */
export function secondaryLink(url: string, label: string): string {
  return `<p style="margin:-8px 0 22px;text-align:center;font-family:${FONT};font-size:14px;"><a href="${url}" target="_blank" style="color:${C.primary};font-weight:700;text-decoration:none;">${label}</a></p>`;
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
    ? `<tr><td colspan="2" style="padding:0 0 6px;font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:${C.primary};">${opts.title}</td></tr>`
    : '';

  const body = rows
    .filter((r) => r.value !== '' && r.value != null)
    .map((r, i, arr) => {
      const isLast = i === arr.length - 1;
      const border = isLast ? '' : `border-bottom:1px solid ${C.border};`;
      const valueStyle = r.highlight
        ? `font-size:19px;font-weight:800;color:${C.primary};`
        : `font-size:15px;font-weight:700;color:${C.heading};`;
      return `
        <tr>
          <td class="info-label muted" width="45%" style="padding:12px 0;${border}font-family:${FONT};font-size:14px;color:${C.textMuted};vertical-align:top;">${r.label}</td>
          <td class="info-value txt" width="55%" style="padding:12px 0;${border}font-family:${FONT};text-align:right;vertical-align:top;${valueStyle}">${r.value}</td>
        </tr>`;
    })
    .join('');

  return `
  <table role="presentation" class="panel" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.panelBg};border:1px solid ${C.border};border-radius:14px;margin:4px 0 26px;">
    <tr><td style="padding:18px 22px 10px;">
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
  <table role="presentation" class="panel" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-radius:12px;background-color:${bg};">
    <tr><td class="txt" style="border-left:4px solid ${color};border-radius:12px;padding:15px 18px;font-family:${FONT};font-size:14px;line-height:1.65;color:${C.text};">${html}</td></tr>
  </table>`;
}

/** Bloc de code/OTP en grands caractères espacés. */
export function codeBlock(code: string): string {
  return `
  <table role="presentation" class="panel" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 24px;background-color:${C.panelBg};border:2px dashed ${C.primary};border-radius:14px;">
    <tr><td align="center" style="padding:26px 12px;">
      <span class="code" style="font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:38px;font-weight:800;letter-spacing:10px;color:${C.primary};">${code}</span>
    </td></tr>
  </table>`;
}

/** Signature standard de l'équipe. */
export function signature(): string {
  return `<p class="muted" style="margin:26px 0 24px;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.textMuted};">À très vite,<br><strong class="txt" style="color:${C.heading};">L’équipe Primeo</strong></p>`;
}

/** Séparateur horizontal léger. */
export function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;"><tr><td style="border-top:1px solid ${C.border};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/** Note discrète (ex : lien direct, validité, avertissement). */
export function muted(html: string): string {
  return `<p class="muted" style="margin:0 0 12px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.textFaint};">${html}</p>`;
}
