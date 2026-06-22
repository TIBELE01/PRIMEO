// website.controller.ts — Handlers pour les routes site vitrine
import { Request, Response, NextFunction } from 'express';
import { websiteService } from './website.service';

// ── Public ────────────────────────────────────────────────────────────────────

export async function getHero(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getHero()); } catch (e) { next(e); }
}

export async function getMission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getMission()); } catch (e) { next(e); }
}

export async function getSolutionsPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getSolutionsPreview()); } catch (e) { next(e); }
}

export async function getProductsPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getProductsPreview()); } catch (e) { next(e); }
}

export async function getWhy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getWhy()); } catch (e) { next(e); }
}

export async function getTestimonials(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getTestimonials()); } catch (e) { next(e); }
}

export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getStats()); } catch (e) { next(e); }
}

// ── Admin — Hero ──────────────────────────────────────────────────────────────

export async function adminUpdateHero(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, subtitle, buttonText, buttonUrl } = req.body;
    res.json(await websiteService.upsertHero({ title, subtitle, buttonText, buttonUrl }, req.user!.sub));
  } catch (e) { next(e); }
}

export async function adminUploadHeroImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ message: 'Fichier manquant' }); return; }
    res.json(await websiteService.uploadHeroImage(req.file.buffer, req.file.originalname, req.user!.sub));
  } catch (e) { next(e); }
}

// ── Admin — Mission ───────────────────────────────────────────────────────────

export async function adminUpdateMission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await websiteService.upsertMission(req.body.text, req.user!.sub));
  } catch (e) { next(e); }
}

// ── Admin — Solutions ─────────────────────────────────────────────────────────

export async function adminListSolutions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListSolutions()); } catch (e) { next(e); }
}

export async function adminCreateSolution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, summary, icon, link } = req.body;
    res.status(201).json(await websiteService.createSolution({ title, summary, icon: icon || '🏠', link: link || '/solutions' }));
  } catch (e) { next(e); }
}

export async function adminUpdateSolution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await websiteService.updateSolution(req.params['id']!, req.body));
  } catch (e) { next(e); }
}

export async function adminDeleteSolution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.deleteSolution(req.params['id']!); res.status(204).end(); } catch (e) { next(e); }
}

export async function adminReorderSolutions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderSolutions(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

// ── Admin — Products ──────────────────────────────────────────────────────────

export async function adminListProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListProducts()); } catch (e) { next(e); }
}

export async function adminCreateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, badge, link } = req.body;
    res.status(201).json(await websiteService.createProduct({ title, description, badge, link: link || '/produits' }));
  } catch (e) { next(e); }
}

export async function adminUpdateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await websiteService.updateProduct(req.params['id']!, req.body));
  } catch (e) { next(e); }
}

export async function adminUploadProductImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ message: 'Fichier manquant' }); return; }
    res.json(await websiteService.uploadProductImage(req.params['id']!, req.file.buffer, req.file.originalname));
  } catch (e) { next(e); }
}

export async function adminDeleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.deleteProduct(req.params['id']!); res.status(204).end(); } catch (e) { next(e); }
}

export async function adminReorderProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderProducts(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

// ── Admin — Why ───────────────────────────────────────────────────────────────

export async function adminListWhy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListWhy()); } catch (e) { next(e); }
}

export async function adminCreateWhy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, icon } = req.body;
    res.status(201).json(await websiteService.createWhy({ title, description, icon: icon || '⭐' }));
  } catch (e) { next(e); }
}

export async function adminUpdateWhy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await websiteService.updateWhy(req.params['id']!, req.body));
  } catch (e) { next(e); }
}

export async function adminDeleteWhy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.deleteWhy(req.params['id']!); res.status(204).end(); } catch (e) { next(e); }
}

export async function adminReorderWhy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderWhy(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

// ── Admin — Testimonials ──────────────────────────────────────────────────────

export async function adminListTestimonials(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListTestimonials()); } catch (e) { next(e); }
}

export async function adminCreateTestimonial(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, rating, text, role } = req.body;
    res.status(201).json(await websiteService.createTestimonial({ name, rating: Number(rating), text, role: role ?? null }));
  } catch (e) { next(e); }
}

export async function adminUpdateTestimonial(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rating, ...rest } = req.body;
    res.json(await websiteService.updateTestimonial(req.params['id']!, { ...rest, ...(rating !== undefined ? { rating: Number(rating) } : {}) }));
  } catch (e) { next(e); }
}

export async function adminUploadTestimonialPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ message: 'Fichier manquant' }); return; }
    res.json(await websiteService.uploadTestimonialPhoto(req.params['id']!, req.file.buffer, req.file.originalname));
  } catch (e) { next(e); }
}

export async function adminDeleteTestimonial(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.deleteTestimonial(req.params['id']!); res.status(204).end(); } catch (e) { next(e); }
}

export async function adminReorderTestimonials(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderTestimonials(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

// ── Public — Solutions page ───────────────────────────────────────────────────

export async function getSolutionsIntro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getSolutionsIntro()); } catch (e) { next(e); }
}

export async function getSolutionsBlocs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getSolutionsBlocs()); } catch (e) { next(e); }
}

// ── Admin — Solutions page ────────────────────────────────────────────────────

export async function adminUpdateSolutionsIntro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { headline, subtext } = req.body;
    res.json(await websiteService.upsertSolutionsIntro({ headline, subtext }, req.user!.sub));
  } catch (e) { next(e); }
}

export async function adminListSolutionsBlocs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListSolutionsBlocs()); } catch (e) { next(e); }
}

export async function adminCreateSolutionsBloc(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { icon, title, subtitle, description, features, ctaLabel, ctaUrl } = req.body;
    const featuresStr = typeof features === 'string' ? features : JSON.stringify(features || []);
    res.status(201).json(await websiteService.createSolutionsBloc({
      icon: icon || '🏨', title, subtitle, description,
      features: featuresStr, ctaLabel: ctaLabel || 'En savoir plus', ctaUrl: ctaUrl || '/solutions',
    }));
  } catch (e) { next(e); }
}

export async function adminUpdateSolutionsBloc(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { features, ...rest } = req.body;
    const data = { ...rest, ...(features !== undefined ? { features: typeof features === 'string' ? features : JSON.stringify(features) } : {}) };
    res.json(await websiteService.updateSolutionsBloc(req.params['id']!, data));
  } catch (e) { next(e); }
}

export async function adminDeleteSolutionsBloc(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.deleteSolutionsBloc(req.params['id']!); res.status(204).end(); } catch (e) { next(e); }
}

export async function adminReorderSolutionsBlocs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderSolutionsBlocs(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

// ── Public — Products page ────────────────────────────────────────────────────

export async function getProductsIntro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getProductsIntro()); } catch (e) { next(e); }
}
export async function getProductsSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getProductsSubscriptions()); } catch (e) { next(e); }
}
export async function getProductsBoost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getProductsBoost()); } catch (e) { next(e); }
}
export async function getProductsAds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getProductsAds()); } catch (e) { next(e); }
}
export async function getProductsDataPacks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getProductsDataPacks()); } catch (e) { next(e); }
}
export async function getProductsUpcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getProductsUpcoming()); } catch (e) { next(e); }
}

// ── Admin — Products page ─────────────────────────────────────────────────────

export async function adminUpdateProductsIntro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, paragraph } = req.body;
    res.json(await websiteService.upsertProductsIntro({ title, paragraph }, req.user!.sub));
  } catch (e) { next(e); }
}

export async function adminListSubPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListSubPlans()); } catch (e) { next(e); }
}
export async function adminUpdateSubPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.updateSubPlan(req.params['id']!, req.body)); } catch (e) { next(e); }
}

export async function adminListSubRows(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListSubRows()); } catch (e) { next(e); }
}
export async function adminCreateSubRow(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { feature, highlight, starter, business, entreprise } = req.body;
    res.status(201).json(await websiteService.createSubRow({ feature, highlight: !!highlight, starter: starter || '', business: business || '', entreprise: entreprise || '' }));
  } catch (e) { next(e); }
}
export async function adminUpdateSubRow(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.updateSubRow(req.params['id']!, req.body)); } catch (e) { next(e); }
}
export async function adminDeleteSubRow(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.deleteSubRow(req.params['id']!); res.status(204).end(); } catch (e) { next(e); }
}
export async function adminReorderSubRows(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderSubRows(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

export async function adminUpdateProductsBoost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, price, duration, ctaLabel, ctaUrl } = req.body;
    res.json(await websiteService.upsertProductsBoost({ title, description, price: Number(price), duration: Number(duration), ctaLabel, ctaUrl }, req.user!.sub));
  } catch (e) { next(e); }
}

export async function adminUpdateProductsAds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, formats, ctaLabel, ctaUrl } = req.body;
    const formatsStr = typeof formats === 'string' ? formats : JSON.stringify(formats || []);
    res.json(await websiteService.upsertProductsAds({ title, description, formats: formatsStr, ctaLabel, ctaUrl }, req.user!.sub));
  } catch (e) { next(e); }
}

export async function adminListDataPacks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListDataPacks()); } catch (e) { next(e); }
}
export async function adminCreateDataPack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { icon, title, description, price, ctaLabel, ctaUrl } = req.body;
    res.status(201).json(await websiteService.createDataPack({ icon: icon || '📊', title, description, price: Number(price), ctaLabel: ctaLabel || 'Acheter ce rapport', ctaUrl: ctaUrl || '/contact/' }));
  } catch (e) { next(e); }
}
export async function adminUpdateDataPack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { price, ...rest } = req.body;
    res.json(await websiteService.updateDataPack(req.params['id']!, { ...rest, ...(price !== undefined ? { price: Number(price) } : {}) }));
  } catch (e) { next(e); }
}
export async function adminDeleteDataPack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.deleteDataPack(req.params['id']!); res.status(204).end(); } catch (e) { next(e); }
}
export async function adminReorderDataPacks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderDataPacks(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

export async function adminListUpcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListUpcoming()); } catch (e) { next(e); }
}
export async function adminCreateUpcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { icon, title, description } = req.body;
    res.status(201).json(await websiteService.createUpcoming({ icon: icon || '🚀', title, description }));
  } catch (e) { next(e); }
}
export async function adminUpdateUpcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.updateUpcoming(req.params['id']!, req.body)); } catch (e) { next(e); }
}
export async function adminDeleteUpcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.deleteUpcoming(req.params['id']!); res.status(204).end(); } catch (e) { next(e); }
}
export async function adminReorderUpcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderUpcoming(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

// ── Public — Careers ─────────────────────────────────────────────────────────

export async function getCareersPresentation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getCareersPresentation()); } catch (e) { next(e); }
}

export async function getCareersTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getCareersTeam()); } catch (e) { next(e); }
}

export async function getCareersValues(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getCareersValues()); } catch (e) { next(e); }
}

export async function getCareersBenefits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getCareersBenefits()); } catch (e) { next(e); }
}

export async function getCareersFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getCareersFaq()); } catch (e) { next(e); }
}

export async function getCareersJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { department, type, location } = req.query as Record<string, string>;
    res.json(await websiteService.getCareersJobs({ department, type, location }));
  } catch (e) { next(e); }
}

export async function getCareersJobById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getCareersJobById(req.params.id)); } catch (e) { next(e); }
}

export async function submitSpontaneous(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { firstName, lastName, email, phone, message } = req.body;
    if (!firstName || !lastName || !email) {
      res.status(400).json({ message: 'Champs obligatoires manquants (prénom, nom, email)' }); return;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) { res.status(400).json({ message: 'Email invalide' }); return; }
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const result = await websiteService.submitSpontaneous({
      firstName, lastName, email, phone, message,
      cvBuffer: req.file?.buffer,
      cvFilename: req.file?.originalname,
      ipAddress,
    });
    res.status(201).json({ message: 'Candidature reçue avec succès', id: result.id });
  } catch (e) { next(e); }
}

// ── Admin — Careers ───────────────────────────────────────────────────────────

export async function adminGetCareersPresentation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminGetCareersPresentation()); } catch (e) { next(e); }
}

export async function adminUpsertCareersPresentation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, intro1, intro2, intro3 } = req.body;
    res.json(await websiteService.adminUpsertCareersPresentation({ title, intro1, intro2, intro3 }, req.user!.sub));
  } catch (e) { next(e); }
}

export async function adminGetCareersTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminGetCareersTeam()); } catch (e) { next(e); }
}

export async function adminUpsertCareersTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { text } = req.body;
    res.json(await websiteService.adminUpsertCareersTeam({ text }, req.user!.sub, req.file?.buffer, req.file?.originalname));
  } catch (e) { next(e); }
}

export async function adminListCareersValues(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListCareersValues()); } catch (e) { next(e); }
}

export async function adminCreateCareersValue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { icon, title, description } = req.body;
    res.status(201).json(await websiteService.adminCreateCareersValue({ icon, title, description }));
  } catch (e) { next(e); }
}

export async function adminUpdateCareersValue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminUpdateCareersValue(req.params.id, req.body)); } catch (e) { next(e); }
}

export async function adminDeleteCareersValue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteCareersValue(req.params.id)); } catch (e) { next(e); }
}
export async function adminReorderCareersValues(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderCareersValues(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

export async function adminListCareersBenefits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListCareersBenefits()); } catch (e) { next(e); }
}

export async function adminCreateCareersBenefit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description } = req.body;
    res.status(201).json(await websiteService.adminCreateCareersBenefit({ title, description }));
  } catch (e) { next(e); }
}

export async function adminUpdateCareersBenefit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminUpdateCareersBenefit(req.params.id, req.body)); } catch (e) { next(e); }
}

export async function adminDeleteCareersBenefit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteCareersBenefit(req.params.id)); } catch (e) { next(e); }
}
export async function adminReorderCareersBenefits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderCareersBenefits(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

export async function adminListCareersFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListCareersFaq()); } catch (e) { next(e); }
}

export async function adminCreateCareersFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { question, answer } = req.body;
    res.status(201).json(await websiteService.adminCreateCareersFaq({ question, answer }));
  } catch (e) { next(e); }
}

export async function adminUpdateCareersFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminUpdateCareersFaq(req.params.id, req.body)); } catch (e) { next(e); }
}

export async function adminDeleteCareersFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteCareersFaq(req.params.id)); } catch (e) { next(e); }
}
export async function adminReorderCareersFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderCareersFaq(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

export async function adminListCareersJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListCareersJobs()); } catch (e) { next(e); }
}

export async function adminCreateCareersJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json(await websiteService.adminCreateCareersJob(req.body)); } catch (e) { next(e); }
}

export async function adminUpdateCareersJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminUpdateCareersJob(req.params.id, req.body)); } catch (e) { next(e); }
}

export async function adminDeleteCareersJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteCareersJob(req.params.id)); } catch (e) { next(e); }
}

export async function adminListApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.query as { status?: string };
    res.json(await websiteService.adminListApplications(status));
  } catch (e) { next(e); }
}

export async function adminUpdateApplicationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, notes } = req.body;
    res.json(await websiteService.adminUpdateApplicationStatus(req.params.id, status, notes));
  } catch (e) { next(e); }
}

export async function adminDeleteApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteApplication(req.params.id)); } catch (e) { next(e); }
}

// ── Public — About ────────────────────────────────────────────────────────────

export async function getAboutHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getAboutHistory()); } catch (e) { next(e); }
}

export async function getAboutMission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getAboutMission()); } catch (e) { next(e); }
}

export async function getAboutValues(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getAboutValues()); } catch (e) { next(e); }
}

export async function getAboutTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getAboutTeam()); } catch (e) { next(e); }
}

export async function getAboutPartners(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getAboutPartners()); } catch (e) { next(e); }
}

// ── Admin — About ─────────────────────────────────────────────────────────────

export async function adminGetAboutHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminGetAboutHistory()); } catch (e) { next(e); }
}

export async function adminUpsertAboutHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, content } = req.body;
    res.json(await websiteService.adminUpsertAboutHistory({ title, content }, req.user!.sub));
  } catch (e) { next(e); }
}

export async function adminGetAboutMission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminGetAboutMission()); } catch (e) { next(e); }
}

export async function adminUpsertAboutMission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, content } = req.body;
    res.json(await websiteService.adminUpsertAboutMission({ title, content }, req.user!.sub));
  } catch (e) { next(e); }
}

export async function adminListAboutValues(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListAboutValues()); } catch (e) { next(e); }
}

export async function adminCreateAboutValue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { icon, title, description } = req.body;
    res.status(201).json(await websiteService.adminCreateAboutValue({ icon, title, description }));
  } catch (e) { next(e); }
}

export async function adminUpdateAboutValue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminUpdateAboutValue(req.params.id, req.body)); } catch (e) { next(e); }
}

export async function adminDeleteAboutValue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteAboutValue(req.params.id)); } catch (e) { next(e); }
}
export async function adminReorderAboutValues(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderAboutValues(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

export async function adminListAboutTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListAboutTeam()); } catch (e) { next(e); }
}

export async function adminCreateAboutTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, role, bio, initials } = req.body;
    res.status(201).json(await websiteService.adminCreateAboutTeam({ name, role, bio, initials }));
  } catch (e) { next(e); }
}

export async function adminUpdateAboutTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminUpdateAboutTeam(req.params.id, req.body)); } catch (e) { next(e); }
}

export async function adminUploadAboutTeamPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ message: 'Fichier manquant' }); return; }
    res.json(await websiteService.adminUploadAboutTeamPhoto(req.params.id, req.file.buffer, req.file.originalname));
  } catch (e) { next(e); }
}

export async function adminDeleteAboutTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteAboutTeam(req.params.id)); } catch (e) { next(e); }
}
export async function adminReorderAboutTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderAboutTeam(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

export async function adminListAboutPartners(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListAboutPartners()); } catch (e) { next(e); }
}

export async function adminCreateAboutPartner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, url } = req.body;
    res.status(201).json(await websiteService.adminCreateAboutPartner({ name, url }));
  } catch (e) { next(e); }
}

export async function adminUpdateAboutPartner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminUpdateAboutPartner(req.params.id, req.body)); } catch (e) { next(e); }
}

export async function adminUploadAboutPartnerLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ message: 'Fichier manquant' }); return; }
    res.json(await websiteService.adminUploadAboutPartnerLogo(req.params.id, req.file.buffer, req.file.originalname));
  } catch (e) { next(e); }
}

export async function adminDeleteAboutPartner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteAboutPartner(req.params.id)); } catch (e) { next(e); }
}
export async function adminReorderAboutPartners(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await websiteService.reorderAboutPartners(req.body.ids); res.json({ success: true }); } catch (e) { next(e); }
}

// ── Public config ─────────────────────────────────────────────────────────────

export async function getPublicConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { env } = await import('../../config/env.config');
    res.json({ geoapifyKey: env.GEOAPIFY_API_KEY ?? '' });
  } catch (e) { next(e); }
}

// ── Contact messages ──────────────────────────────────────────────────────────

import { z } from 'zod';

const contactSchema = z.object({
  name:          z.string().min(1, 'Nom requis').max(100),
  email:         z.string().email('Email invalide'),
  phone:         z.string().optional(),
  subject:       z.string().min(1, 'Sujet requis'),
  message:       z.string().min(10, 'Message trop court (min 10 caractères)').max(2000, 'Message trop long (max 2000 caractères)'),
  email_confirm: z.string().max(0, 'Bot détecté').optional(),
});

export async function submitContact(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      res.status(400).json({ message: 'Données invalides', errors }); return;
    }
    const { email_confirm: _hp, ...data } = parsed.data;
    const msg = await websiteService.submitContact(data);
    res.status(201).json({ message: 'Message envoyé avec succès', id: msg.id });
  } catch (e) { next(e); }
}

export async function adminListMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page   = Math.max(1, Number(req.query.page) || 1);
    const limit  = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = (['all', 'read', 'unread'].includes(String(req.query.status)) ? req.query.status : 'all') as 'all' | 'read' | 'unread';
    res.json(await websiteService.adminListMessages(page, limit, status));
  } catch (e) { next(e); }
}

export async function adminMarkRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await websiteService.adminMarkRead(req.params.id, Boolean(req.body.isRead)));
  } catch (e) { next(e); }
}

export async function adminReplyMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { replyText } = req.body;
    if (!replyText?.trim()) { res.status(400).json({ message: 'Le texte de réponse est requis' }); return; }
    const { env } = await import('../../config/env.config');
    const adminEmail = (req as any).user?.email || env.ADMIN_EMAIL || 'contact@primeo.ci';
    res.json(await websiteService.adminReplyMessage(req.params.id, replyText, adminEmail));
  } catch (e) { next(e); }
}

export async function adminExportMessages(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const csv = await websiteService.adminExportMessages();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="messages-contact-${Date.now()}.csv"`);
    res.send('﻿' + csv);
  } catch (e) { next(e); }
}

// ── Blog public ───────────────────────────────────────────────────────────────

import { z as zBlog } from 'zod';

export async function getBlogCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getBlogCategories()); } catch (e) { next(e); }
}

export async function getBlogPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 9));
    res.json(await websiteService.getBlogPosts(page, limit, req.query.category as string, req.query.search as string));
  } catch (e) { next(e); }
}

export async function getBlogPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const post = await websiteService.getBlogPost(req.params.slug);
    if (!post) { res.status(404).json({ message: 'Article introuvable' }); return; }
    res.json(post);
  } catch (e) { next(e); }
}

export async function getRelatedPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getRelatedPosts(req.params.slug)); } catch (e) { next(e); }
}

export async function subscribeNewsletter(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = zBlog.object({ email: zBlog.string().email('Email invalide') });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: parsed.error.flatten().fieldErrors.email?.[0] ?? 'Email invalide' }); return; }
    const sub = await websiteService.subscribeNewsletter(parsed.data.email);
    res.status(201).json({ message: 'Abonnement enregistré', id: sub.id });
  } catch (e) { next(e); }
}

export async function addBlogComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = zBlog.object({ name: zBlog.string().min(1), email: zBlog.string().email(), comment: zBlog.string().min(5).max(2000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: 'Données invalides', errors: parsed.error.flatten().fieldErrors }); return; }
    const { postId } = req.params;
    const c = await websiteService.addBlogComment(postId, parsed.data);
    res.status(201).json({ message: 'Commentaire soumis pour modération', id: c.id });
  } catch (e) { next(e); }
}

// ── Blog admin ────────────────────────────────────────────────────────────────

export async function adminListBlogPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    res.json(await websiteService.adminListBlogPosts(page, limit, req.query.status as string));
  } catch (e) { next(e); }
}

export async function adminGetBlogPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminGetBlogPost(req.params.id)); } catch (e) { next(e); }
}

export async function adminCreateBlogPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, slug, excerpt, contentHtml, author, readingTime, status, publishedAt, categoryIds } = req.body;
    if (!title || !contentHtml) { res.status(400).json({ message: 'Titre et contenu requis' }); return; }
    const generatedSlug = slug || title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    res.status(201).json(await websiteService.adminCreateBlogPost({
      title, slug: generatedSlug, excerpt, contentHtml,
      author: author || 'Équipe Primeo',
      readingTime: Number(readingTime) || 5,
      status: status || 'draft',
      publishedAt, categoryIds: Array.isArray(categoryIds) ? categoryIds : [],
    }));
  } catch (e) { next(e); }
}

export async function adminUpdateBlogPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, slug, excerpt, contentHtml, author, readingTime, status, publishedAt, categoryIds } = req.body;
    res.json(await websiteService.adminUpdateBlogPost(req.params.id, {
      title, slug, excerpt, contentHtml, author,
      readingTime: readingTime !== undefined ? Number(readingTime) : undefined,
      status, publishedAt, categoryIds: Array.isArray(categoryIds) ? categoryIds : undefined,
    }));
  } catch (e) { next(e); }
}

export async function adminDeleteBlogPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteBlogPost(req.params.id)); } catch (e) { next(e); }
}

export async function adminUploadBlogCover(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ message: 'Fichier manquant' }); return; }
    res.json(await websiteService.adminUploadBlogCover(req.params.id, req.file.buffer, req.file.originalname));
  } catch (e) { next(e); }
}

export async function adminListBlogCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListBlogCategories()); } catch (e) { next(e); }
}

export async function adminCreateBlogCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, slug } = req.body;
    if (!name) { res.status(400).json({ message: 'Nom requis' }); return; }
    const generatedSlug = slug || name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    res.status(201).json(await websiteService.adminCreateBlogCategory({ name, slug: generatedSlug }));
  } catch (e) { next(e); }
}

export async function adminUpdateBlogCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminUpdateBlogCategory(req.params.id, req.body)); } catch (e) { next(e); }
}

export async function adminDeleteBlogCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteBlogCategory(req.params.id)); } catch (e) { next(e); }
}

export async function adminListNewsletterSubscribers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    res.json(await websiteService.adminListNewsletterSubscribers(page, limit));
  } catch (e) { next(e); }
}

export async function adminExportNewsletterSubscribers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const csv = await websiteService.adminExportNewsletterSubscribers();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="newsletter-${Date.now()}.csv"`);
    res.send('﻿' + csv);
  } catch (e) { next(e); }
}

export async function adminUpdateNewsletterSubscriberStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminUpdateNewsletterSubscriberStatus(req.params.id!, req.body.status)); } catch (e) { next(e); }
}

export async function adminDeleteNewsletterSubscriber(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteNewsletterSubscriber(req.params.id)); } catch (e) { next(e); }
}

export async function adminListBlogComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    res.json(await websiteService.adminListBlogComments(page, limit, req.query.status as string));
  } catch (e) { next(e); }
}

export async function adminApproveComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminApproveComment(req.params.id)); } catch (e) { next(e); }
}

export async function adminDeleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteComment(req.params.id)); } catch (e) { next(e); }
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

import { z as zFaq } from 'zod';

const FaqSchema = zFaq.object({
  category: zFaq.string().min(1).max(100),
  question: zFaq.string().min(1).max(500),
  answer:   zFaq.string().min(1),
  order:    zFaq.number().int().min(0).default(0),
});

export async function getFaq(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getFaq()); } catch (e) { next(e); }
}

export async function adminListFaq(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListFaq()); } catch (e) { next(e); }
}

export async function adminCreateFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = FaqSchema.parse(req.body);
    res.status(201).json(await websiteService.adminCreateFaq(data));
  } catch (e) { next(e); }
}

export async function adminUpdateFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ message: 'ID invalide' }); return; }
    const data = FaqSchema.partial().parse(req.body);
    res.json(await websiteService.adminUpdateFaq(id, data));
  } catch (e) { next(e); }
}

export async function adminDeleteFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ message: 'ID invalide' }); return; }
    res.json(await websiteService.adminDeleteFaq(id));
  } catch (e) { next(e); }
}

// ── Partnership requests ───────────────────────────────────────────────────

import { z as zPartner } from 'zod';

const PartnershipSchema = zPartner.object({
  companyName:     zPartner.string().min(1).max(150),
  contactName:     zPartner.string().min(1).max(100),
  email:           zPartner.string().email(),
  phone:           zPartner.string().max(30).optional(),
  partnershipType: zPartner.enum(['Technologique', 'Commercial', 'Média', 'Institutionnel']),
  message:         zPartner.string().min(20).max(2000),
});

const VALID_STATUSES = ['pending', 'reviewed', 'contacted', 'rejected'] as const;

export async function submitPartnership(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = PartnershipSchema.parse(req.body);
    const result = await websiteService.submitPartnership(data);
    res.status(201).json({ success: true, id: result.id });
  } catch (e) { next(e); }
}

export async function adminListPartnershipRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page   = Math.max(1, Number(req.query.page) || 1);
    const limit  = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string | undefined;
    res.json(await websiteService.adminListPartnershipRequests(page, limit, status));
  } catch (e) { next(e); }
}

export async function adminUpdatePartnershipStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ message: 'Statut invalide' });
      return;
    }
    res.json(await websiteService.adminUpdatePartnershipStatus(req.params.id, status));
  } catch (e) { next(e); }
}

export async function adminDeletePartnershipRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeletePartnershipRequest(req.params.id)); } catch (e) { next(e); }
}

// ── Community ──────────────────────────────────────────────────────────────

import { z as zComm } from 'zod';

const CommPostSchema = zComm.object({
  pseudo:      zComm.string().min(1).max(30),
  content:     zComm.string().min(1).max(2000),
  imageUrl:    zComm.string().url().optional(),
  challengeId: zComm.string().optional(),
});

const CommCommentSchema = zComm.object({
  pseudo:  zComm.string().min(1).max(30),
  content: zComm.string().min(1).max(500),
});

const CommReportSchema = zComm.object({
  targetType: zComm.enum(['post', 'comment']),
  targetId:   zComm.string().min(1),
  reason:     zComm.string().min(1).max(500),
});

const CommChallengeSchema = zComm.object({
  title:       zComm.string().min(1).max(120),
  description: zComm.string().min(1).max(1000),
  startDate:   zComm.coerce.date(),
  endDate:     zComm.coerce.date(),
  isActive:    zComm.boolean().default(true),
});

function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    ?? (req as any).socket?.remoteAddress
    ?? req.ip
    ?? 'unknown'
  );
}

export async function getCommunityPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const challengeId = req.query.challengeId as string | undefined;
    res.json(await websiteService.getCommunityPosts(page, limit, challengeId));
  } catch (e) { next(e); }
}

export async function getCommunityComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getCommunityComments(req.params.postId)); } catch (e) { next(e); }
}

export async function createCommunityPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = CommPostSchema.parse(req.body);
    const post = await websiteService.createCommunityPost(data, getIp(req));
    res.status(201).json(post);
  } catch (e) { next(e); }
}

export async function addCommunityComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = CommCommentSchema.parse(req.body);
    const comment = await websiteService.addCommunityComment(req.params.postId, data, getIp(req));
    res.status(201).json(comment);
  } catch (e) { next(e); }
}

export async function toggleCommunityLike(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { anonymousId } = req.body;
    if (!anonymousId || typeof anonymousId !== 'string') {
      res.status(400).json({ message: 'anonymousId requis' }); return;
    }
    res.json(await websiteService.toggleCommunityLike(req.params.postId, anonymousId));
  } catch (e) { next(e); }
}

export async function reportContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = CommReportSchema.parse(req.body);
    res.status(201).json(await websiteService.reportContent(data, getIp(req)));
  } catch (e) { next(e); }
}

export async function getChallenges(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.getChallenges()); } catch (e) { next(e); }
}

export async function adminListCommunityPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string | undefined;
    res.json(await websiteService.adminListCommunityPosts(page, limit, status));
  } catch (e) { next(e); }
}

export async function adminHideCommunityPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminSetCommunityPostStatus(req.params.id, 'hidden')); } catch (e) { next(e); }
}

export async function adminShowCommunityPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminSetCommunityPostStatus(req.params.id, 'published')); } catch (e) { next(e); }
}

export async function adminDeleteCommunityPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteCommunityPost(req.params.id)); } catch (e) { next(e); }
}

export async function adminListCommunityComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string | undefined;
    res.json(await websiteService.adminListCommunityComments(page, limit, status));
  } catch (e) { next(e); }
}

export async function adminHideCommunityComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminSetCommunityCommentStatus(req.params.id, 'hidden')); } catch (e) { next(e); }
}

export async function adminDeleteCommunityComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteCommunityComment(req.params.id)); } catch (e) { next(e); }
}

export async function adminListReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const resolvedRaw = req.query.resolved as string | undefined;
    const resolved = resolvedRaw === 'true' ? true : resolvedRaw === 'false' ? false : undefined;
    res.json(await websiteService.adminListReports(page, limit, resolved));
  } catch (e) { next(e); }
}

export async function adminResolveReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminResolveReport(req.params.id)); } catch (e) { next(e); }
}

export async function adminListChallenges(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminListChallenges()); } catch (e) { next(e); }
}

export async function adminCreateChallenge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = CommChallengeSchema.parse(req.body);
    res.status(201).json(await websiteService.adminCreateChallenge(data));
  } catch (e) { next(e); }
}

export async function adminUpdateChallenge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = CommChallengeSchema.partial().parse(req.body);
    res.json(await websiteService.adminUpdateChallenge(req.params.id, data));
  } catch (e) { next(e); }
}

export async function adminDeleteChallenge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await websiteService.adminDeleteChallenge(req.params.id)); } catch (e) { next(e); }
}
