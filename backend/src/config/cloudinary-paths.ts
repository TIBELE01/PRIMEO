// Arborescence Cloudinary de Primeo — source unique de vérité pour les chemins
// de dossiers. Tous les uploads DOIVENT passer par ces constructeurs afin que la
// médiathèque reste claire, hiérarchique et facile à maintenir.
//
//   Primeo/
//   ├── Users/{Clients|Professionals/{Residences,Hotels,RealEstates,Restaurants}|Admins}/{userId}/...
//   ├── Properties/{Residences,Hotels,RealEstates,Restaurants}/{propertyId}/{images,videos,3d,documents,menus}
//   ├── Website/{logo,favicon,team,partners,blog/{postId},testimonials,banners,careers}
//   ├── Marketing/{campaigns/{id},promotions,newsletters}
//   ├── System/{invoices,reports,exports,templates,icons}
//   ├── Community/{posts/{id},comments/{id}}
//   ├── Support/{tickets/{id},chatbot/training-data}
//   └── Temporary/{uploads,conversions,archives}
import type { AccountType, PropertyType, MediaType, DocumentType } from '@prisma/client';

export const MEDIA_ROOT = 'Primeo';

/** Segment Users/ correspondant au type de compte. */
export function userSegment(accountType: AccountType): string {
  switch (accountType) {
    case 'client': return 'Users/Clients';
    case 'professional_hebergement': return 'Users/Professionals/Residences';
    case 'professional_hotel': return 'Users/Professionals/Hotels';
    case 'professional_immobilier': return 'Users/Professionals/RealEstates';
    case 'restaurateur': return 'Users/Professionals/Restaurants';
    case 'admin': return 'Users/Admins';
    default: return 'Users/Clients';
  }
}

/** Segment Properties/ correspondant au type de bien. */
export function propertySegment(type: PropertyType): string {
  switch (type) {
    case 'residence': return 'Properties/Residences';
    case 'hotel': return 'Properties/Hotels';
    case 'immobilier_location':
    case 'immobilier_terrain':
    case 'immobilier_achat': return 'Properties/RealEstates';
    case 'restaurant': return 'Properties/Restaurants';
    default: return 'Properties/Residences';
  }
}

/** Sous-dossier média d'un bien selon le type de média. */
export function mediaSegment(mediaType: MediaType): 'images' | 'videos' | '3d' {
  if (mediaType === 'video') return 'videos';
  if (mediaType === 'virtual_tour_360') return '3d';
  return 'images';
}

/** Sous-dossier KYC selon le type de document. */
export function kycSegment(docType: DocumentType): string {
  switch (docType) {
    case 'id_card': return 'cni';
    case 'rccm_extract': return 'rccm';
    case 'tax_id_certificate': return 'attestation';
    case 'tourist_license': return 'licence';
    default: return 'other';
  }
}

const root = (p: string) => `${MEDIA_ROOT}/${p}`;

export const cloudinaryPaths = {
  // ── Users ────────────────────────────────────────────────────────────────
  userAvatar: (accountType: AccountType, userId: string) => root(`${userSegment(accountType)}/${userId}/profile`),
  userDocuments: (accountType: AccountType, userId: string) => root(`${userSegment(accountType)}/${userId}/documents`),
  kycDocument: (accountType: AccountType, userId: string, docType: DocumentType) =>
    root(`${userSegment(accountType)}/${userId}/kyc/${kycSegment(docType)}`),
  clientReviews: (userId: string) => root(`Users/Clients/${userId}/reviews`),
  restaurantMenus: (userId: string) => root(`Users/Professionals/Restaurants/${userId}/menus`),
  adminAvatar: (adminId: string) => root(`Users/Admins/${adminId}/profile`),

  // ── Properties ───────────────────────────────────────────────────────────
  propertyMedia: (type: PropertyType, propertyId: string, mediaType: MediaType) =>
    root(`${propertySegment(type)}/${propertyId}/${mediaSegment(mediaType)}`),
  propertyImages: (type: PropertyType, propertyId: string) => root(`${propertySegment(type)}/${propertyId}/images`),
  propertyVideos: (type: PropertyType, propertyId: string) => root(`${propertySegment(type)}/${propertyId}/videos`),
  property3d: (type: PropertyType, propertyId: string) => root(`${propertySegment(type)}/${propertyId}/3d`),
  propertyDocuments: (type: PropertyType, propertyId: string) => root(`${propertySegment(type)}/${propertyId}/documents`),
  restaurantPropertyMenus: (propertyId: string) => root(`Properties/Restaurants/${propertyId}/menus`),

  // ── Website ──────────────────────────────────────────────────────────────
  websiteLogo: () => root('Website/logo'),
  websiteFavicon: () => root('Website/favicon'),
  websiteTeam: () => root('Website/team'),
  websitePartners: () => root('Website/partners'),
  websiteTestimonials: () => root('Website/testimonials'),
  websiteBanners: () => root('Website/banners'),
  blogCover: (postId: string) => root(`Website/blog/${postId}`),
  blogImages: (postId: string) => root(`Website/blog/${postId}/images`),
  blogVideos: () => root('Website/blog/videos'),
  careersCv: () => root('Website/careers/cv'),
  careersTeam: () => root('Website/careers/team'),

  // ── Marketing ──────────────────────────────────────────────────────────────
  marketingCampaign: (campaignId: string, kind: 'images' | 'videos') => root(`Marketing/campaigns/${campaignId}/${kind}`),
  marketingPromotions: () => root('Marketing/promotions'),
  marketingNewsletters: () => root('Marketing/newsletters'),

  // ── System ──────────────────────────────────────────────────────────────────
  systemInvoices: () => root('System/invoices'),
  systemReports: () => root('System/reports'),
  systemExports: () => root('System/exports'),
  systemTemplates: () => root('System/templates'),
  systemIcons: () => root('System/icons'),

  // ── Community ────────────────────────────────────────────────────────────────
  communityPost: (postId: string, kind: 'images' | 'videos') => root(`Community/posts/${postId}/${kind}`),
  communityComment: (commentId: string) => root(`Community/comments/${commentId}/images`),

  // ── Support ──────────────────────────────────────────────────────────────────
  supportTicket: (ticketId: string, kind: 'attachments' | 'screenshots') => root(`Support/tickets/${ticketId}/${kind}`),
  supportChatbotTraining: () => root('Support/chatbot/training-data'),

  // ── Temporary ────────────────────────────────────────────────────────────────
  tempUploads: () => root('Temporary/uploads'),
  tempConversions: () => root('Temporary/conversions'),
  tempArchives: () => root('Temporary/archives'),
} as const;

// Liste « statique » des dossiers à pré-créer dans Cloudinary (ceux qui ne
// dépendent pas d'un identifiant dynamique {userId}/{propertyId}/…).
export const STATIC_FOLDERS: string[] = [
  'Users/Clients',
  'Users/Professionals/Residences',
  'Users/Professionals/Hotels',
  'Users/Professionals/RealEstates',
  'Users/Professionals/Restaurants',
  'Users/Admins',
  'Properties/Residences',
  'Properties/Hotels',
  'Properties/RealEstates',
  'Properties/Restaurants',
  'Website/logo',
  'Website/favicon',
  'Website/team',
  'Website/partners',
  'Website/testimonials',
  'Website/banners',
  'Website/blog',
  'Website/blog/videos',
  'Website/careers/cv',
  'Website/careers/team',
  'Marketing/campaigns',
  'Marketing/promotions',
  'Marketing/newsletters',
  'System/invoices',
  'System/reports',
  'System/exports',
  'System/templates',
  'System/icons',
  'Community/posts',
  'Community/comments',
  'Support/tickets',
  'Support/chatbot/training-data',
  'Temporary/uploads',
  'Temporary/conversions',
  'Temporary/archives',
].map((p) => `${MEDIA_ROOT}/${p}`);
