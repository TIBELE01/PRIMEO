// Blocs de contenu statique du site vitrine — registre (versionné) + valeurs modifiées (base de données).
// Le registre liste TOUS les textes, liens, images et compteurs étiquetés `data-cms*` dans les pages du
// site vitrine ; l'administration peut remplacer chacun d'eux. Une clé sans valeur enregistrée garde le
// contenu d'origine de la page.
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { uploadToCloudinary } from '../../common/utils/s3-client';
import { cloudinaryPaths } from '../../config/cloudinary-paths';
import { createAudit } from '../admin/admin.service';
import registryJson from './content-registry.json';

export type BlockType = 'text' | 'html' | 'link' | 'image' | 'number';
export interface BlockDef {
  key: string; page: string; section: string; tag: string; type: BlockType;
  default: string; suffix?: string; alt?: string;
}

export const REGISTRY: BlockDef[] = registryJson as BlockDef[];
const BY_KEY = new Map(REGISTRY.map((b) => [b.key, b]));

export const PAGE_LABELS: Record<string, string> = {
  global: 'En-tête et pied de page (toutes les pages)', home: 'Accueil', solutions: 'Nos solutions', produits: 'Nos produits',
  'a-propos': 'À propos', aide: "Centre d'aide", blog: 'Blog', carrieres: 'Carrières', communaute: 'Communauté',
  contact: 'Contact', 'contact-merci': 'Contact — message envoyé', 'devenir-partenaire': 'Devenir partenaire',
  engagement: 'Engagement RSE', 'espace-presse': 'Espace presse', professionnels: 'Professionnels',
  telechargement: "Télécharger l'application", 'erreur-404': 'Page introuvable (404)', documentation: 'Documentation',
  'guide-client': 'Guide — Clients', 'guide-hotel': 'Guide — Hôteliers', 'guide-immobilier': 'Guide — Agents immobiliers',
  'guide-residence': 'Guide — Résidences', 'guide-restaurant': 'Guide — Restaurateurs', 'guide-revenus': 'Guide — Revenus',
};
const PAGES = new Set(Object.keys(PAGE_LABELS));

// ── Nettoyage du HTML saisi : liste blanche de balises, aucun script ni attribut d'événement ──────────────
const ALLOWED_TAGS = new Set(['a', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'small', 'mark', 'sup', 'sub', 'code']);
const SAFE_URL = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i;

export function sanitizeHtml(input: string): string {
  const withoutBlocks = input.replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  return withoutBlocks.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (full, tagRaw: string, attrs: string) => {
    const tag = tagRaw.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (full.startsWith('</')) return `</${tag}>`;
    if (tag === 'br') return '<br>';
    if (tag === 'a') {
      const href = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
      const url = (href?.[2] ?? href?.[3] ?? '').trim();
      if (!url || !SAFE_URL.test(url)) return '<a>';
      const external = /^https?:\/\//i.test(url);
      return `<a href="${url.replace(/"/g, '&quot;')}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>`;
    }
    return `<${tag}>`;
  });
}

function validate(def: BlockDef, raw: unknown): string {
  if (typeof raw !== 'string') throw new HttpError(400, 'Valeur invalide');
  const value = raw.trim();
  switch (def.type) {
    case 'text':
      if (value.length > 2000) throw new HttpError(400, 'Texte trop long (2000 caractères maximum)');
      return value.replace(/[<>]/g, '');
    case 'html': {
      const clean = sanitizeHtml(value);
      if (clean.length > 8000) throw new HttpError(400, 'Contenu trop long (8000 caractères maximum)');
      return clean;
    }
    case 'link':
      if (!value || !SAFE_URL.test(value)) throw new HttpError(400, 'Lien invalide : utilisez /chemin, https://…, mailto: ou tel:');
      return value;
    case 'image':
      if (!/^(https:\/\/|\/(?!\/))/i.test(value)) throw new HttpError(400, 'Image invalide : une URL https:// ou un chemin /… est attendu');
      return value;
    case 'number':
      if (!/^\d{1,9}$/.test(value)) throw new HttpError(400, 'Nombre entier positif attendu');
      return value;
    default:
      throw new HttpError(400, 'Type de bloc inconnu');
  }
}

export const websiteContentService = {
  pageExists: (page: string) => PAGES.has(page),

  /** Valeurs modifiées d'une page (+ blocs globaux) — consommé par le site vitrine. */
  async publicBlocks(page: string): Promise<Record<string, string>> {
    if (!PAGES.has(page)) throw new HttpError(404, 'Page inconnue');
    const rows = await prisma.websiteContentBlock.findMany({
      where: { page: { in: page === 'global' ? ['global'] : [page, 'global'] } },
      select: { key: true, value: true },
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },

  async adminPages() {
    const grouped = await prisma.websiteContentBlock.groupBy({ by: ['page'], _count: { _all: true } });
    const modified = new Map(grouped.map((g) => [g.page, g._count._all]));
    return Object.keys(PAGE_LABELS).map((page) => ({
      page,
      label: PAGE_LABELS[page],
      total: REGISTRY.filter((b) => b.page === page).length,
      modified: modified.get(page) ?? 0,
    }));
  },

  async adminList(query: { page?: string; q?: string }) {
    if (query.page && !PAGES.has(query.page)) throw new HttpError(400, 'Page inconnue');
    const defs = REGISTRY.filter((b) => (!query.page || b.page === query.page));
    const rows = await prisma.websiteContentBlock.findMany({ where: query.page ? { page: query.page } : {} });
    const overrides = new Map(rows.map((r) => [r.key, r]));
    const needle = query.q?.trim().toLowerCase();
    return defs
      .filter((d) => !needle || d.default.toLowerCase().includes(needle) || (overrides.get(d.key)?.value ?? '').toLowerCase().includes(needle) || d.key.includes(needle))
      .map((d) => {
        const o = overrides.get(d.key);
        return { ...d, value: o?.value ?? null, isModified: !!o, updatedAt: o?.updatedAt ?? null };
      });
  },

  async upsert(key: string, rawValue: unknown, adminId: string, ip?: string) {
    const def = BY_KEY.get(key);
    if (!def) throw new HttpError(404, 'Bloc de contenu introuvable');
    const value = validate(def, rawValue);
    const previous = await prisma.websiteContentBlock.findUnique({ where: { key } });
    const row = await prisma.websiteContentBlock.upsert({
      where: { key },
      create: { key, page: def.page, value, updatedBy: adminId },
      update: { value, updatedBy: adminId },
    });
    await createAudit({
      adminId, action: 'admin.website_content.update', targetType: 'website_content', targetId: key,
      description: `Contenu du site vitrine modifié : ${key}`, ipAddress: ip,
      metadata: { old: { value: previous?.value ?? def.default }, new: { value } },
    });
    return { key, value: row.value, isModified: true, updatedAt: row.updatedAt };
  },

  async reset(key: string, adminId: string, ip?: string) {
    const def = BY_KEY.get(key);
    if (!def) throw new HttpError(404, 'Bloc de contenu introuvable');
    const previous = await prisma.websiteContentBlock.findUnique({ where: { key } });
    if (previous) {
      await prisma.websiteContentBlock.delete({ where: { key } });
      await createAudit({
        adminId, action: 'admin.website_content.reset', targetType: 'website_content', targetId: key,
        description: `Contenu du site vitrine rétabli par défaut : ${key}`, ipAddress: ip,
        metadata: { old: { value: previous.value }, new: { value: def.default } },
      });
    }
    return { key, value: null, isModified: false };
  },

  async uploadImage(buffer: Buffer, filename: string) {
    if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(filename)) throw new HttpError(400, 'Format d\'image non accepté (PNG, JPG, WEBP, GIF, SVG)');
    const result = await uploadToCloudinary(buffer, cloudinaryPaths.websiteContent(), filename);
    return { url: result.url };
  },
};
