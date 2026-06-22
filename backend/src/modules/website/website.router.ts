// website.router.ts — Routes site vitrine (publiques + admin)
import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import * as c from './website.controller';

const spontaneousLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de candidatures soumises. Réessayez dans une heure.' },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de messages envoyés. Réessayez dans une heure.' },
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const websiteRouter = Router();

// ── Public ────────────────────────────────────────────────────────────────────
// Products page (public)
websiteRouter.get('/products/intro',         c.getProductsIntro);
websiteRouter.get('/products/subscriptions', c.getProductsSubscriptions);
websiteRouter.get('/products/boost',         c.getProductsBoost);
websiteRouter.get('/products/ads',           c.getProductsAds);
websiteRouter.get('/products/data',          c.getProductsDataPacks);
websiteRouter.get('/products/upcoming',      c.getProductsUpcoming);

websiteRouter.get('/solutions/intro',        c.getSolutionsIntro);
websiteRouter.get('/solutions/blocs',        c.getSolutionsBlocs);

websiteRouter.get('/home/hero',              c.getHero);
websiteRouter.get('/home/mission',           c.getMission);
websiteRouter.get('/home/solutions_preview', c.getSolutionsPreview);
websiteRouter.get('/home/products_preview',  c.getProductsPreview);
websiteRouter.get('/home/why',               c.getWhy);
websiteRouter.get('/home/testimonials',      c.getTestimonials);
websiteRouter.get('/stats',                  c.getStats);

websiteRouter.get('/public-config',          c.getPublicConfig);
websiteRouter.post('/contact', contactLimiter, c.submitContact);


// ── Public — Careers ──────────────────────────────────────────────────────────
websiteRouter.get('/careers/presentation',        c.getCareersPresentation);
websiteRouter.get('/careers/team',                c.getCareersTeam);
websiteRouter.get('/careers/values',              c.getCareersValues);
websiteRouter.get('/careers/benefits',            c.getCareersBenefits);
websiteRouter.get('/careers/faq',                 c.getCareersFaq);
websiteRouter.get('/careers/jobs',                c.getCareersJobs);
websiteRouter.get('/careers/jobs/:id',            c.getCareersJobById);
websiteRouter.post('/careers/spontaneous', spontaneousLimiter, upload.single('cv'), c.submitSpontaneous);

// ── Admin (super_admin + moderateur) ──────────────────────────────────────────
websiteRouter.use('/admin', authenticate, authorize('admin'));

// Hero
websiteRouter.put('/admin/hero',              c.adminUpdateHero);
websiteRouter.post('/admin/hero/image',       upload.single('file'), c.adminUploadHeroImage);

// Mission
websiteRouter.put('/admin/mission',           c.adminUpdateMission);

// Solutions preview
websiteRouter.get('/admin/solutions',                      c.adminListSolutions);
websiteRouter.post('/admin/solutions',                     c.adminCreateSolution);
websiteRouter.put('/admin/solutions/reorder',              c.adminReorderSolutions);
websiteRouter.put('/admin/solutions/:id',                  c.adminUpdateSolution);
websiteRouter.delete('/admin/solutions/:id',               c.adminDeleteSolution);

// Products preview
websiteRouter.get('/admin/products',                       c.adminListProducts);
websiteRouter.post('/admin/products',                      c.adminCreateProduct);
websiteRouter.put('/admin/products/reorder',               c.adminReorderProducts);
websiteRouter.put('/admin/products/:id',                   c.adminUpdateProduct);
websiteRouter.post('/admin/products/:id/image',            upload.single('file'), c.adminUploadProductImage);
websiteRouter.delete('/admin/products/:id',                c.adminDeleteProduct);

// Why cards
websiteRouter.get('/admin/why',                            c.adminListWhy);
websiteRouter.post('/admin/why',                           c.adminCreateWhy);
websiteRouter.put('/admin/why/reorder',                    c.adminReorderWhy);
websiteRouter.put('/admin/why/:id',                        c.adminUpdateWhy);
websiteRouter.delete('/admin/why/:id',                     c.adminDeleteWhy);

// Products page admin
websiteRouter.put('/admin/products-page/intro',            c.adminUpdateProductsIntro);
websiteRouter.get('/admin/products-plans',                 c.adminListSubPlans);
websiteRouter.put('/admin/products-plans/:id',             c.adminUpdateSubPlan);
websiteRouter.get('/admin/products-rows',                  c.adminListSubRows);
websiteRouter.post('/admin/products-rows',                 c.adminCreateSubRow);
websiteRouter.put('/admin/products-rows/reorder',          c.adminReorderSubRows);
websiteRouter.put('/admin/products-rows/:id',              c.adminUpdateSubRow);
websiteRouter.delete('/admin/products-rows/:id',           c.adminDeleteSubRow);
websiteRouter.put('/admin/products-page/boost',            c.adminUpdateProductsBoost);
websiteRouter.put('/admin/products-page/ads',              c.adminUpdateProductsAds);
websiteRouter.get('/admin/products-data',                  c.adminListDataPacks);
websiteRouter.post('/admin/products-data',                 c.adminCreateDataPack);
websiteRouter.put('/admin/products-data/reorder',          c.adminReorderDataPacks);
websiteRouter.put('/admin/products-data/:id',              c.adminUpdateDataPack);
websiteRouter.delete('/admin/products-data/:id',           c.adminDeleteDataPack);
websiteRouter.get('/admin/products-upcoming',              c.adminListUpcoming);
websiteRouter.post('/admin/products-upcoming',             c.adminCreateUpcoming);
websiteRouter.put('/admin/products-upcoming/reorder',      c.adminReorderUpcoming);
websiteRouter.put('/admin/products-upcoming/:id',          c.adminUpdateUpcoming);
websiteRouter.delete('/admin/products-upcoming/:id',       c.adminDeleteUpcoming);

// Solutions page intro + blocs
websiteRouter.put('/admin/solutions-page/intro',           c.adminUpdateSolutionsIntro);
websiteRouter.get('/admin/solutions-blocs',                c.adminListSolutionsBlocs);
websiteRouter.post('/admin/solutions-blocs',               c.adminCreateSolutionsBloc);
websiteRouter.put('/admin/solutions-blocs/reorder',        c.adminReorderSolutionsBlocs);
websiteRouter.put('/admin/solutions-blocs/:id',            c.adminUpdateSolutionsBloc);
websiteRouter.delete('/admin/solutions-blocs/:id',         c.adminDeleteSolutionsBloc);

// Testimonials
websiteRouter.get('/admin/testimonials',                   c.adminListTestimonials);
websiteRouter.post('/admin/testimonials',                  c.adminCreateTestimonial);
websiteRouter.put('/admin/testimonials/reorder',           c.adminReorderTestimonials);
websiteRouter.put('/admin/testimonials/:id',               c.adminUpdateTestimonial);
websiteRouter.post('/admin/testimonials/:id/photo',        upload.single('file'), c.adminUploadTestimonialPhoto);
websiteRouter.delete('/admin/testimonials/:id',            c.adminDeleteTestimonial);

// Admin — Careers
websiteRouter.get('/admin/careers/presentation',          c.adminGetCareersPresentation);
websiteRouter.put('/admin/careers/presentation',          c.adminUpsertCareersPresentation);
websiteRouter.get('/admin/careers/team',                  c.adminGetCareersTeam);
websiteRouter.put('/admin/careers/team',                  upload.single('photo'), c.adminUpsertCareersTeam);
websiteRouter.get('/admin/careers/values',                c.adminListCareersValues);
websiteRouter.post('/admin/careers/values',               c.adminCreateCareersValue);
websiteRouter.put('/admin/careers/values/reorder',        c.adminReorderCareersValues);
websiteRouter.put('/admin/careers/values/:id',            c.adminUpdateCareersValue);
websiteRouter.delete('/admin/careers/values/:id',         c.adminDeleteCareersValue);
websiteRouter.get('/admin/careers/benefits',              c.adminListCareersBenefits);
websiteRouter.post('/admin/careers/benefits',             c.adminCreateCareersBenefit);
websiteRouter.put('/admin/careers/benefits/reorder',      c.adminReorderCareersBenefits);
websiteRouter.put('/admin/careers/benefits/:id',          c.adminUpdateCareersBenefit);
websiteRouter.delete('/admin/careers/benefits/:id',       c.adminDeleteCareersBenefit);
websiteRouter.get('/admin/careers/faq',                   c.adminListCareersFaq);
websiteRouter.post('/admin/careers/faq',                  c.adminCreateCareersFaq);
websiteRouter.put('/admin/careers/faq/reorder',           c.adminReorderCareersFaq);
websiteRouter.put('/admin/careers/faq/:id',               c.adminUpdateCareersFaq);
websiteRouter.delete('/admin/careers/faq/:id',            c.adminDeleteCareersFaq);
websiteRouter.get('/admin/careers/jobs',                  c.adminListCareersJobs);
websiteRouter.post('/admin/careers/jobs',                 c.adminCreateCareersJob);
websiteRouter.put('/admin/careers/jobs/:id',              c.adminUpdateCareersJob);
websiteRouter.delete('/admin/careers/jobs/:id',           c.adminDeleteCareersJob);
websiteRouter.get('/admin/careers/applications',          c.adminListApplications);
websiteRouter.put('/admin/careers/applications/:id',      c.adminUpdateApplicationStatus);
websiteRouter.delete('/admin/careers/applications/:id',   c.adminDeleteApplication);

// ── Public — About ────────────────────────────────────────────────────────────
websiteRouter.get('/about/history',   c.getAboutHistory);
websiteRouter.get('/about/mission',   c.getAboutMission);
websiteRouter.get('/about/values',    c.getAboutValues);
websiteRouter.get('/about/team',      c.getAboutTeam);
websiteRouter.get('/about/partners',  c.getAboutPartners);

// Admin — About
websiteRouter.get('/admin/about/history',              c.adminGetAboutHistory);
websiteRouter.put('/admin/about/history',              c.adminUpsertAboutHistory);
websiteRouter.get('/admin/about/mission',              c.adminGetAboutMission);
websiteRouter.put('/admin/about/mission',              c.adminUpsertAboutMission);
websiteRouter.get('/admin/about/values',               c.adminListAboutValues);
websiteRouter.post('/admin/about/values',              c.adminCreateAboutValue);
websiteRouter.put('/admin/about/values/reorder',       c.adminReorderAboutValues);
websiteRouter.put('/admin/about/values/:id',           c.adminUpdateAboutValue);
websiteRouter.delete('/admin/about/values/:id',        c.adminDeleteAboutValue);
websiteRouter.get('/admin/about/team',                 c.adminListAboutTeam);
websiteRouter.post('/admin/about/team',                c.adminCreateAboutTeam);
websiteRouter.put('/admin/about/team/reorder',         c.adminReorderAboutTeam);
websiteRouter.put('/admin/about/team/:id',             c.adminUpdateAboutTeam);
websiteRouter.post('/admin/about/team/:id/photo',      upload.single('file'), c.adminUploadAboutTeamPhoto);
websiteRouter.delete('/admin/about/team/:id',          c.adminDeleteAboutTeam);
websiteRouter.get('/admin/about/partners',             c.adminListAboutPartners);
websiteRouter.post('/admin/about/partners',            c.adminCreateAboutPartner);
websiteRouter.put('/admin/about/partners/reorder',     c.adminReorderAboutPartners);
websiteRouter.put('/admin/about/partners/:id',         c.adminUpdateAboutPartner);
websiteRouter.post('/admin/about/partners/:id/logo',   upload.single('file'), c.adminUploadAboutPartnerLogo);
websiteRouter.delete('/admin/about/partners/:id',      c.adminDeleteAboutPartner);

// Messages
websiteRouter.get('/admin/messages',              c.adminListMessages);
websiteRouter.get('/admin/messages/export',       c.adminExportMessages);
websiteRouter.put('/admin/messages/:id/read',     c.adminMarkRead);
websiteRouter.post('/admin/messages/:id/reply',   c.adminReplyMessage);

// ── Public — Blog ──────────────────────────────────────────────────────────────
websiteRouter.get('/blog/categories',         c.getBlogCategories);
websiteRouter.get('/blog/posts',              c.getBlogPosts);
websiteRouter.get('/blog/posts/:slug/related', c.getRelatedPosts);
websiteRouter.get('/blog/posts/:slug',        c.getBlogPost);
websiteRouter.post('/blog/subscribe',         c.subscribeNewsletter);
websiteRouter.post('/blog/posts/:postId/comments', c.addBlogComment);

// ── Admin — Blog ───────────────────────────────────────────────────────────────
websiteRouter.get('/admin/blog/posts',                  c.adminListBlogPosts);
websiteRouter.post('/admin/blog/posts',                 c.adminCreateBlogPost);
websiteRouter.get('/admin/blog/posts/:id',              c.adminGetBlogPost);
websiteRouter.put('/admin/blog/posts/:id',              c.adminUpdateBlogPost);
websiteRouter.delete('/admin/blog/posts/:id',           c.adminDeleteBlogPost);
websiteRouter.post('/admin/blog/posts/:id/cover',       upload.single('file'), c.adminUploadBlogCover);
websiteRouter.get('/admin/blog/categories',             c.adminListBlogCategories);
websiteRouter.post('/admin/blog/categories',            c.adminCreateBlogCategory);
websiteRouter.put('/admin/blog/categories/:id',         c.adminUpdateBlogCategory);
websiteRouter.delete('/admin/blog/categories/:id',      c.adminDeleteBlogCategory);
websiteRouter.get('/admin/blog/newsletter',             c.adminListNewsletterSubscribers);
websiteRouter.get('/admin/blog/newsletter/export',      c.adminExportNewsletterSubscribers);
websiteRouter.put('/admin/blog/newsletter/:id/status',  c.adminUpdateNewsletterSubscriberStatus);
websiteRouter.delete('/admin/blog/newsletter/:id',      c.adminDeleteNewsletterSubscriber);
websiteRouter.get('/admin/blog/comments',               c.adminListBlogComments);
websiteRouter.put('/admin/blog/comments/:id/approve',   c.adminApproveComment);
websiteRouter.delete('/admin/blog/comments/:id',        c.adminDeleteComment);

// ── Public — FAQ ──────────────────────────────────────────────────────────────
websiteRouter.get('/faq',               c.getFaq);

// ── Admin — FAQ ───────────────────────────────────────────────────────────────
websiteRouter.get('/admin/faq',         c.adminListFaq);
websiteRouter.post('/admin/faq',        c.adminCreateFaq);
websiteRouter.put('/admin/faq/:id',     c.adminUpdateFaq);
websiteRouter.delete('/admin/faq/:id',  c.adminDeleteFaq);

// ── Public — Partnership ──────────────────────────────────────────────────────
const partnershipLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de demandes soumises. Réessayez dans une heure.' },
});

websiteRouter.post('/partnership', partnershipLimiter, c.submitPartnership);

// ── Admin — Partnership ───────────────────────────────────────────────────────
websiteRouter.get('/admin/partnerships',         c.adminListPartnershipRequests);
websiteRouter.put('/admin/partnerships/:id',     c.adminUpdatePartnershipStatus);
websiteRouter.delete('/admin/partnerships/:id',  c.adminDeletePartnershipRequest);

// ── Public — Community ─────────────────────────────────────────────────────
const communityPostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Limite de publications atteinte. Réessayez dans une heure.' },
});

const communityCommentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Limite de commentaires atteinte. Réessayez dans une heure.' },
});

websiteRouter.get('/community/posts',                     c.getCommunityPosts);
websiteRouter.get('/community/challenges',                c.getChallenges);
websiteRouter.get('/community/comments/:postId',          c.getCommunityComments);
websiteRouter.post('/community/posts',                    communityPostLimiter, c.createCommunityPost);
websiteRouter.post('/community/posts/:postId/comments',   communityCommentLimiter, c.addCommunityComment);
websiteRouter.post('/community/posts/:postId/like',       c.toggleCommunityLike);
websiteRouter.post('/community/report',                   c.reportContent);

// ── Admin — Community ──────────────────────────────────────────────────────
websiteRouter.get('/admin/community/posts',               c.adminListCommunityPosts);
websiteRouter.put('/admin/community/posts/:id/hide',      c.adminHideCommunityPost);
websiteRouter.put('/admin/community/posts/:id/show',      c.adminShowCommunityPost);
websiteRouter.delete('/admin/community/posts/:id',        c.adminDeleteCommunityPost);
websiteRouter.get('/admin/community/comments',            c.adminListCommunityComments);
websiteRouter.put('/admin/community/comments/:id/hide',   c.adminHideCommunityComment);
websiteRouter.delete('/admin/community/comments/:id',     c.adminDeleteCommunityComment);
websiteRouter.get('/admin/community/reports',             c.adminListReports);
websiteRouter.put('/admin/community/reports/:id/resolve', c.adminResolveReport);
websiteRouter.get('/admin/community/challenges',          c.adminListChallenges);
websiteRouter.post('/admin/community/challenges',         c.adminCreateChallenge);
websiteRouter.put('/admin/community/challenges/:id',      c.adminUpdateChallenge);
websiteRouter.delete('/admin/community/challenges/:id',   c.adminDeleteChallenge);
