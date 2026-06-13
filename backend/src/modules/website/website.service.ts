// website.service.ts — Page d'accueil administrable du site vitrine
import { prisma } from '../../database/prisma.service';
import { redisGet, redisSet } from '../../common/utils/redis-client';
import { uploadToCloudinary, deleteFromCloudinary } from '../../common/utils/s3-client';
import { cloudinaryConfig } from '../../config/cloudinary.config';
import { sendEmail } from '../../common/utils/mailer';
import { HttpError } from '../../common/handlers/http-error.handler';
function createHttpError(status: number, msg: string) { return new HttpError(status, msg); }

// ── Defaults (fallback si base vide) ──────────────────────────────────────────

const DEFAULT_HERO = {
  title: "Primeo, la plateforme de confiance pour vos réservations d'hébergement, de services immobiliers et de restauration",
  subtitle: "Réservez facilement avec 3 options de paiement, visitez les lieux en 3D, et gérez vos biens sans commission.",
  buttonText: "Télécharger l'application",
  buttonUrl: '#',
  imageUrl: null,
};

const DEFAULT_MISSION = {
  text: "Primeo réinvente la réservation d'hébergement en Afrique francophone avec une approche locale, flexible et transparente. Pas de commission cachée, paiement adapté à vos habitudes.",
};

const DEFAULT_SOLUTIONS = [
  { id: 'default-1', title: 'Voyageurs', summary: "Trouvez et réservez facilement votre hébergement idéal en Côte d'Ivoire. Comparez les prix, lisez les avis, payez comme vous le souhaitez.", icon: '✈️', link: '/solutions', sortOrder: 0 },
  { id: 'default-2', title: "Professionnels de l'hébergement", summary: 'Publiez vos annonces, gérez vos réservations et boostez votre visibilité. Accédez à des outils professionnels pensés pour les hôteliers ivoiriens.', icon: '🏨', link: '/solutions', sortOrder: 1 },
  { id: 'default-3', title: 'Restaurateurs & Immobilier', summary: 'Gérez votre restaurant en ligne, acceptez des réservations de tables et publiez vos offres immobilières sur une seule et même plateforme.', icon: '🍽️', link: '/solutions', sortOrder: 2 },
];

const DEFAULT_PRODUCTS = [
  { id: 'default-1', title: "Formules d'abonnement", description: "Choisissez la formule adaptée à votre activité — Essentiel, Prestige ou Premium. Commencez gratuitement et évoluez selon vos besoins.", imageUrl: null, badge: null, link: '/produits', sortOrder: 0 },
  { id: 'default-2', title: "Boosts d'annonce", description: "Propulsez vos annonces en tête des résultats de recherche. Les boosts sont disponibles à la carte et leur effet est immédiat.", imageUrl: null, badge: 'Populaire', link: '/produits', sortOrder: 1 },
  { id: 'default-3', title: 'Visite 3D', description: "Offrez à vos clients une immersion virtuelle de votre bien. Les visites 3D augmentent les taux de conversion de 40%.", imageUrl: null, badge: 'Nouveau', link: '/produits', sortOrder: 2 },
];

const DEFAULT_WHY = [
  { id: 'default-1', title: 'Confiance', description: 'Chaque professionnel est vérifié et chaque paiement sécurisé. Nous garantissons une expérience fiable pour tous.', icon: '🛡️', sortOrder: 0 },
  { id: 'default-2', title: 'Flexibilité', description: 'Paiement intégral, acompte ou à l\'arrivée — choisissez le mode qui vous convient. Primeo s\'adapte à vos habitudes.', icon: '🔄', sortOrder: 1 },
  { id: 'default-3', title: 'Innovation', description: 'Visites 3D, paiement mobile, gestion temps réel : Primeo intègre les technologies les plus récentes pour votre confort.', icon: '🚀', sortOrder: 2 },
  { id: 'default-4', title: 'Local', description: "Conçu par des Ivoiriens pour le marché ivoirien. Nous comprenons vos besoins et parlons votre langue.", icon: '🌍', sortOrder: 3 },
];

const DEFAULT_TESTIMONIALS = [
  { id: 'default-1', name: 'Ama Konan', rating: 5, text: "Primeo m'a permis de trouver un appartement meublé à Cocody en moins de 24h. Le processus de réservation est ultra-simple.", photoUrl: null, sortOrder: 0 },
  { id: 'default-2', name: 'Jean-Baptiste Koffi', rating: 5, text: "Grâce aux boosts, mes annonces reçoivent 3 fois plus de vues. Mon taux d'occupation est passé de 60% à 90% en un mois !", photoUrl: null, sortOrder: 1 },
  { id: 'default-3', name: 'Marie Touré', rating: 4, text: "Excellent service client et interface très intuitive. Je recommande Primeo à tous les propriétaires qui veulent gagner du temps.", photoUrl: null, sortOrder: 2 },
  { id: 'default-4', name: 'David Assi', rating: 5, text: "La visite 3D est une révolution ! Mes clients réservent maintenant sans même avoir visité physiquement. Incroyable gain de temps.", photoUrl: null, sortOrder: 3 },
];

const DEFAULT_SOLUTIONS_INTRO = {
  headline: 'Une offre adaptée à chaque usage',
  subtext: "Que vous soyez voyageur, professionnel de l'hébergement, restaurateur ou agent immobilier, Primeo s'adapte à vos besoins.",
};

const DEFAULT_SOLUTIONS_BLOCS = [
  {
    id: 'default-1', icon: '✈️', title: 'Pour les Voyageurs',
    subtitle: 'Trouvez et réservez votre hébergement idéal',
    description: "Explorez des centaines d'hébergements vérifiés à Abidjan et partout en Côte d'Ivoire. Comparez les prix, lisez les avis authentiques, payez à votre convenance et vivez des séjours mémorables.",
    features: [
      { icon: '🔍', text: 'Recherche avancée par quartier, prix et type' },
      { icon: '🏅', text: 'Hébergements vérifiés et notés' },
      { icon: '💳', text: 'Paiement intégral, acompte ou sur place' },
      { icon: '🔭', text: 'Visites virtuelles 360° avant réservation' },
      { icon: '📱', text: 'Application mobile intuitive' },
      { icon: '🛡️', text: 'Garantie remboursement en cas de litige' },
    ],
    ctaLabel: 'Explorer les hébergements', ctaUrl: '/mobile', sortOrder: 0, active: true,
  },
  {
    id: 'default-2', icon: '🏨', title: "Hôteliers & Propriétaires",
    subtitle: "Maximisez votre taux d'occupation",
    description: "Publiez vos annonces en quelques minutes, gérez vos réservations en temps réel et augmentez votre visibilité grâce aux boosts d'annonces.",
    features: [
      { icon: '📋', text: 'Tableau de bord de gestion complet' },
      { icon: '📅', text: 'Calendrier de disponibilités en temps réel' },
      { icon: '🚀', text: 'Boosts pour propulser vos annonces' },
      { icon: '📊', text: 'Statistiques de performance détaillées' },
      { icon: '💬', text: 'Messagerie intégrée avec les clients' },
      { icon: '🔭', text: 'Outil de création de visite 3D' },
    ],
    ctaLabel: 'Devenir partenaire', ctaUrl: '/mobile', sortOrder: 1, active: true,
  },
  {
    id: 'default-3', icon: '🍽️', title: 'Restaurateurs',
    subtitle: 'Développez votre restaurant en ligne',
    description: "Acceptez des réservations de tables en ligne, gérez votre carte, publiez des offres spéciales et touchez une nouvelle clientèle.",
    features: [
      { icon: '📅', text: 'Réservations de tables en ligne 24h/24' },
      { icon: '🍴', text: 'Gestion de la carte et des menus' },
      { icon: '🎉', text: 'Promotions et offres spéciales ciblées' },
      { icon: '⭐', text: "Collecte d'avis clients vérifiés" },
      { icon: '📍', text: 'Référencement local optimisé' },
      { icon: '📊', text: "Analyse des couverts et du chiffre d'affaires" },
    ],
    ctaLabel: 'Référencer mon restaurant', ctaUrl: '/mobile', sortOrder: 2, active: true,
  },
  {
    id: 'default-4', icon: '🏗️', title: "Professionnels de l'Immobilier",
    subtitle: 'Publiez et gérez vos offres immobilières',
    description: "Que vous soyez agent, promoteur ou particulier, Primeo vous permet de publier vos annonces de vente et de location avec photos HD, visites virtuelles et outils de suivi de prospects.",
    features: [
      { icon: '🏠', text: 'Annonces vente et location illimitées' },
      { icon: '📷', text: 'Photos HD et visites virtuelles 3D' },
      { icon: '👥', text: 'Suivi des prospects et des demandes' },
      { icon: '📝', text: 'Signature électronique des contrats' },
      { icon: '📣', text: 'Campagnes de boost ciblées' },
      { icon: '🌍', text: 'Visibilité nationale et internationale' },
    ],
    ctaLabel: 'Publier une annonce', ctaUrl: '/mobile', sortOrder: 3, active: true,
  },
];

const DEFAULT_PRODUCTS_INTRO = {
  title: 'Des produits conçus pour votre réussite',
  paragraph: "Primeo propose une gamme complète de produits adaptés à la taille et aux objectifs de chaque professionnel — que vous débutiez ou gériez un portefeuille de biens important. Choisissez la formule qui vous correspond et évoluez à votre rythme.",
};

const DEFAULT_SUB_PLANS = [
  { id: 'starter',    slug: 'starter',    name: 'Starter',    price: 'Gratuit',  badge: null as string | null, highlighted: false, ctaLabel: 'Commencer gratuitement', ctaUrl: '/contact/', sortOrder: 0 },
  { id: 'business',   slug: 'business',   name: 'Business',   price: '9 000',    badge: 'Populaire',           highlighted: true,  ctaLabel: 'Choisir Business',       ctaUrl: '/contact/', sortOrder: 1 },
  { id: 'entreprise', slug: 'entreprise', name: 'Entreprise', price: '24 000',   badge: 'Best Value',          highlighted: false, ctaLabel: 'Choisir Entreprise',     ctaUrl: '/contact/', sortOrder: 2 },
];

const DEFAULT_SUB_ROWS = [
  { id: 'dr-1',  feature: 'Commission par réservation',   highlight: true,  starter: '0 %',       business: '0 %',        entreprise: '0 %'          },
  { id: 'dr-2',  feature: 'Publications incluses',        highlight: false, starter: '3',          business: '10',         entreprise: '40 (resto : ∞)' },
  { id: 'dr-3',  feature: 'Upload de vidéos',             highlight: false, starter: '✗',          business: '✓',          entreprise: '✓'            },
  { id: 'dr-4',  feature: 'Visite 3D immersive',          highlight: false, starter: '✗',          business: '✗',          entreprise: '✓'            },
  { id: 'dr-5',  feature: 'Badge Vérifié / Premium',      highlight: false, starter: '✗',          business: 'Vérifié',    entreprise: 'Premium'      },
  { id: 'dr-6',  feature: 'Visibilité dans les résultats',highlight: false, starter: 'Standard',   business: '+30 %',      entreprise: 'Prioritaire'  },
  { id: 'dr-7',  feature: 'Boosts gratuits / mois',       highlight: false, starter: '0',          business: '2 (3 j)',    entreprise: '7 (3 j)'      },
  { id: 'dr-8',  feature: 'Tableau de bord',              highlight: false, starter: 'Basique',    business: 'Analytique', entreprise: 'Analytique'   },
  { id: 'dr-9',  feature: 'Support',                      highlight: false, starter: 'Email 48h',  business: 'Chat 12h',   entreprise: 'VIP 4h 7j/7'  },
  { id: 'dr-10', feature: 'Multi-utilisateurs',           highlight: false, starter: '✗',          business: '✗',          entreprise: '✓'            },
  { id: 'dr-11', feature: 'Rapport mensuel PDF',          highlight: false, starter: '✗',          business: '✗',          entreprise: '✓'            },
  { id: 'dr-12', feature: 'Programme de fidélité client', highlight: false, starter: '✗',          business: '✗',          entreprise: '✓'            },
];

const DEFAULT_BOOST = {
  title: "Boosts d'annonce — Augmentez votre visibilité instantanément",
  description: "Pour seulement 2 000 FCFA, votre annonce est mise en avant pendant 72 heures en tête des résultats de recherche. Observez immédiatement l'effet sur vos vues et vos demandes de réservation.",
  price: 2000, duration: 72, imageUrl: null as string | null,
  ctaLabel: 'En savoir plus', ctaUrl: '/contact/',
};

const DEFAULT_ADS = {
  title: 'Publicité ciblée — Faites connaître votre entreprise',
  description: "Touchez des milliers d'utilisateurs actifs sur la plateforme Primeo. Nos espaces publicitaires permettent aux marques et prestataires de gagner en visibilité auprès d'une audience qualifiée.",
  formats: ['Bannières in-app', 'Notifications sponsorisées', 'Newsletter mensuelle', 'Encarts sur le site vitrine'],
  imageUrl: null as string | null, ctaLabel: 'Demander un devis', ctaUrl: '/contact/',
};

const DEFAULT_DATA_PACKS = [
  { id: 'dp-1', icon: '📈', title: 'Pack Market Trends',   description: 'Prix moyens par ville et quartier, évolution mensuelle des tarifs, saisonnalité de la demande.', price: 25000, ctaLabel: 'Acheter ce rapport', ctaUrl: '/contact/' },
  { id: 'dp-2', icon: '🏆', title: 'Pack Performance',     description: "Taux d'occupation comparé à la concurrence, analyse de votre positionnement prix, recommandations.", price: 40000, ctaLabel: 'Acheter ce rapport', ctaUrl: '/contact/' },
  { id: 'dp-3', icon: '👥', title: 'Pack Client Insights', description: 'Origines géographiques des clients, durée de séjour moyenne, préférences de paiement.', price: 35000, ctaLabel: 'Acheter ce rapport', ctaUrl: '/contact/' },
];

const DEFAULT_UPCOMING = [
  { id: 'du-1', icon: '🛡️', title: 'Assurance voyage',       description: 'Protection couvrant annulations et incidents pour voyageurs et hôtes.'               },
  { id: 'du-2', icon: '🤵', title: 'Conciergerie Primeo',    description: 'Service premium pour une gestion déléguée de vos propriétés.'                        },
  { id: 'du-3', icon: '🤝', title: 'Programme partenaires', description: 'Réseau de services locaux : ménage, maintenance, transferts aéroport.'                 },
  { id: 'du-4', icon: '💱', title: 'Paiement multi-devises', description: 'Acceptez XOF, EUR et USD pour attirer les voyageurs internationaux.'                  },
];

const DEFAULT_ABOUT_VALUES = [
  { icon: '🎯', title: 'Impact réel', description: 'Chaque fonctionnalité est conçue pour avoir un impact mesurable sur la vie de nos utilisateurs.', sortOrder: 0 },
  { icon: '🔍', title: 'Transparence', description: 'Nous croyons en la clarté : données claires, tarifs lisibles, zéro frais cachés.', sortOrder: 1 },
  { icon: '🌍', title: 'Ancrage local', description: "Conçu en Côte d'Ivoire, pour les réalités africaines.", sortOrder: 2 },
  { icon: '🚀', title: 'Innovation continue', description: 'Nous itérons constamment pour offrir la meilleure expérience possible.', sortOrder: 3 },
];

const DEFAULT_ABOUT_TEAM = [
  { name: 'Kouassi Abo', role: 'CEO & Co-fondateur', initials: 'KA', bio: "Entrepreneur de l'immobilier, 10 ans d'expérience dans le logement et l'hospitalité en Côte d'Ivoire.", sortOrder: 0 },
  { name: 'Aïssatou Fall', role: 'CTO & Co-fondatrice', initials: 'AF', bio: 'Développeuse full-stack, ancienne ingénieure chez Orange CI.', sortOrder: 1 },
  { name: 'Moussa Yao', role: 'Directeur Commercial', initials: 'MY', bio: 'Spécialiste en développement des affaires B2B et partenariats stratégiques.', sortOrder: 2 },
  { name: 'Sylvie Brou', role: 'Responsable Produit', initials: 'SB', bio: 'UX designer et chef de produit, passionnée par les interfaces inclusives.', sortOrder: 3 },
];

const DEFAULT_FAQ = [
  { category: 'Général', question: "Qu'est-ce que Primeo ?", answer: "<p>Primeo est une plateforme de réservation d'hébergement et de mise en relation dédiée aux voyageurs et aux professionnels en Côte d'Ivoire.</p>", order: 1 },
  { category: 'Général', question: 'Comment créer un compte Primeo ?', answer: "<p>Rendez-vous sur app.primeo.ci/signup et renseignez votre adresse e-mail, votre numéro de téléphone et créez un mot de passe sécurisé.</p>", order: 2 },
  { category: 'Général', question: "Primeo est-il disponible partout en Côte d'Ivoire ?", answer: "<p>Oui, Primeo est accessible sur l'ensemble du territoire ivoirien. L'offre s'enrichit progressivement, en commençant par Abidjan et les grandes agglomérations.</p>", order: 3 },
  { category: 'Abonnements & Paiements', question: 'Quels sont les modes de paiement acceptés ?', answer: "<p>Nous acceptons : Mobile Money (Orange Money, MTN MoMo, Wave), Carte bancaire (Visa, Mastercard), et Virement bancaire pour les abonnements annuels.</p>", order: 1 },
  { category: 'Abonnements & Paiements', question: "Puis-je annuler mon abonnement à tout moment ?", answer: "<p>Oui, vous pouvez résilier depuis votre espace client (Paramètres → Abonnement → Résilier). La résiliation prend effet à la fin de la période en cours.</p>", order: 2 },
  { category: 'Compte & Sécurité', question: "J'ai oublié mon mot de passe, que faire ?", answer: "<p>Cliquez sur \"Mot de passe oublié ?\" sur la page de connexion. Vous recevrez un lien de réinitialisation valable 30 minutes.</p>", order: 1 },
  { category: 'Compte & Sécurité', question: "Comment activer la double authentification ?", answer: "<p>Dans votre espace client, accédez à Paramètres → Sécurité → Authentification à deux facteurs.</p>", order: 2 },
  { category: 'Application Mobile', question: "L'application Primeo est-elle disponible sur Android et iOS ?", answer: "<p>Oui, l'application est disponible sur Google Play Store et Apple App Store.</p>", order: 1 },
];

const STATS_CACHE_KEY = 'website:stats';
const STATS_TTL = 3600; // 1 heure

// ── Public read methods ───────────────────────────────────────────────────────

export const websiteService = {

  async getHero() {
    const row = await prisma.websiteHero.findFirst({ orderBy: { updatedAt: 'desc' } });
    return row ?? DEFAULT_HERO;
  },

  async getMission() {
    const row = await prisma.websiteMission.findFirst({ orderBy: { updatedAt: 'desc' } });
    return row ?? DEFAULT_MISSION;
  },

  async getSolutionsPreview() {
    const rows = await prisma.websiteSolutionCard.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.length > 0 ? rows : DEFAULT_SOLUTIONS;
  },

  async getProductsPreview() {
    const rows = await prisma.websiteProductCard.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.length > 0 ? rows : DEFAULT_PRODUCTS;
  },

  async getWhy() {
    const rows = await prisma.websiteWhyCard.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.length > 0 ? rows : DEFAULT_WHY;
  },

  async getTestimonials() {
    const rows = await prisma.websiteTestimonial.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.length > 0 ? rows : DEFAULT_TESTIMONIALS;
  },

  async getStats() {
    const cached = await redisGet(STATS_CACHE_KEY);
    if (cached) return JSON.parse(cached as string);

    const [properties, cities, reservations, clients] = await Promise.all([
      prisma.property.count({ where: { status: 'active' } }),
      prisma.property.findMany({
        where: { status: 'active' },
        select: { city: true },
        distinct: ['city'],
      }).then(rows => rows.length),
      prisma.booking.count({ where: { status: 'confirmed' } }),
      prisma.user.count({ where: { accountType: 'client' } }),
    ]);

    const stats = { properties, cities, reservations, clients };
    await redisSet(STATS_CACHE_KEY, JSON.stringify(stats), STATS_TTL);
    return stats;
  },

  // ── Admin — Hero ───────────────────────────────────────────────────────────

  async upsertHero(data: { title: string; subtitle: string; buttonText: string; buttonUrl: string }, adminId: string) {
    const existing = await prisma.websiteHero.findFirst();
    if (existing) {
      return prisma.websiteHero.update({ where: { id: existing.id }, data: { ...data, updatedBy: adminId } });
    }
    return prisma.websiteHero.create({ data: { ...data, updatedBy: adminId } });
  },

  async uploadHeroImage(fileBuffer: Buffer, filename: string, adminId: string) {
    const result = await uploadToCloudinary(fileBuffer, cloudinaryConfig.folders.website, filename);
    const existing = await prisma.websiteHero.findFirst();
    if (existing?.imagePublicId) {
      await deleteFromCloudinary(existing.imagePublicId).catch(() => null);
    }
    const data = { imageUrl: result.url, imagePublicId: result.publicId, updatedBy: adminId };
    if (existing) return prisma.websiteHero.update({ where: { id: existing.id }, data });
    return prisma.websiteHero.create({ data: { title: DEFAULT_HERO.title, subtitle: DEFAULT_HERO.subtitle, buttonText: DEFAULT_HERO.buttonText, buttonUrl: DEFAULT_HERO.buttonUrl, ...data } });
  },

  // ── Admin — Mission ────────────────────────────────────────────────────────

  async upsertMission(text: string, adminId: string) {
    const existing = await prisma.websiteMission.findFirst();
    if (existing) return prisma.websiteMission.update({ where: { id: existing.id }, data: { text, updatedBy: adminId } });
    return prisma.websiteMission.create({ data: { text, updatedBy: adminId } });
  },

  // ── Admin — Solutions preview ──────────────────────────────────────────────

  async adminListSolutions() {
    const rows = await prisma.websiteSolutionCard.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length > 0) return rows;
    await prisma.websiteSolutionCard.createMany({
      data: DEFAULT_SOLUTIONS.map(s => ({ title: s.title, summary: s.summary, icon: s.icon, link: s.link, sortOrder: s.sortOrder })),
    });
    return prisma.websiteSolutionCard.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async createSolution(data: { title: string; summary: string; icon: string; link: string }) {
    const max = await prisma.websiteSolutionCard.aggregate({ _max: { sortOrder: true } });
    return prisma.websiteSolutionCard.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async updateSolution(id: string, data: Partial<{ title: string; summary: string; icon: string; link: string; active: boolean }>) {
    await this._requireSolution(id);
    return prisma.websiteSolutionCard.update({ where: { id }, data });
  },

  async deleteSolution(id: string) {
    await this._requireSolution(id);
    return prisma.websiteSolutionCard.delete({ where: { id } });
  },

  async reorderSolutions(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.websiteSolutionCard.update({ where: { id }, data: { sortOrder: idx } })));
  },

  async _requireSolution(id: string) {
    const row = await prisma.websiteSolutionCard.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Carte solution introuvable');
    return row;
  },

  // ── Admin — Products preview ───────────────────────────────────────────────

  async adminListProducts() {
    const rows = await prisma.websiteProductCard.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length > 0) return rows;
    await prisma.websiteProductCard.createMany({
      data: DEFAULT_PRODUCTS.map(p => ({ title: p.title, description: p.description, badge: p.badge, link: p.link, sortOrder: p.sortOrder })),
    });
    return prisma.websiteProductCard.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async createProduct(data: { title: string; description: string; badge?: string; link: string }) {
    const max = await prisma.websiteProductCard.aggregate({ _max: { sortOrder: true } });
    return prisma.websiteProductCard.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async updateProduct(id: string, data: Partial<{ title: string; description: string; badge: string | null; link: string; active: boolean }>) {
    await this._requireProduct(id);
    return prisma.websiteProductCard.update({ where: { id }, data });
  },

  async uploadProductImage(id: string, fileBuffer: Buffer, filename: string) {
    const row = await this._requireProduct(id);
    if (row.imagePublicId) await deleteFromCloudinary(row.imagePublicId).catch(() => null);
    const result = await uploadToCloudinary(fileBuffer, cloudinaryConfig.folders.website, filename);
    return prisma.websiteProductCard.update({ where: { id }, data: { imageUrl: result.url, imagePublicId: result.publicId } });
  },

  async deleteProduct(id: string) {
    const row = await this._requireProduct(id);
    if (row.imagePublicId) await deleteFromCloudinary(row.imagePublicId).catch(() => null);
    return prisma.websiteProductCard.delete({ where: { id } });
  },

  async reorderProducts(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.websiteProductCard.update({ where: { id }, data: { sortOrder: idx } })));
  },

  async _requireProduct(id: string) {
    const row = await prisma.websiteProductCard.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Carte produit introuvable');
    return row;
  },

  // ── Admin — Why cards ──────────────────────────────────────────────────────

  async adminListWhy() {
    const rows = await prisma.websiteWhyCard.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length > 0) return rows;
    await prisma.websiteWhyCard.createMany({
      data: DEFAULT_WHY.map(w => ({ title: w.title, description: w.description, icon: w.icon, sortOrder: w.sortOrder })),
    });
    return prisma.websiteWhyCard.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async createWhy(data: { title: string; description: string; icon: string }) {
    const max = await prisma.websiteWhyCard.aggregate({ _max: { sortOrder: true } });
    return prisma.websiteWhyCard.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async updateWhy(id: string, data: Partial<{ title: string; description: string; icon: string; active: boolean }>) {
    await this._requireWhy(id);
    return prisma.websiteWhyCard.update({ where: { id }, data });
  },

  async deleteWhy(id: string) {
    await this._requireWhy(id);
    return prisma.websiteWhyCard.delete({ where: { id } });
  },

  async reorderWhy(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.websiteWhyCard.update({ where: { id }, data: { sortOrder: idx } })));
  },

  async _requireWhy(id: string) {
    const row = await prisma.websiteWhyCard.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Carte "Pourquoi" introuvable');
    return row;
  },

  // ── Admin — Testimonials ───────────────────────────────────────────────────

  async adminListTestimonials() {
    const rows = await prisma.websiteTestimonial.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length > 0) return rows;
    await prisma.websiteTestimonial.createMany({
      data: DEFAULT_TESTIMONIALS.map(t => ({ name: t.name, rating: t.rating, text: t.text, sortOrder: t.sortOrder })),
    });
    return prisma.websiteTestimonial.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async createTestimonial(data: { name: string; rating: number; text: string }) {
    const max = await prisma.websiteTestimonial.aggregate({ _max: { sortOrder: true } });
    return prisma.websiteTestimonial.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async updateTestimonial(id: string, data: Partial<{ name: string; rating: number; text: string; active: boolean }>) {
    await this._requireTestimonial(id);
    return prisma.websiteTestimonial.update({ where: { id }, data });
  },

  async uploadTestimonialPhoto(id: string, fileBuffer: Buffer, filename: string) {
    const row = await this._requireTestimonial(id);
    if (row.photoPublicId) await deleteFromCloudinary(row.photoPublicId).catch(() => null);
    const result = await uploadToCloudinary(fileBuffer, cloudinaryConfig.folders.website, filename);
    return prisma.websiteTestimonial.update({ where: { id }, data: { photoUrl: result.url, photoPublicId: result.publicId } });
  },

  async deleteTestimonial(id: string) {
    const row = await this._requireTestimonial(id);
    if (row.photoPublicId) await deleteFromCloudinary(row.photoPublicId).catch(() => null);
    return prisma.websiteTestimonial.delete({ where: { id } });
  },

  async reorderTestimonials(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.websiteTestimonial.update({ where: { id }, data: { sortOrder: idx } })));
  },

  async _requireTestimonial(id: string) {
    const row = await prisma.websiteTestimonial.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Témoignage introuvable');
    return row;
  },

  // ── Public — Solutions page ────────────────────────────────────────────────

  async getSolutionsIntro() {
    const row = await prisma.websiteSolutionsIntro.findFirst({ orderBy: { updatedAt: 'desc' } });
    return row ?? DEFAULT_SOLUTIONS_INTRO;
  },

  async getSolutionsBlocs() {
    const rows = await prisma.websiteSolutionsBloc.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length > 0) {
      return rows.map(r => ({ ...r, features: JSON.parse(r.features) as object[] }));
    }
    return DEFAULT_SOLUTIONS_BLOCS;
  },

  // ── Admin — Solutions page ─────────────────────────────────────────────────

  async upsertSolutionsIntro(data: { headline: string; subtext: string }, adminId: string) {
    const existing = await prisma.websiteSolutionsIntro.findFirst();
    if (existing) {
      return prisma.websiteSolutionsIntro.update({ where: { id: existing.id }, data: { ...data, updatedBy: adminId } });
    }
    return prisma.websiteSolutionsIntro.create({ data: { ...data, updatedBy: adminId } });
  },

  async adminListSolutionsBlocs() {
    const rows = await prisma.websiteSolutionsBloc.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length > 0) return rows;
    await prisma.websiteSolutionsBloc.createMany({
      data: DEFAULT_SOLUTIONS_BLOCS.map(b => ({
        icon: b.icon, title: b.title, subtitle: b.subtitle, description: b.description,
        features: JSON.stringify(b.features), ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl,
        sortOrder: b.sortOrder, active: b.active,
      })),
    });
    return prisma.websiteSolutionsBloc.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async createSolutionsBloc(data: { icon: string; title: string; subtitle: string; description: string; features: string; ctaLabel: string; ctaUrl: string }) {
    const max = await prisma.websiteSolutionsBloc.aggregate({ _max: { sortOrder: true } });
    return prisma.websiteSolutionsBloc.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async updateSolutionsBloc(id: string, data: Partial<{ icon: string; title: string; subtitle: string; description: string; features: string; ctaLabel: string; ctaUrl: string; active: boolean }>) {
    await this._requireSolutionsBloc(id);
    return prisma.websiteSolutionsBloc.update({ where: { id }, data });
  },

  async deleteSolutionsBloc(id: string) {
    await this._requireSolutionsBloc(id);
    return prisma.websiteSolutionsBloc.delete({ where: { id } });
  },

  async reorderSolutionsBlocs(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.websiteSolutionsBloc.update({ where: { id }, data: { sortOrder: idx } })));
  },

  async _requireSolutionsBloc(id: string) {
    const row = await prisma.websiteSolutionsBloc.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Bloc solution introuvable');
    return row;
  },

  // ── Public — Products page ─────────────────────────────────────────────────

  async getProductsIntro() {
    const row = await prisma.productsPageIntro.findFirst({ orderBy: { updatedAt: 'desc' } });
    return row ?? DEFAULT_PRODUCTS_INTRO;
  },

  async getProductsSubscriptions() {
    const [plans, rows] = await Promise.all([
      prisma.productsSubscriptionPlan.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.productsSubscriptionRow.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    return {
      plans: plans.length > 0 ? plans : DEFAULT_SUB_PLANS,
      rows: rows.length > 0 ? rows : DEFAULT_SUB_ROWS,
    };
  },

  async getProductsBoost() {
    const row = await prisma.productsBoostSection.findFirst({ orderBy: { updatedAt: 'desc' } });
    return row ?? DEFAULT_BOOST;
  },

  async getProductsAds() {
    const row = await prisma.productsAdsSection.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (row) return { ...row, formats: JSON.parse(row.formats) as string[] };
    return DEFAULT_ADS;
  },

  async getProductsDataPacks() {
    const rows = await prisma.productsDataPack.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    return rows.length > 0 ? rows : DEFAULT_DATA_PACKS;
  },

  async getProductsUpcoming() {
    const rows = await prisma.productsUpcoming.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    return rows.length > 0 ? rows : DEFAULT_UPCOMING;
  },

  // ── Admin — Products intro ─────────────────────────────────────────────────

  async upsertProductsIntro(data: { title: string; paragraph: string }, adminId: string) {
    const existing = await prisma.productsPageIntro.findFirst();
    if (existing) return prisma.productsPageIntro.update({ where: { id: existing.id }, data: { ...data, updatedBy: adminId } });
    return prisma.productsPageIntro.create({ data: { ...data, updatedBy: adminId } });
  },

  // ── Admin — Subscription plans ─────────────────────────────────────────────

  async adminListSubPlans() {
    const rows = await prisma.productsSubscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length > 0) return rows;
    await prisma.productsSubscriptionPlan.createMany({
      data: DEFAULT_SUB_PLANS.map(p => ({ slug: p.slug, name: p.name, price: p.price, badge: p.badge, highlighted: p.highlighted, ctaLabel: p.ctaLabel, ctaUrl: p.ctaUrl, sortOrder: p.sortOrder })),
      skipDuplicates: true,
    });
    return prisma.productsSubscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async updateSubPlan(id: string, data: Partial<{ name: string; price: string; badge: string | null; highlighted: boolean; ctaLabel: string; ctaUrl: string; active: boolean }>) {
    const row = await prisma.productsSubscriptionPlan.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Plan introuvable');
    return prisma.productsSubscriptionPlan.update({ where: { id }, data });
  },

  // ── Admin — Subscription rows ──────────────────────────────────────────────

  async adminListSubRows() {
    const rows = await prisma.productsSubscriptionRow.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length > 0) return rows;
    await prisma.productsSubscriptionRow.createMany({
      data: DEFAULT_SUB_ROWS.map((r, idx) => ({ feature: r.feature, highlight: r.highlight, starter: r.starter, business: r.business, entreprise: r.entreprise, sortOrder: idx })),
    });
    return prisma.productsSubscriptionRow.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async createSubRow(data: { feature: string; highlight?: boolean; starter: string; business: string; entreprise: string }) {
    const max = await prisma.productsSubscriptionRow.aggregate({ _max: { sortOrder: true } });
    return prisma.productsSubscriptionRow.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async updateSubRow(id: string, data: Partial<{ feature: string; highlight: boolean; starter: string; business: string; entreprise: string; active: boolean }>) {
    const row = await prisma.productsSubscriptionRow.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Ligne introuvable');
    return prisma.productsSubscriptionRow.update({ where: { id }, data });
  },

  async deleteSubRow(id: string) {
    const row = await prisma.productsSubscriptionRow.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Ligne introuvable');
    return prisma.productsSubscriptionRow.delete({ where: { id } });
  },

  async reorderSubRows(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.productsSubscriptionRow.update({ where: { id }, data: { sortOrder: idx } })));
  },

  // ── Admin — Boost section ──────────────────────────────────────────────────

  async upsertProductsBoost(data: { title: string; description: string; price: number; duration: number; ctaLabel: string; ctaUrl: string }, adminId: string) {
    const existing = await prisma.productsBoostSection.findFirst();
    if (existing) return prisma.productsBoostSection.update({ where: { id: existing.id }, data: { ...data, updatedBy: adminId } });
    return prisma.productsBoostSection.create({ data: { ...data, updatedBy: adminId } });
  },

  // ── Admin — Ads section ────────────────────────────────────────────────────

  async upsertProductsAds(data: { title: string; description: string; formats: string; ctaLabel: string; ctaUrl: string }, adminId: string) {
    const existing = await prisma.productsAdsSection.findFirst();
    if (existing) return prisma.productsAdsSection.update({ where: { id: existing.id }, data: { ...data, updatedBy: adminId } });
    return prisma.productsAdsSection.create({ data: { ...data, updatedBy: adminId } });
  },

  // ── Admin — Data packs ─────────────────────────────────────────────────────

  async adminListDataPacks() {
    const rows = await prisma.productsDataPack.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length > 0) return rows;
    await prisma.productsDataPack.createMany({
      data: DEFAULT_DATA_PACKS.map((p, idx) => ({ icon: p.icon, title: p.title, description: p.description, price: p.price, ctaLabel: p.ctaLabel, ctaUrl: p.ctaUrl, sortOrder: idx })),
    });
    return prisma.productsDataPack.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async createDataPack(data: { icon: string; title: string; description: string; price: number; ctaLabel: string; ctaUrl: string }) {
    const max = await prisma.productsDataPack.aggregate({ _max: { sortOrder: true } });
    return prisma.productsDataPack.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async updateDataPack(id: string, data: Partial<{ icon: string; title: string; description: string; price: number; ctaLabel: string; ctaUrl: string; active: boolean }>) {
    const row = await prisma.productsDataPack.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Pack introuvable');
    return prisma.productsDataPack.update({ where: { id }, data });
  },

  async deleteDataPack(id: string) {
    const row = await prisma.productsDataPack.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Pack introuvable');
    return prisma.productsDataPack.delete({ where: { id } });
  },

  async reorderDataPacks(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.productsDataPack.update({ where: { id }, data: { sortOrder: idx } })));
  },

  // ── Admin — Upcoming ──────────────────────────────────────────────────────

  async adminListUpcoming() {
    const rows = await prisma.productsUpcoming.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length > 0) return rows;
    await prisma.productsUpcoming.createMany({
      data: DEFAULT_UPCOMING.map((u, idx) => ({ icon: u.icon, title: u.title, description: u.description, sortOrder: idx })),
    });
    return prisma.productsUpcoming.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async createUpcoming(data: { icon: string; title: string; description: string }) {
    const max = await prisma.productsUpcoming.aggregate({ _max: { sortOrder: true } });
    return prisma.productsUpcoming.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async updateUpcoming(id: string, data: Partial<{ icon: string; title: string; description: string; active: boolean }>) {
    const row = await prisma.productsUpcoming.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Élément introuvable');
    return prisma.productsUpcoming.update({ where: { id }, data });
  },

  async deleteUpcoming(id: string) {
    const row = await prisma.productsUpcoming.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Élément introuvable');
    return prisma.productsUpcoming.delete({ where: { id } });
  },

  async reorderUpcoming(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.productsUpcoming.update({ where: { id }, data: { sortOrder: idx } })));
  },

  // ── Careers — Public ──────────────────────────────────────────────────────

  async getCareersPresentation() {
    return prisma.careersPresentation.findFirst() ?? {
      title: "Construisons l'avenir de l'immobilier ensemble",
      intro1: "Chez Primeo, chaque ligne de code, chaque partenariat, chaque décision contribue à un objectif commun : rendre le logement et l'hospitalité accessibles et fiables pour tous les Ivoiriens.",
      intro2: "Rejoindre Primeo, c'est intégrer une équipe soudée qui travaille sur des problématiques réelles, avec un impact direct sur le quotidien de milliers d'Ivoiriens.",
      intro3: null,
    };
  },

  async getCareersTeam() {
    return prisma.careersTeam.findFirst() ?? {
      photoUrl: null,
      text: "Une équipe soudée, passionnée, qui croit profondément en sa mission.",
    };
  },

  async getCareersValues() {
    const rows = await prisma.careersValue.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    if (rows.length) return rows;
    return [
      { id: 'def-1', icon: '🎯', title: 'Impact réel', description: 'Chaque fonctionnalité est conçue pour avoir un impact mesurable sur la vie de nos utilisateurs.' },
      { id: 'def-2', icon: '🔍', title: 'Transparence', description: 'Nous croyons en la clarté : données claires, tarifs lisibles, zéro frais cachés.' },
      { id: 'def-3', icon: '🌍', title: 'Ancrage local', description: "Conçu en Côte d'Ivoire, pour les réalités africaines — accessibilité, mobile-first, langues locales." },
      { id: 'def-4', icon: '🚀', title: 'Innovation continue', description: 'Nous itérons constamment pour offrir la meilleure expérience possible à nos utilisateurs.' },
    ];
  },

  async getCareersBenefits() {
    const rows = await prisma.careersBenefit.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    if (rows.length) return rows;
    return [
      { id: 'def-1', title: 'Salaire compétitif', description: 'Rémunération alignée avec le marché tech ivoirien, avec des revues annuelles basées sur la performance.' },
      { id: 'def-2', title: 'Télétravail flexible', description: 'Mode hybride : 2 jours de télétravail par semaine pour équilibrer vie pro et perso.' },
      { id: 'def-3', title: 'Formation continue', description: 'Budget formation annuel de 500 000 FCFA par employé pour certifications et conférences.' },
      { id: 'def-4', title: 'Assurance santé', description: 'Couverture santé complète pour vous et votre famille, incluant médecine générale et dentaire.' },
    ];
  },

  async getCareersFaq() {
    const rows = await prisma.careersFaq.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    if (rows.length) return rows;
    return [
      { id: 'def-1', question: 'Quel est le processus de recrutement ?', answer: 'Notre processus comprend : candidature en ligne, entretien téléphonique (30 min), test technique ou étude de cas, entretien final avec l\'équipe, puis offre sous 5 jours ouvrés.' },
      { id: 'def-2', question: 'Proposez-vous du télétravail ?', answer: 'Oui, nous proposons un mode hybride avec 2 jours de télétravail par semaine. Pour certains postes, le full remote est possible.' },
      { id: 'def-3', question: 'Comment soumettre une candidature spontanée ?', answer: 'Utilisez le formulaire en bas de cette page. Nous examinons toutes les candidatures spontanées et revenons vers vous si un profil correspond à nos besoins actuels ou futurs.' },
    ];
  },

  async getCareersJobs(filters: { department?: string; type?: string; location?: string }) {
    const where: Record<string, unknown> = { active: true };
    if (filters.department) where.department = filters.department;
    if (filters.type) where.type = filters.type;
    if (filters.location) where.location = { contains: filters.location, mode: 'insensitive' };
    return prisma.careersJob.findMany({ where, orderBy: { sortOrder: 'asc' }, select: {
      id: true, title: true, department: true, location: true, type: true, expiresAt: true, createdAt: true,
    }});
  },

  async getCareersJobById(id: string) {
    const job = await prisma.careersJob.findUnique({ where: { id, active: true } });
    if (!job) throw createHttpError(404, 'Offre introuvable');
    return job;
  },

  async submitSpontaneous(data: {
    firstName: string; lastName: string; email: string; phone?: string; message?: string;
    cvBuffer?: Buffer; cvFilename?: string; ipAddress?: string;
  }) {
    let cvUrl: string | undefined;
    let cvPublicId: string | undefined;
    if (data.cvBuffer && data.cvFilename) {
      const result = await uploadToCloudinary(data.cvBuffer, 'careers/cv', data.cvFilename);
      cvUrl = result.url;
      cvPublicId = result.publicId;
    }
    const app = await prisma.careersSpontaneous.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        message: data.message,
        cvUrl,
        cvPublicId,
        ipAddress: data.ipAddress,
      },
    });
    await sendEmail({
      to: [{ email: 'rh@primeo.ci', name: 'Primeo RH' }],
      subject: `Nouvelle candidature spontanée — ${data.firstName} ${data.lastName}`,
      htmlContent: `
        <h2>Nouvelle candidature spontanée</h2>
        <p><strong>Nom :</strong> ${data.firstName} ${data.lastName}</p>
        <p><strong>Email :</strong> ${data.email}</p>
        <p><strong>Téléphone :</strong> ${data.phone ?? 'Non renseigné'}</p>
        <p><strong>Message :</strong></p>
        <p>${data.message ? data.message.replace(/\n/g, '<br>') : 'Aucun message'}</p>
        ${cvUrl ? `<p><strong>CV :</strong> <a href="${cvUrl}">Télécharger le CV</a></p>` : ''}
        <hr>
        <p style="color:#888;font-size:12px">Candidature soumise le ${new Date().toLocaleString('fr-FR')}</p>
      `,
    }).catch(() => { /* non-bloquant */ });
    return app;
  },

  // ── Careers — Admin ───────────────────────────────────────────────────────

  async adminGetCareersPresentation() {
    return prisma.careersPresentation.findFirst();
  },

  async adminUpsertCareersPresentation(data: { title: string; intro1: string; intro2?: string; intro3?: string }, updatedBy: string) {
    const existing = await prisma.careersPresentation.findFirst();
    if (existing) return prisma.careersPresentation.update({ where: { id: existing.id }, data: { ...data, updatedBy } });
    return prisma.careersPresentation.create({ data: { ...data, updatedBy } });
  },

  async adminGetCareersTeam() {
    return prisma.careersTeam.findFirst();
  },

  async adminUpsertCareersTeam(data: { text: string }, updatedBy: string, photoBuffer?: Buffer, photoFilename?: string) {
    const existing = await prisma.careersTeam.findFirst();
    let photoUrl: string | undefined;
    let photoPublicId: string | undefined;
    if (photoBuffer && photoFilename) {
      if (existing?.photoPublicId) await deleteFromCloudinary(existing.photoPublicId).catch(() => {});
      const result = await uploadToCloudinary(photoBuffer, 'careers/team', photoFilename);
      photoUrl = result.url;
      photoPublicId = result.publicId;
    }
    const updateData = { text: data.text, updatedBy, ...(photoUrl ? { photoUrl, photoPublicId } : {}) };
    if (existing) return prisma.careersTeam.update({ where: { id: existing.id }, data: updateData });
    return prisma.careersTeam.create({ data: { text: data.text, updatedBy, photoUrl, photoPublicId } });
  },

  async adminListCareersValues() {
    return prisma.careersValue.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async adminCreateCareersValue(data: { icon: string; title: string; description: string }) {
    const max = await prisma.careersValue.aggregate({ _max: { sortOrder: true } });
    return prisma.careersValue.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async adminUpdateCareersValue(id: string, data: Partial<{ icon: string; title: string; description: string; active: boolean }>) {
    const row = await prisma.careersValue.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Valeur introuvable');
    return prisma.careersValue.update({ where: { id }, data });
  },

  async adminDeleteCareersValue(id: string) {
    const row = await prisma.careersValue.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Valeur introuvable');
    return prisma.careersValue.delete({ where: { id } });
  },

  async reorderCareersValues(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.careersValue.update({ where: { id }, data: { sortOrder: idx } })));
  },

  async adminListCareersBenefits() {
    return prisma.careersBenefit.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async adminCreateCareersBenefit(data: { title: string; description: string }) {
    const max = await prisma.careersBenefit.aggregate({ _max: { sortOrder: true } });
    return prisma.careersBenefit.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async adminUpdateCareersBenefit(id: string, data: Partial<{ title: string; description: string; active: boolean }>) {
    const row = await prisma.careersBenefit.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Avantage introuvable');
    return prisma.careersBenefit.update({ where: { id }, data });
  },

  async adminDeleteCareersBenefit(id: string) {
    const row = await prisma.careersBenefit.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Avantage introuvable');
    return prisma.careersBenefit.delete({ where: { id } });
  },

  async reorderCareersBenefits(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.careersBenefit.update({ where: { id }, data: { sortOrder: idx } })));
  },

  async adminListCareersFaq() {
    return prisma.careersFaq.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async adminCreateCareersFaq(data: { question: string; answer: string }) {
    const max = await prisma.careersFaq.aggregate({ _max: { sortOrder: true } });
    return prisma.careersFaq.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async adminUpdateCareersFaq(id: string, data: Partial<{ question: string; answer: string; active: boolean }>) {
    const row = await prisma.careersFaq.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'FAQ introuvable');
    return prisma.careersFaq.update({ where: { id }, data });
  },

  async adminDeleteCareersFaq(id: string) {
    const row = await prisma.careersFaq.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'FAQ introuvable');
    return prisma.careersFaq.delete({ where: { id } });
  },

  async reorderCareersFaq(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.careersFaq.update({ where: { id }, data: { sortOrder: idx } })));
  },

  async adminListCareersJobs() {
    return prisma.careersJob.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async adminCreateCareersJob(data: {
    title: string; department: string; location: string; type: string;
    description: string; profile: string; offer?: string; process?: string; expiresAt?: string;
  }) {
    const max = await prisma.careersJob.aggregate({ _max: { sortOrder: true } });
    return prisma.careersJob.create({ data: {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    }});
  },

  async adminUpdateCareersJob(id: string, data: Partial<{
    title: string; department: string; location: string; type: string;
    description: string; profile: string; offer: string; process: string;
    expiresAt: string; active: boolean; sortOrder: number;
  }>) {
    const row = await prisma.careersJob.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Offre introuvable');
    return prisma.careersJob.update({ where: { id }, data: {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    }});
  },

  async adminDeleteCareersJob(id: string) {
    const row = await prisma.careersJob.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Offre introuvable');
    return prisma.careersJob.delete({ where: { id } });
  },

  async adminListApplications(status?: string) {
    const where = status ? { status } : {};
    return prisma.careersSpontaneous.findMany({ where, orderBy: { createdAt: 'desc' } });
  },

  async adminUpdateApplicationStatus(id: string, status: string, notes?: string) {
    const row = await prisma.careersSpontaneous.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Candidature introuvable');
    return prisma.careersSpontaneous.update({ where: { id }, data: { status, notes } });
  },

  async adminDeleteApplication(id: string) {
    const row = await prisma.careersSpontaneous.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Candidature introuvable');
    if (row.cvPublicId) await deleteFromCloudinary(row.cvPublicId).catch(() => {});
    return prisma.careersSpontaneous.delete({ where: { id } });
  },

  // ── About — Public ────────────────────────────────────────────────────────

  async getAboutHistory() {
    return prisma.aboutHistory.findFirst() ?? {
      title: 'Notre histoire',
      content: "Primeo est née d'une conviction simple : les Ivoiriens méritent une plateforme moderne et fiable pour trouver, réserver et gérer leurs biens immobiliers et leurs hébergements.\n\nFondée à Abidjan en 2022 par une équipe passionnée d'immobilier et de technologie, Primeo réunit en un seul endroit résidences meublées, hôtels, locations longue durée, terrains et réservations de restaurants — pensée mobile-first pour les réalités ivoiriennes.\n\nAujourd'hui présente dans plusieurs villes du pays, nous poursuivons notre mission avec ambition : devenir la référence de l'immobilier et de l'hospitalité en Afrique de l'Ouest.",
    };
  },

  async getAboutMission() {
    return prisma.aboutMission.findFirst() ?? {
      title: 'Notre mission',
      content: "Faciliter l'accès au logement et à l'hospitalité pour tous les Ivoiriens, en connectant clients et professionnels — résidences, hôtels, agences immobilières et restaurants — au sein d'une plateforme transparente, sécurisée et sans frais cachés.\n\nNous croyons qu'un accès simple et fiable à un logement de qualité est un droit, pas un privilège.",
    };
  },

  async getAboutValues() {
    const rows = await prisma.aboutValue.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    if (rows.length) return rows;
    return [
      { id: 'd1', icon: '🎯', title: 'Impact réel', description: 'Chaque fonctionnalité est conçue pour avoir un impact mesurable sur la vie de nos utilisateurs.' },
      { id: 'd2', icon: '🔍', title: 'Transparence', description: 'Nous croyons en la clarté : données claires, tarifs lisibles, zéro frais cachés.' },
      { id: 'd3', icon: '🌍', title: 'Ancrage local', description: "Conçu en Côte d'Ivoire, pour les réalités africaines." },
      { id: 'd4', icon: '🚀', title: 'Innovation continue', description: 'Nous itérons constamment pour offrir la meilleure expérience possible.' },
    ];
  },

  async getAboutTeam() {
    const rows = await prisma.aboutTeam.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    if (rows.length) return rows;
    return [
      { id: 'd1', name: 'Kouassi Abo', role: 'CEO & Co-fondateur', initials: 'KA', bio: "Entrepreneur de l'immobilier, 10 ans d'expérience dans le logement et l'hospitalité en Côte d'Ivoire.", photoUrl: null },
      { id: 'd2', name: 'Aïssatou Fall', role: 'CTO & Co-fondatrice', initials: 'AF', bio: 'Développeuse full-stack, ancienne ingénieure chez Orange CI.', photoUrl: null },
      { id: 'd3', name: 'Moussa Yao', role: 'Directeur Commercial', initials: 'MY', bio: 'Spécialiste en développement des affaires B2B et partenariats stratégiques.', photoUrl: null },
      { id: 'd4', name: 'Sylvie Brou', role: 'Responsable Produit', initials: 'SB', bio: 'UX designer et chef de produit, passionnée par les interfaces inclusives.', photoUrl: null },
    ];
  },

  async getAboutPartners() {
    return prisma.aboutPartner.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
  },

  // ── About — Admin ─────────────────────────────────────────────────────────

  async adminGetAboutHistory() {
    return prisma.aboutHistory.findFirst() ?? {
      title: 'Notre histoire',
      content: "Primeo est née d'une conviction simple : les Ivoiriens méritent une plateforme moderne et fiable pour trouver, réserver et gérer leurs biens immobiliers et leurs hébergements.\n\nFondée à Abidjan en 2022 par une équipe passionnée d'immobilier et de technologie, Primeo réunit en un seul endroit résidences meublées, hôtels, locations longue durée, terrains et réservations de restaurants — pensée mobile-first pour les réalités ivoiriennes.\n\nAujourd'hui présente dans plusieurs villes du pays, nous poursuivons notre mission avec ambition : devenir la référence de l'immobilier et de l'hospitalité en Afrique de l'Ouest.",
    };
  },

  async adminUpsertAboutHistory(data: { title: string; content: string }, updatedBy: string) {
    const existing = await prisma.aboutHistory.findFirst();
    if (existing) return prisma.aboutHistory.update({ where: { id: existing.id }, data: { ...data, updatedBy } });
    return prisma.aboutHistory.create({ data: { ...data, updatedBy } });
  },

  async adminGetAboutMission() {
    return prisma.aboutMission.findFirst() ?? {
      title: 'Notre mission',
      content: "Faciliter l'accès au logement et à l'hospitalité pour tous les Ivoiriens, en connectant clients et professionnels — résidences, hôtels, agences immobilières et restaurants — au sein d'une plateforme transparente, sécurisée et sans frais cachés.\n\nNous croyons qu'un accès simple et fiable à un logement de qualité est un droit, pas un privilège.",
    };
  },

  async adminUpsertAboutMission(data: { title: string; content: string }, updatedBy: string) {
    const existing = await prisma.aboutMission.findFirst();
    if (existing) return prisma.aboutMission.update({ where: { id: existing.id }, data: { ...data, updatedBy } });
    return prisma.aboutMission.create({ data: { ...data, updatedBy } });
  },

  async adminListAboutValues() {
    const rows = await prisma.aboutValue.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length > 0) return rows;
    await prisma.aboutValue.createMany({ data: DEFAULT_ABOUT_VALUES });
    return prisma.aboutValue.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async adminCreateAboutValue(data: { icon: string; title: string; description: string }) {
    const max = await prisma.aboutValue.aggregate({ _max: { sortOrder: true } });
    return prisma.aboutValue.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async adminUpdateAboutValue(id: string, data: Partial<{ icon: string; title: string; description: string; active: boolean; sortOrder: number }>) {
    const row = await prisma.aboutValue.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Valeur introuvable');
    return prisma.aboutValue.update({ where: { id }, data });
  },

  async adminDeleteAboutValue(id: string) {
    const row = await prisma.aboutValue.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Valeur introuvable');
    return prisma.aboutValue.delete({ where: { id } });
  },

  async reorderAboutValues(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.aboutValue.update({ where: { id }, data: { sortOrder: idx } })));
  },

  async adminListAboutTeam() {
    const rows = await prisma.aboutTeam.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length > 0) return rows;
    await prisma.aboutTeam.createMany({ data: DEFAULT_ABOUT_TEAM });
    return prisma.aboutTeam.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async adminCreateAboutTeam(data: { name: string; role: string; bio?: string; initials?: string }) {
    const max = await prisma.aboutTeam.aggregate({ _max: { sortOrder: true } });
    return prisma.aboutTeam.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async adminUpdateAboutTeam(id: string, data: Partial<{ name: string; role: string; bio: string; initials: string; active: boolean; sortOrder: number }>) {
    const row = await prisma.aboutTeam.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Membre introuvable');
    return prisma.aboutTeam.update({ where: { id }, data });
  },

  async adminUploadAboutTeamPhoto(id: string, buffer: Buffer, filename: string) {
    const row = await prisma.aboutTeam.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Membre introuvable');
    if (row.photoPublicId) await deleteFromCloudinary(row.photoPublicId).catch(() => {});
    const result = await uploadToCloudinary(buffer, 'about/team', filename);
    return prisma.aboutTeam.update({ where: { id }, data: { photoUrl: result.url, photoPublicId: result.publicId } });
  },

  async adminDeleteAboutTeam(id: string) {
    const row = await prisma.aboutTeam.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Membre introuvable');
    if (row.photoPublicId) await deleteFromCloudinary(row.photoPublicId).catch(() => {});
    return prisma.aboutTeam.delete({ where: { id } });
  },

  async reorderAboutTeam(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.aboutTeam.update({ where: { id }, data: { sortOrder: idx } })));
  },

  async adminListAboutPartners() {
    return prisma.aboutPartner.findMany({ orderBy: { sortOrder: 'asc' } });
  },

  async adminCreateAboutPartner(data: { name: string; url?: string }) {
    const max = await prisma.aboutPartner.aggregate({ _max: { sortOrder: true } });
    return prisma.aboutPartner.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  },

  async adminUpdateAboutPartner(id: string, data: Partial<{ name: string; url: string; active: boolean; sortOrder: number }>) {
    const row = await prisma.aboutPartner.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Partenaire introuvable');
    return prisma.aboutPartner.update({ where: { id }, data });
  },

  async adminUploadAboutPartnerLogo(id: string, buffer: Buffer, filename: string) {
    const row = await prisma.aboutPartner.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Partenaire introuvable');
    if (row.logoPublicId) await deleteFromCloudinary(row.logoPublicId).catch(() => {});
    const result = await uploadToCloudinary(buffer, 'about/partners', filename);
    return prisma.aboutPartner.update({ where: { id }, data: { logoUrl: result.url, logoPublicId: result.publicId } });
  },

  async adminDeleteAboutPartner(id: string) {
    const row = await prisma.aboutPartner.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Partenaire introuvable');
    if (row.logoPublicId) await deleteFromCloudinary(row.logoPublicId).catch(() => {});
    return prisma.aboutPartner.delete({ where: { id } });
  },

  async reorderAboutPartners(ids: string[]) {
    await Promise.all(ids.map((id, idx) => prisma.aboutPartner.update({ where: { id }, data: { sortOrder: idx } })));
  },

  // ── Contact messages ────────────────────────────────────────────────────────

  async submitContact(data: { name: string; email: string; phone?: string; subject: string; message: string }) {
    const msg = await prisma.contactMessage.create({ data });

    // Confirmation to sender
    await sendEmail({
      to: [{ email: data.email, name: data.name }],
      subject: 'Primeo — Votre message a bien été reçu',
      htmlContent: `<div style="font-family:sans-serif;max-width:560px">
        <h2 style="color:#4f6af5">Bonjour ${data.name},</h2>
        <p>Nous avons bien reçu votre message. Notre équipe vous répondra sous <strong>24 heures ouvrées</strong>.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;width:120px">Sujet</td><td style="padding:8px 12px;border:1px solid #e5e7eb">${data.subject}</td></tr>
          <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Message</td><td style="padding:8px 12px;border:1px solid #e5e7eb">${data.message.replace(/\n/g, '<br>')}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px">Cordialement,<br>L'équipe Primeo</p>
      </div>`,
    }).catch(() => {});

    // Notification to admin
    const { env } = await import('../../config/env.config');
    if (env.ADMIN_EMAIL) {
      await sendEmail({
        to: [{ email: env.ADMIN_EMAIL }],
        subject: `[Contact] ${data.subject} — ${data.name}`,
        htmlContent: `<div style="font-family:sans-serif;max-width:560px">
          <h3 style="color:#4f6af5">Nouveau message de contact</h3>
          <table style="border-collapse:collapse;width:100%;margin:12px 0">
            <tr><td style="padding:6px 10px;background:#f3f4f6;font-weight:600;width:120px">Nom</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${data.name}</td></tr>
            <tr><td style="padding:6px 10px;background:#f3f4f6;font-weight:600">Email</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${data.email}</td></tr>
            ${data.phone ? `<tr><td style="padding:6px 10px;background:#f3f4f6;font-weight:600">Téléphone</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${data.phone}</td></tr>` : ''}
            <tr><td style="padding:6px 10px;background:#f3f4f6;font-weight:600">Sujet</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${data.subject}</td></tr>
            <tr><td style="padding:6px 10px;background:#f3f4f6;font-weight:600">Message</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${data.message.replace(/\n/g, '<br>')}</td></tr>
          </table>
        </div>`,
      }).catch(() => {});
    }

    return msg;
  },

  async adminListMessages(page: number, limit: number, status: 'all' | 'read' | 'unread' = 'all') {
    const where: Record<string, unknown> = {};
    if (status === 'read') where.isRead = true;
    if (status === 'unread') where.isRead = false;
    const [total, messages] = await Promise.all([
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    ]);
    return { messages, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async adminMarkRead(id: string, isRead: boolean) {
    const row = await prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Message introuvable');
    return prisma.contactMessage.update({ where: { id }, data: { isRead } });
  },

  async adminReplyMessage(id: string, replyText: string, adminEmail: string) {
    const row = await prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Message introuvable');
    await sendEmail({
      to: [{ email: row.email, name: row.name }],
      subject: `Re: ${row.subject} — Primeo`,
      htmlContent: `<div style="font-family:sans-serif;max-width:560px">
        <p>Bonjour ${row.name},</p>
        <p>${replyText.replace(/\n/g, '<br>')}</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
        <p style="color:#9ca3af;font-size:12px"><em>En réponse à votre message du ${new Date(row.createdAt).toLocaleDateString('fr-FR')} :</em><br>
        ${row.message.replace(/\n/g, '<br>')}</p>
        <p style="color:#6b7280;font-size:13px">Cordialement,<br>L'équipe Primeo</p>
      </div>`,
    });
    return prisma.contactMessage.update({ where: { id }, data: { isReplied: true, repliedAt: new Date(), repliedBy: adminEmail, isRead: true } });
  },

  async adminExportMessages() {
    const rows = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
    const headers = ['Date', 'Nom', 'Email', 'Téléphone', 'Sujet', 'Message', 'Lu', 'Répondu'];
    const lines = rows.map((m) => [
      new Date(m.createdAt).toLocaleString('fr-FR'),
      m.name, m.email, m.phone ?? '',
      m.subject,
      m.message.replace(/"/g, '""'),
      m.isRead ? 'Oui' : 'Non',
      m.isReplied ? 'Oui' : 'Non',
    ]);
    return [headers, ...lines].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  },

  // ── Blog — helpers ──────────────────────────────────────────────────────────

  async getBlogCategories() {
    return prisma.blogCategory.findMany({ orderBy: { name: 'asc' } });
  },

  async getBlogPosts(page: number, limit: number, category?: string, search?: string) {
    const where: Record<string, unknown> = { status: 'published', publishedAt: { lte: new Date() } };
    if (category) where.categories = { some: { category: { slug: category } } };
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
      { contentHtml: { contains: search, mode: 'insensitive' } },
    ];
    const [total, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, title: true, slug: true, excerpt: true,
          coverImageUrl: true, publishedAt: true, author: true,
          readingTime: true, status: true, createdAt: true, updatedAt: true,
          categories: { select: { category: true } },
        },
      }),
    ]);
    return {
      posts: posts.map((p) => ({ ...p, categories: p.categories.map((c) => c.category) })),
      total, page, limit, pages: Math.ceil(total / limit),
    };
  },

  async getBlogPost(slug: string) {
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: 'published' },
      include: { categories: { include: { category: true } } },
    });
    if (!post) return null;
    return { ...post, categories: post.categories.map((c) => c.category) };
  },

  async getRelatedPosts(slug: string) {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: { categories: { select: { categoryId: true } } },
    });
    if (!post) return [];
    const categoryIds = post.categories.map((c) => c.categoryId);
    const related = await prisma.blogPost.findMany({
      where: {
        slug: { not: slug },
        status: 'published',
        publishedAt: { lte: new Date() },
        ...(categoryIds.length > 0 ? { categories: { some: { categoryId: { in: categoryIds } } } } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: {
        id: true, title: true, slug: true, excerpt: true,
        coverImageUrl: true, publishedAt: true, author: true,
        readingTime: true, categories: { select: { category: true } },
      },
    });
    return related.map((p) => ({ ...p, categories: p.categories.map((c) => c.category) }));
  },

  async subscribeNewsletter(email: string) {
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing) throw createHttpError(409, 'Cet email est déjà abonné.');
    const sub = await prisma.newsletterSubscriber.create({ data: { email } });
    await sendEmail({
      to: [{ email }],
      subject: 'Bienvenue sur le blog Primeo !',
      htmlContent: `<div style="font-family:sans-serif;max-width:560px">
        <h2 style="color:#4f6af5">Abonnement confirmé 🎉</h2>
        <p>Merci de vous être abonné aux actualités du blog Primeo. Vous recevrez nos prochains articles directement dans votre boîte mail.</p>
        <p style="color:#6b7280;font-size:13px">Pour vous désabonner, répondez à cet email avec « STOP ».</p>
      </div>`,
    }).catch(() => {});
    return sub;
  },

  async addBlogComment(postId: string, data: { name: string; email: string; comment: string }) {
    const post = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!post) throw createHttpError(404, 'Article introuvable');
    return prisma.blogComment.create({ data: { postId, ...data } });
  },

  // ── Blog admin ─────────────────────────────────────────────────────────────

  async adminListBlogPosts(page: number, limit: number, status?: string) {
    const where = status && status !== 'all' ? { status } : {};
    const [total, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        include: { categories: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      posts: posts.map((p) => ({ ...p, categories: p.categories.map((c) => c.category) })),
      total, page, limit, pages: Math.ceil(total / limit),
    };
  },

  async adminGetBlogPost(id: string) {
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: { categories: { include: { category: true } } },
    });
    if (!post) throw createHttpError(404, 'Article introuvable');
    return { ...post, categories: post.categories.map((c) => c.category) };
  },

  async adminCreateBlogPost(data: {
    title: string; slug: string; excerpt?: string; contentHtml: string;
    author: string; readingTime: number; status: string; publishedAt?: string;
    categoryIds?: string[];
  }) {
    const { categoryIds = [], ...postData } = data;
    const post = await prisma.blogPost.create({
      data: {
        ...postData,
        publishedAt: postData.publishedAt ? new Date(postData.publishedAt) : null,
        categories: { create: categoryIds.map((id) => ({ categoryId: id })) },
      },
      include: { categories: { include: { category: true } } },
    });
    return { ...post, categories: post.categories.map((c) => c.category) };
  },

  async adminUpdateBlogPost(id: string, data: {
    title?: string; slug?: string; excerpt?: string; contentHtml?: string;
    author?: string; readingTime?: number; status?: string; publishedAt?: string;
    categoryIds?: string[];
  }) {
    const row = await prisma.blogPost.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Article introuvable');
    const { categoryIds, ...postData } = data;
    if (categoryIds !== undefined) {
      await prisma.blogPostCategory.deleteMany({ where: { postId: id } });
    }
    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...postData,
        ...(postData.publishedAt !== undefined ? { publishedAt: postData.publishedAt ? new Date(postData.publishedAt) : null } : {}),
        ...(categoryIds !== undefined ? { categories: { create: categoryIds.map((cid) => ({ categoryId: cid })) } } : {}),
      },
      include: { categories: { include: { category: true } } },
    });
    return { ...post, categories: post.categories.map((c) => c.category) };
  },

  async adminDeleteBlogPost(id: string) {
    const row = await prisma.blogPost.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Article introuvable');
    if (row.coverPublicId) await deleteFromCloudinary(row.coverPublicId).catch(() => {});
    return prisma.blogPost.delete({ where: { id } });
  },

  async adminUploadBlogCover(id: string, buffer: Buffer, filename: string) {
    const row = await prisma.blogPost.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Article introuvable');
    if (row.coverPublicId) await deleteFromCloudinary(row.coverPublicId).catch(() => {});
    const result = await uploadToCloudinary(buffer, 'blog/covers', filename);
    return prisma.blogPost.update({ where: { id }, data: { coverImageUrl: result.url, coverPublicId: result.publicId } });
  },

  async adminListBlogCategories() {
    return prisma.blogCategory.findMany({ orderBy: { name: 'asc' } });
  },

  async adminCreateBlogCategory(data: { name: string; slug: string }) {
    return prisma.blogCategory.create({ data });
  },

  async adminUpdateBlogCategory(id: string, data: { name?: string; slug?: string }) {
    const row = await prisma.blogCategory.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Catégorie introuvable');
    return prisma.blogCategory.update({ where: { id }, data });
  },

  async adminDeleteBlogCategory(id: string) {
    const row = await prisma.blogCategory.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Catégorie introuvable');
    return prisma.blogCategory.delete({ where: { id } });
  },

  async adminListNewsletterSubscribers(page: number, limit: number) {
    const [total, subscribers] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.findMany({
        orderBy: { subscribedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { subscribers, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async adminExportNewsletterSubscribers() {
    const rows = await prisma.newsletterSubscriber.findMany({ orderBy: { subscribedAt: 'desc' } });
    const headers = ['Email', 'Date abonnement', 'Confirmé'];
    const lines = rows.map((s) => [
      s.email,
      new Date(s.subscribedAt).toLocaleString('fr-FR'),
      s.confirmedAt ? new Date(s.confirmedAt).toLocaleDateString('fr-FR') : 'Non',
    ]);
    return [headers, ...lines].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  },

  async adminDeleteNewsletterSubscriber(id: string) {
    const row = await prisma.newsletterSubscriber.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Abonné introuvable');
    return prisma.newsletterSubscriber.delete({ where: { id } });
  },

  async adminListBlogComments(page: number, limit: number, status?: string) {
    const where = status && status !== 'all' ? { status } : {};
    const [total, comments] = await Promise.all([
      prisma.blogComment.count({ where }),
      prisma.blogComment.findMany({
        where,
        include: { post: { select: { title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { comments, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async adminApproveComment(id: string) {
    const row = await prisma.blogComment.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Commentaire introuvable');
    return prisma.blogComment.update({ where: { id }, data: { status: 'approved' } });
  },

  async adminDeleteComment(id: string) {
    const row = await prisma.blogComment.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Commentaire introuvable');
    return prisma.blogComment.delete({ where: { id } });
  },

  // ── FAQ ───────────────────────────────────────────────────────────────────

  async getFaq() {
    return prisma.faq.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }, { id: 'asc' }] });
  },

  async adminListFaq() {
    const rows = await prisma.faq.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }, { id: 'asc' }] });
    if (rows.length > 0) return rows;
    await prisma.faq.createMany({ data: DEFAULT_FAQ });
    return prisma.faq.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }, { id: 'asc' }] });
  },

  async adminCreateFaq(data: { category: string; question: string; answer: string; order: number }) {
    return prisma.faq.create({ data });
  },

  async adminUpdateFaq(id: number, data: { category?: string; question?: string; answer?: string; order?: number }) {
    const row = await prisma.faq.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'FAQ introuvable');
    return prisma.faq.update({ where: { id }, data });
  },

  async adminDeleteFaq(id: number) {
    const row = await prisma.faq.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'FAQ introuvable');
    return prisma.faq.delete({ where: { id } });
  },

  // ── Partnership requests ───────────────────────────────────────────────

  async submitPartnership(data: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    partnershipType: string;
    message: string;
  }) {
    const request = await prisma.partnershipRequest.create({ data });

    // Confirmation email to sender
    await sendEmail({
      to: [{ email: data.email, name: data.contactName }],
      subject: 'Primeo — Votre demande de partenariat a bien été reçue',
      htmlContent: `<div style="font-family:sans-serif;max-width:560px;color:#1a2340">
        <h2 style="color:#0066cc">Bonjour ${data.contactName},</h2>
        <p>Nous avons bien reçu votre demande de partenariat de type <strong>${data.partnershipType}</strong> au nom de <strong>${data.companyName}</strong>.</p>
        <p>Notre équipe partenariats va étudier votre dossier et vous recontactera dans les <strong>48 heures ouvrées</strong>.</p>
        <p>En attendant, n'hésitez pas à consulter notre <a href="https://primeo.ci/tarification/" style="color:#0066cc">page Tarification</a> ou à répondre directement à cet email.</p>
        <p style="color:#6b7280;font-size:.85rem;margin-top:2rem">— L'équipe Primeo</p>
      </div>`,
    }).catch(() => {});

    // Notification to admin
    const { env } = await import('../../config/env.config');
    if (env.ADMIN_EMAIL) {
      await sendEmail({
        to: [{ email: env.ADMIN_EMAIL }],
        subject: `[Partenariat] ${data.partnershipType} — ${data.companyName}`,
        htmlContent: `<div style="font-family:sans-serif;max-width:560px">
          <h3 style="color:#0066cc">Nouvelle demande de partenariat</h3>
          <table style="border-collapse:collapse;width:100%;margin:12px 0">
            <tr><td style="padding:6px 10px;background:#f3f4f6;font-weight:600;width:130px">Entreprise</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${data.companyName}</td></tr>
            <tr><td style="padding:6px 10px;background:#f3f4f6;font-weight:600">Contact</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${data.contactName}</td></tr>
            <tr><td style="padding:6px 10px;background:#f3f4f6;font-weight:600">Email</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${data.email}</td></tr>
            ${data.phone ? `<tr><td style="padding:6px 10px;background:#f3f4f6;font-weight:600">Téléphone</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${data.phone}</td></tr>` : ''}
            <tr><td style="padding:6px 10px;background:#f3f4f6;font-weight:600">Type</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${data.partnershipType}</td></tr>
            <tr><td style="padding:6px 10px;background:#f3f4f6;font-weight:600">Message</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${data.message.replace(/\n/g, '<br>')}</td></tr>
          </table>
        </div>`,
      }).catch(() => {});
    }

    return request;
  },

  async adminListPartnershipRequests(page: number, limit: number, status?: string) {
    const where = status && status !== 'all' ? { status } : {};
    const [total, requests] = await Promise.all([
      prisma.partnershipRequest.count({ where }),
      prisma.partnershipRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { requests, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async adminUpdatePartnershipStatus(id: string, status: string) {
    const row = await prisma.partnershipRequest.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Demande introuvable');
    return prisma.partnershipRequest.update({ where: { id }, data: { status } });
  },

  async adminDeletePartnershipRequest(id: string) {
    const row = await prisma.partnershipRequest.findUnique({ where: { id } });
    if (!row) throw createHttpError(404, 'Demande introuvable');
    return prisma.partnershipRequest.delete({ where: { id } });
  },

  // ── Community ──────────────────────────────────────────────────────────

  async getCommunityPosts(page: number, limit: number, challengeId?: string) {
    const where: Record<string, any> = { status: 'published' };
    if (challengeId) where.challengeId = challengeId;
    const [total, posts] = await Promise.all([
      prisma.communityPost.count({ where }),
      prisma.communityPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          challenge: { select: { id: true, title: true } },
        },
      }),
    ]);
    return { posts, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async getCommunityComments(postId: string) {
    return prisma.communityComment.findMany({
      where: { postId, status: 'published' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, pseudo: true, content: true, createdAt: true },
    });
  },

  async createCommunityPost(data: {
    pseudo: string; content: string; imageUrl?: string; challengeId?: string;
  }, ip?: string) {
    const BANNED = ['putain','merde','connard','salope','pute','enculé','fdp'];
    const lower = (data.content + ' ' + data.pseudo).toLowerCase();
    if (BANNED.some(w => lower.includes(w))) throw createHttpError(400, 'Contenu non autorisé');
    return prisma.communityPost.create({
      data: { ...data, ipAddress: ip },
      include: { challenge: { select: { id: true, title: true } } },
    });
  },

  async addCommunityComment(postId: string, data: { pseudo: string; content: string }, ip?: string) {
    const post = await prisma.communityPost.findFirst({ where: { id: postId, status: 'published' } });
    if (!post) throw createHttpError(404, 'Publication introuvable');
    const BANNED = ['putain','merde','connard','salope','pute','enculé','fdp'];
    const lower = (data.content + ' ' + data.pseudo).toLowerCase();
    if (BANNED.some(w => lower.includes(w))) throw createHttpError(400, 'Contenu non autorisé');
    const [comment] = await prisma.$transaction([
      prisma.communityComment.create({ data: { postId, pseudo: data.pseudo, content: data.content, ipAddress: ip } }),
      prisma.communityPost.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } }),
    ]);
    return comment;
  },

  async toggleCommunityLike(postId: string, anonymousId: string) {
    const post = await prisma.communityPost.findFirst({ where: { id: postId, status: 'published' } });
    if (!post) throw createHttpError(404, 'Publication introuvable');
    const existing = await prisma.communityLike.findUnique({
      where: { postId_anonymousId: { postId, anonymousId } },
    });
    if (existing) {
      await prisma.$transaction([
        prisma.communityLike.delete({ where: { id: existing.id } }),
        prisma.communityPost.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } }),
      ]);
      return { liked: false };
    }
    await prisma.$transaction([
      prisma.communityLike.create({ data: { postId, anonymousId } }),
      prisma.communityPost.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } }),
    ]);
    return { liked: true };
  },

  async reportContent(data: { targetType: string; targetId: string; reason: string }, ip?: string) {
    return prisma.communityReport.create({ data: { ...data, reporterIp: ip } });
  },

  async getChallenges() {
    return prisma.communityChallenge.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async adminListCommunityPosts(page: number, limit: number, status?: string) {
    const where = status && status !== 'all' ? { status } : {};
    const [total, posts] = await Promise.all([
      prisma.communityPost.count({ where }),
      prisma.communityPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { posts, total, page, pages: Math.ceil(total / limit) };
  },

  async adminSetCommunityPostStatus(id: string, status: string) {
    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw createHttpError(404, 'Publication introuvable');
    return prisma.communityPost.update({ where: { id }, data: { status } });
  },

  async adminDeleteCommunityPost(id: string) {
    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw createHttpError(404, 'Publication introuvable');
    return prisma.communityPost.delete({ where: { id } });
  },

  async adminListCommunityComments(page: number, limit: number, status?: string) {
    const where = status && status !== 'all' ? { status } : {};
    const [total, comments] = await Promise.all([
      prisma.communityComment.count({ where }),
      prisma.communityComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { comments, total, page, pages: Math.ceil(total / limit) };
  },

  async adminSetCommunityCommentStatus(id: string, status: string) {
    const comment = await prisma.communityComment.findUnique({ where: { id } });
    if (!comment) throw createHttpError(404, 'Commentaire introuvable');
    return prisma.communityComment.update({ where: { id }, data: { status } });
  },

  async adminDeleteCommunityComment(id: string) {
    const comment = await prisma.communityComment.findUnique({ where: { id } });
    if (!comment) throw createHttpError(404, 'Commentaire introuvable');
    return prisma.communityComment.delete({ where: { id } });
  },

  async adminListReports(page: number, limit: number, resolved?: boolean) {
    const where: Record<string, any> = {};
    if (resolved !== undefined) where.resolved = resolved;
    const [total, reports] = await Promise.all([
      prisma.communityReport.count({ where }),
      prisma.communityReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { reports, total, page, pages: Math.ceil(total / limit) };
  },

  async adminResolveReport(id: string) {
    const report = await prisma.communityReport.findUnique({ where: { id } });
    if (!report) throw createHttpError(404, 'Signalement introuvable');
    return prisma.communityReport.update({ where: { id }, data: { resolved: true } });
  },

  async adminListChallenges() {
    return prisma.communityChallenge.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async adminCreateChallenge(data: {
    title: string; description: string; startDate: Date; endDate: Date; isActive: boolean;
  }) {
    return prisma.communityChallenge.create({ data });
  },

  async adminUpdateChallenge(id: string, data: Partial<{
    title: string; description: string; startDate: Date; endDate: Date; isActive: boolean;
  }>) {
    const ch = await prisma.communityChallenge.findUnique({ where: { id } });
    if (!ch) throw createHttpError(404, 'Challenge introuvable');
    return prisma.communityChallenge.update({ where: { id }, data });
  },

  async adminDeleteChallenge(id: string) {
    const ch = await prisma.communityChallenge.findUnique({ where: { id } });
    if (!ch) throw createHttpError(404, 'Challenge introuvable');
    return prisma.communityChallenge.delete({ where: { id } });
  },
};
