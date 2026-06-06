import { websiteService } from './api';
import {
  HOME_DEFAULTS, SOLUTIONS_DEFAULTS, PRODUCTS_DEFAULTS,
  ABOUT_DEFAULTS, FAQ_DEFAULTS,
} from '../lib/websiteDefaults';

export type SyncResult = { section: string; status: 'ok' | 'seeded' | 'error'; detail?: string };

function isEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string') return val.trim() === '';
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') return Object.keys(val as object).length === 0;
  return false;
}

async function syncSection(
  name: string,
  check: () => Promise<unknown>,
  seed: () => Promise<unknown>,
): Promise<SyncResult> {
  try {
    const data = await check();
    if (!isEmpty(data)) return { section: name, status: 'ok' };
    await seed();
    return { section: name, status: 'seeded' };
  } catch (err: any) {
    return { section: name, status: 'error', detail: err?.message ?? 'Erreur inconnue' };
  }
}

export async function syncWebsiteDefaults(
  onProgress?: (result: SyncResult) => void,
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  const push = (r: SyncResult) => {
    results.push(r);
    onProgress?.(r);
    return r;
  };

  // Hero
  push(await syncSection(
    'Hero',
    () => websiteService.getHero().then(d => d?.title),
    () => websiteService.updateHero(HOME_DEFAULTS.hero),
  ));

  // Mission
  push(await syncSection(
    'Mission',
    () => websiteService.getMission().then(d => d?.text),
    () => websiteService.updateMission(HOME_DEFAULTS.mission.text),
  ));

  // Solutions preview
  push(await syncSection(
    'Solutions (aperçu)',
    () => websiteService.listSolutions(),
    async () => {
      for (const s of HOME_DEFAULTS.solutions_preview)
        await websiteService.createSolution(s);
    },
  ));

  // Products preview
  push(await syncSection(
    'Produits phares',
    () => websiteService.listProducts(),
    async () => {
      for (const p of HOME_DEFAULTS.products_preview)
        await websiteService.createProduct({ ...p, badge: p.badge ?? undefined });
    },
  ));

  // Why cards
  push(await syncSection(
    'Pourquoi Primeo',
    () => websiteService.listWhy(),
    async () => {
      for (const w of HOME_DEFAULTS.why)
        await websiteService.createWhy(w);
    },
  ));

  // Testimonials
  push(await syncSection(
    'Témoignages',
    () => websiteService.listTestimonials(),
    async () => {
      for (const t of HOME_DEFAULTS.testimonials)
        await websiteService.createTestimonial(t);
    },
  ));

  // Solutions page intro
  push(await syncSection(
    'Page Solutions (intro)',
    () => websiteService.getSolutionsPageIntro().then(d => d?.headline),
    () => websiteService.updateSolutionsPageIntro(SOLUTIONS_DEFAULTS.intro),
  ));

  // Solutions blocs
  push(await syncSection(
    'Page Solutions (blocs)',
    () => websiteService.listSolutionsBlocs(),
    async () => {
      for (const b of SOLUTIONS_DEFAULTS.blocs)
        await websiteService.createSolutionsBloc(b);
    },
  ));

  // Products page intro
  push(await syncSection(
    'Page Produits (intro)',
    () => websiteService.getProductsPageIntro().then(d => d?.title),
    () => websiteService.updateProductsPageIntro(PRODUCTS_DEFAULTS.intro),
  ));

  // Boost section
  push(await syncSection(
    'Boost (section)',
    () => websiteService.getProductsBoostSection().then(d => d?.title),
    () => websiteService.updateProductsBoostSection(PRODUCTS_DEFAULTS.boost),
  ));

  // Ads section
  push(await syncSection(
    'Publicité (section)',
    () => websiteService.getProductsAdsSection().then(d => d?.title),
    () => websiteService.updateProductsAdsSection({ ...PRODUCTS_DEFAULTS.ads, formats: JSON.stringify(PRODUCTS_DEFAULTS.ads.formats) }),
  ));

  // Data packs
  push(await syncSection(
    'Data Packs',
    () => websiteService.listDataPacks(),
    async () => {
      for (const p of PRODUCTS_DEFAULTS.dataPacks)
        await websiteService.createDataPack(p);
    },
  ));

  // Upcoming
  push(await syncSection(
    'À venir',
    () => websiteService.listUpcoming(),
    async () => {
      for (const u of PRODUCTS_DEFAULTS.upcoming)
        await websiteService.createUpcoming(u);
    },
  ));

  // About — history
  push(await syncSection(
    'À propos (histoire)',
    () => websiteService.getAboutHistory().then(d => d?.title),
    () => websiteService.upsertAboutHistory(ABOUT_DEFAULTS.history),
  ));

  // About — mission
  push(await syncSection(
    'À propos (mission)',
    () => websiteService.getAboutMission().then(d => d?.title),
    () => websiteService.upsertAboutMission(ABOUT_DEFAULTS.mission),
  ));

  // About — values
  push(await syncSection(
    'À propos (valeurs)',
    () => websiteService.listAboutValues(),
    async () => {
      for (const v of ABOUT_DEFAULTS.values)
        await websiteService.createAboutValue(v);
    },
  ));

  // About — team
  push(await syncSection(
    'À propos (équipe)',
    () => websiteService.listAboutTeam(),
    async () => {
      for (const m of ABOUT_DEFAULTS.team)
        await websiteService.createAboutTeam(m);
    },
  ));

  // FAQ
  push(await syncSection(
    'FAQ',
    () => websiteService.listFaq(),
    async () => {
      for (const f of FAQ_DEFAULTS)
        await websiteService.createFaq(f);
    },
  ));

  return results;
}
