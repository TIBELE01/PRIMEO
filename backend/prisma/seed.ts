// Seed script — peuple la base de développement avec des données réalistes
// Personas : §1.4 CONTEXTE.md
// Run: pnpm db:seed
import 'dotenv/config';
import {
  PrismaClient,
  AccountType,
  UserStatus,
  VerificationStatus,
  PlanType,
  SubscriptionStatus,
  PropertyType,
  PropertyStatus,
  AvailabilityStatus,
  BookingStatus,
  PaymentOption,
  TransactionType,
  TransactionStatus,
  ReviewStatus,
  TicketCategory,
  TicketStatus,
  TicketPriority,
  PromoDiscountType,
  MediaType,
} from '@prisma/client';
import { supabaseAdmin } from '../src/config/supabase.config';

const prisma = new PrismaClient();

// ─── Supabase Auth helpers ─────────────────────────────────────────────────────

async function ensureSupabaseUser(
  email: string,
  password: string,
  phone: string,
  accountType: AccountType,
): Promise<string | null> {
  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    phone,
    password,
    email_confirm: true,
    phone_confirm: true,
    app_metadata: { role: accountType },
  });

  if (!createError && createData.user) {
    return createData.user.id;
  }

  // User already registered in Supabase — find by email
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const existing = listData?.users?.find((u) => u.email === email);
  if (existing) {
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password,
      phone,
      email_confirm: true,
      phone_confirm: true,
    });
    return existing.id;
  }

  console.warn(`  ⚠ Supabase Auth: cannot create/find ${email}: ${createError?.message}`);
  return null;
}

// Sync Prisma user id to the Supabase UUID — ON UPDATE CASCADE propagates to all FK tables
async function syncUserId(email: string, supabaseUuid: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "users" SET id = ${supabaseUuid} WHERE email = ${email} AND id != ${supabaseUuid}
  `;
}

const ALLOW_DEV_ADMIN_SEED = process.env.ALLOW_DEV_ADMIN_SEED === 'true';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@primeo.ci';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin1234!';

// ─── Dates helpers ────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function dateOnly(d: Date): Date {
  return new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.NODE_ENV === 'production' && !ALLOW_DEV_ADMIN_SEED) {
    console.log('Seeding skipped in production (ALLOW_DEV_ADMIN_SEED=false)');
    return;
  }

  console.log('🌱 Seeding database…');

  // ── 1. UTILISATEURS ────────────────────────────────────────────────────────

  // Admin — le mot de passe vit exclusivement dans Supabase Auth (ensureSupabaseUser)
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      phone: '+2250700000000',
      firstName: 'Super',
      lastName: 'Admin',
      accountType: AccountType.admin,
      status: UserStatus.active,
    },
  });
  {
    const sid = await ensureSupabaseUser(ADMIN_EMAIL, ADMIN_PASSWORD, '+2250700000000', AccountType.admin);
    if (sid) await syncUserId(ADMIN_EMAIL, sid);
  }
  console.log(`  ✓ Admin : ${admin.email}`);

  // Koffi Assi — client, cadre dynamique, 35 ans (§1.4)
  const koffi = await prisma.user.upsert({
    where: { email: 'koffi.assi@gmail.com' },
    update: {},
    create: {
      email: 'koffi.assi@gmail.com',
      phone: '+2250707100001',
      firstName: 'Koffi',
      lastName: 'Assi',
      accountType: AccountType.client,
      status: UserStatus.active,
      walletBalance: 5000,
    },
  });
  {
    const sid = await ensureSupabaseUser('koffi.assi@gmail.com', 'Client1234!', '+2250707100001', AccountType.client);
    if (sid) await syncUserId('koffi.assi@gmail.com', sid);
  }
  console.log(`  ✓ Client : ${koffi.email}`);

  // Amina Coulibaly — professional_hebergement, investisseuse (§1.4)
  const amina = await prisma.user.upsert({
    where: { email: 'amina.coulibaly@residences.ci' },
    update: {},
    create: {
      email: 'amina.coulibaly@residences.ci',
      phone: '+2250707100002',
      firstName: 'Amina',
      lastName: 'Coulibaly',
      accountType: AccountType.professional_hebergement,
      status: UserStatus.active,
      professionalProfile: {
        create: {
          businessName: 'Résidences Coulibaly',
          rccm: 'CI-ABJ-2020-B-12345',
          taxId: 'DGIBE-202012345',
          description: 'Deux résidences haut de gamme à Cocody et au Plateau, idéales pour les séjours d\'affaires et familiaux.',
          street: 'Rue des Jardins, Cocody',
          city: 'Abidjan',
          latitude: 5.3764,
          longitude: -3.9773,
          verificationStatus: VerificationStatus.approved,
          verifiedAt: daysAgo(30),
          verifiedBy: admin.id,
          ratingStars: 4.7,
        },
      },
      subscription: {
        create: {
          // Formule v2 « Business » (§3.3 : 9 000 FCFA, 10 biens, 0 % commission, 2 boosts)
          planType: PlanType.business,
          startDate: daysAgo(60),
          nextBillingDate: daysFromNow(30),
          status: SubscriptionStatus.active,
          monthlyPrice: 9000,
          includedPropertiesLimit: 10,
          commissionRate: 0,
          boostsFreeMonthly: 2,
          boostsFreeUsedThisMonth: 1,
          features: { analytics: true, virtualTour: false, priority: true },
        },
      },
    },
  });
  {
    const sid = await ensureSupabaseUser('amina.coulibaly@residences.ci', 'Pro1234!', '+2250707100002', AccountType.professional_hebergement);
    if (sid) await syncUserId('amina.coulibaly@residences.ci', sid);
  }
  console.log(`  ✓ Pro hébergement : ${amina.email}`);

  // M. Koné Dramane — professional_hotel (hôtel 3 étoiles, §1.4)
  // (2FA géré côté Supabase Auth — plus de colonnes twoFactor* en base locale)
  const kone = await prisma.user.upsert({
    where: { email: 'dkone@hotel-plateau.ci' },
    update: { accountType: AccountType.professional_hotel },
    create: {
      email: 'dkone@hotel-plateau.ci',
      phone: '+2250707100003',
      firstName: 'Dramane',
      lastName: 'Koné',
      accountType: AccountType.professional_hotel,
      status: UserStatus.active,
      professionalProfile: {
        create: {
          businessName: 'Hôtel Le Plateau',
          rccm: 'CI-ABJ-2015-B-07890',
          taxId: 'DGIBE-201507890',
          touristLicense: 'MTT-CI-2016-0042',
          description: 'Hôtel 3 étoiles au cœur du Plateau, idéalement situé pour les voyageurs d\'affaires et les touristes.',
          street: 'Avenue du Général de Gaulle, Le Plateau',
          city: 'Abidjan',
          latitude: 5.3236,
          longitude: -4.0167,
          verificationStatus: VerificationStatus.approved,
          verifiedAt: daysAgo(90),
          verifiedBy: admin.id,
          ratingStars: 4.2,
        },
      },
      subscription: {
        create: {
          // Formule v2 « Entreprise » (§3.3 : 24 000 FCFA, 40 biens, 0 % commission, 7 boosts)
          planType: PlanType.entreprise,
          startDate: daysAgo(120),
          nextBillingDate: daysFromNow(10),
          status: SubscriptionStatus.active,
          monthlyPrice: 24000,
          includedPropertiesLimit: 40,
          commissionRate: 0,
          boostsFreeMonthly: 7,
          boostsFreeUsedThisMonth: 3,
          features: { analytics: true, virtualTour: true, priority: true, coManager: true },
        },
      },
    },
  });
  {
    const sid = await ensureSupabaseUser('dkone@hotel-plateau.ci', 'Pro1234!', '+2250707100003', AccountType.professional_hotel);
    if (sid) await syncUserId('dkone@hotel-plateau.ci', sid);
  }
  console.log(`  ✓ Pro hôtel : ${kone.email}`);

  // Mme Bamba Fatoumata — restauratrice (§1.4)
  const bamba = await prisma.user.upsert({
    where: { email: 'f.bamba@restaurant-saveur.ci' },
    update: {},
    create: {
      email: 'f.bamba@restaurant-saveur.ci',
      phone: '+2250707100004',
      firstName: 'Fatoumata',
      lastName: 'Bamba',
      accountType: AccountType.restaurateur,
      status: UserStatus.active,
      professionalProfile: {
        create: {
          businessName: 'Restaurant La Saveur du Monde',
          rccm: 'CI-GBM-2019-B-00321',
          description: 'Restaurant gastronomique à Grand-Bassam, spécialités ivoiriennes et cuisine du monde. Tables en terrasse face à la lagune.',
          street: 'Boulevard de la Corniche, Grand-Bassam',
          city: 'Grand-Bassam',
          latitude: 5.2101,
          longitude: -3.7385,
          verificationStatus: VerificationStatus.approved,
          verifiedAt: daysAgo(45),
          verifiedBy: admin.id,
          ratingStars: 4.5,
        },
      },
      subscription: {
        create: {
          // Formule v2 « Starter » (ex-Restaurant → starter, cf. migration new_subscription_plans)
          planType: PlanType.starter,
          startDate: daysAgo(45),
          nextBillingDate: daysFromNow(15),
          status: SubscriptionStatus.active,
          monthlyPrice: 0,
          includedPropertiesLimit: 3,
          commissionRate: 0,
          boostsFreeMonthly: 0,
          boostsFreeUsedThisMonth: 0,
          features: { menu: true, reservations: true, qrCode: true },
        },
      },
    },
  });
  {
    const sid = await ensureSupabaseUser('f.bamba@restaurant-saveur.ci', 'Pro1234!', '+2250707100004', AccountType.restaurateur);
    if (sid) await syncUserId('f.bamba@restaurant-saveur.ci', sid);
  }
  console.log(`  ✓ Restauratrice : ${bamba.email}`);

  // Mme Diallo Mariama — professional_immobilier
  const diallo = await prisma.user.upsert({
    where: { email: 'm.diallo@immo-abidjan.ci' },
    update: {},
    create: {
      email: 'm.diallo@immo-abidjan.ci',
      phone: '+2250707100005',
      firstName: 'Mariama',
      lastName: 'Diallo',
      accountType: AccountType.professional_immobilier,
      status: UserStatus.active,
      professionalProfile: {
        create: {
          businessName: 'Diallo Immobilier',
          rccm: 'CI-ABJ-2018-B-04567',
          description: 'Agence immobilière spécialisée dans la location et la vente de biens résidentiels et fonciers à Abidjan.',
          street: 'Rue du Commerce, Marcory',
          city: 'Abidjan',
          latitude: 5.2988,
          longitude: -3.9908,
          verificationStatus: VerificationStatus.approved,
          verifiedAt: daysAgo(20),
          verifiedBy: admin.id,
          ratingStars: 4.0,
        },
      },
      subscription: {
        create: {
          // Formule v2 « Starter » (ex-Essentiel, 0 % de commission)
          planType: PlanType.starter,
          startDate: daysAgo(20),
          nextBillingDate: daysFromNow(40),
          status: SubscriptionStatus.active,
          monthlyPrice: 0,
          includedPropertiesLimit: 3,
          commissionRate: 0,
          boostsFreeMonthly: 0,
          boostsFreeUsedThisMonth: 0,
        },
      },
    },
  });
  {
    const sid = await ensureSupabaseUser('m.diallo@immo-abidjan.ci', 'Pro1234!', '+2250707100005', AccountType.professional_immobilier);
    if (sid) await syncUserId('m.diallo@immo-abidjan.ci', sid);
  }
  console.log(`  ✓ Pro immobilier : ${diallo.email}`);

  // ── 2. PROPRIÉTÉS ──────────────────────────────────────────────────────────

  // 2a. Villa Prestige Cocody (Amina — résidence)
  const villaPrestige = await prisma.property.upsert({
    where: { id: 'seed-property-villa-cocody' },
    update: {},
    create: {
      id: 'seed-property-villa-cocody',
      ownerId: amina.id,
      propertyType: PropertyType.residence,
      title: 'Villa Prestige Cocody',
      description: 'Magnifique villa de 4 chambres dans le quartier résidentiel de Cocody. Piscine, jardin tropical, parking sécurisé et générateur. Idéale pour les familles ou groupes de collègues.',
      rooms: 6,
      bedrooms: 4,
      beds: 5,
      bathrooms: 3,
      surface: 280,
      capacity: 8,
      pricePerNight: 85000,
      street: '12 Rue des Bougainvilliers, Cocody Riviera 2',
      city: 'Abidjan',
      latitude: 5.3864,
      longitude: -3.9543,
      status: PropertyStatus.active,
      isBoosted: true,
      boostExpiresAt: daysFromNow(14),
      amenities: ['wifi', 'piscine', 'parking', 'climatisation', 'groupe_electrogene', 'cuisine_equipee', 'jardin', 'securite_24h'],
      paymentOptions: [PaymentOption.full_online, PaymentOption.ten_percent_online],
      rating: 4.8,
      reviewCount: 3,
      hasVirtualTour: true,
      media: {
        create: [
          { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/villa-cocody-1.jpg', mediaType: MediaType.photo, isPrimary: true, sortOrder: 1 },
          { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/villa-cocody-2.jpg', mediaType: MediaType.photo, sortOrder: 2 },
          { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/villa-cocody-3.jpg', mediaType: MediaType.photo, sortOrder: 3 },
        ],
      },
    },
  });

  // 2b. Studio Affaires Plateau (Amina — résidence)
  const studioPlateauAmina = await prisma.property.upsert({
    where: { id: 'seed-property-studio-plateau' },
    update: {},
    create: {
      id: 'seed-property-studio-plateau',
      ownerId: amina.id,
      propertyType: PropertyType.residence,
      title: 'Studio Affaires Le Plateau',
      description: 'Studio moderne entièrement équipé au cœur du quartier d\'affaires du Plateau. Wifi haut débit, bureau dédié, accès sécurisé 24h/24. Parfait pour les déplacements professionnels.',
      rooms: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      surface: 45,
      capacity: 2,
      pricePerNight: 40000,
      street: 'Immeuble le Novotel, Boulevard de la République, Le Plateau',
      city: 'Abidjan',
      latitude: 5.3188,
      longitude: -4.0130,
      status: PropertyStatus.active,
      amenities: ['wifi', 'climatisation', 'bureau', 'parking', 'cuisine_equipee'],
      paymentOptions: [PaymentOption.full_online, PaymentOption.ten_percent_online, PaymentOption.zero_online],
      rating: 4.5,
      reviewCount: 1,
      media: {
        create: [
          { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/studio-plateau-1.jpg', mediaType: MediaType.photo, isPrimary: true, sortOrder: 1 },
        ],
      },
    },
  });

  // 2c. Hôtel Le Plateau 3★ (M. Koné — hôtel)
  const hotelPlateau = await prisma.property.upsert({
    where: { id: 'seed-property-hotel-plateau' },
    update: {},
    create: {
      id: 'seed-property-hotel-plateau',
      ownerId: kone.id,
      propertyType: PropertyType.hotel,
      title: 'Hôtel Le Plateau ★★★',
      description: 'Hôtel 3 étoiles en plein cœur du quartier d\'affaires. 42 chambres climatisées, restaurant, salle de conférence, connexion fibre optique. Navette aéroport disponible.',
      rooms: 42,
      bedrooms: 42,
      beds: 50,
      bathrooms: 42,
      surface: 1200,
      capacity: 84,
      pricePerNight: 55000,
      street: 'Avenue du Général de Gaulle, Le Plateau',
      city: 'Abidjan',
      latitude: 5.3236,
      longitude: -4.0167,
      status: PropertyStatus.active,
      isBoosted: true,
      boostExpiresAt: daysFromNow(7),
      amenities: ['wifi', 'restaurant', 'salle_conference', 'climatisation', 'parking', 'piscine', 'navette_aeroport', 'room_service'],
      paymentOptions: [PaymentOption.full_online, PaymentOption.ten_percent_online],
      rating: 4.2,
      reviewCount: 2,
      hasVirtualTour: true,
      media: {
        create: [
          { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/hotel-plateau-1.jpg', mediaType: MediaType.photo, isPrimary: true, sortOrder: 1 },
          { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/hotel-plateau-2.jpg', mediaType: MediaType.photo, sortOrder: 2 },
        ],
      },
    },
  });

  // 2d. Appartement meublé Marcory (Mme Diallo — immobilier_location)
  const apptMarcory = await prisma.property.upsert({
    where: { id: 'seed-property-appt-marcory' },
    update: {},
    create: {
      id: 'seed-property-appt-marcory',
      ownerId: diallo.id,
      propertyType: PropertyType.immobilier_location,
      title: 'Appartement Meublé F3 Marcory',
      description: 'Bel appartement F3 entièrement meublé en résidence sécurisée à Marcory. Salon, 2 chambres, cuisine équipée, balcon. Charges comprises. Disponible à partir du 1er du mois.',
      rooms: 4,
      bedrooms: 2,
      beds: 2,
      bathrooms: 1,
      surface: 85,
      capacity: 4,
      pricePerMonth: 180000,
      street: 'Résidence Les Palmiers, Rue du Commerce, Marcory',
      city: 'Abidjan',
      latitude: 5.2988,
      longitude: -3.9908,
      status: PropertyStatus.active,
      amenities: ['wifi', 'climatisation', 'parking', 'gardien', 'groupe_electrogene'],
      paymentOptions: [PaymentOption.full_online, PaymentOption.zero_online],
      rating: 4.0,
      reviewCount: 0,
      media: {
        create: [
          { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/appt-marcory-1.jpg', mediaType: MediaType.photo, isPrimary: true, sortOrder: 1 },
        ],
      },
    },
  });

  // 2e. Terrain Yopougon Extension (Mme Diallo — immobilier_terrain)
  const terrainYopougon = await prisma.property.upsert({
    where: { id: 'seed-property-terrain-yopougon' },
    update: {},
    create: {
      id: 'seed-property-terrain-yopougon',
      ownerId: diallo.id,
      propertyType: PropertyType.immobilier_terrain,
      title: 'Terrain Viabilisé 500m² — Yopougon Extension',
      description: 'Terrain plat de 500 m² en zone résidentielle de Yopougon Extension. Titre foncier disponible, accès eau et électricité. Idéal pour construction de villa R+1. Quartier en plein développement.',
      surface: 500,
      priceSale: 12500000,
      street: 'Lot 47, Section C, Yopougon Extension',
      city: 'Abidjan',
      latitude: 5.3572,
      longitude: -4.0723,
      status: PropertyStatus.active,
      amenities: ['titre_foncier', 'viabilise', 'eau', 'electricite'],
      paymentOptions: [PaymentOption.full_online],
      rating: 0,
      reviewCount: 0,
      media: {
        create: [
          { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/terrain-yopougon-1.jpg', mediaType: MediaType.photo, isPrimary: true, sortOrder: 1 },
        ],
      },
    },
  });

  // 2f. Villa à vendre Grand-Bassam (Mme Diallo — immobilier_achat)
  const villaVenteBassam = await prisma.property.upsert({
    where: { id: 'seed-property-villa-vente-bassam' },
    update: {},
    create: {
      id: 'seed-property-villa-vente-bassam',
      ownerId: diallo.id,
      propertyType: PropertyType.immobilier_achat,
      title: 'Villa R+1 à vendre — Grand-Bassam Quartier France',
      description: 'Belle villa R+1 de 220 m² à vendre dans le quartier France de Grand-Bassam, face à la plage. 4 chambres, 3 salles de bain, piscine, garage double. Titre foncier propre, notaire disponible.',
      rooms: 7,
      bedrooms: 4,
      bathrooms: 3,
      surface: 220,
      priceSale: 45000000,
      street: 'Rue du Bain Beurré, Quartier France, Grand-Bassam',
      city: 'Grand-Bassam',
      latitude: 5.2087,
      longitude: -3.7352,
      status: PropertyStatus.active,
      amenities: ['piscine', 'garage', 'jardin', 'groupe_electrogene', 'titre_foncier'],
      paymentOptions: [PaymentOption.full_online],
      rating: 0,
      reviewCount: 0,
      media: {
        create: [
          { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/villa-bassam-1.jpg', mediaType: MediaType.photo, isPrimary: true, sortOrder: 1 },
          { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/villa-bassam-2.jpg', mediaType: MediaType.photo, sortOrder: 2 },
        ],
      },
    },
  });

  // 2g. Restaurant La Saveur du Monde (Mme Bamba — restaurant)
  const restaurant = await prisma.property.upsert({
    where: { id: 'seed-property-restaurant-bassam' },
    update: {},
    create: {
      id: 'seed-property-restaurant-bassam',
      ownerId: bamba.id,
      propertyType: PropertyType.restaurant,
      title: 'La Saveur du Monde — Restaurant Gastronomique',
      description: 'Restaurant gastronomique en bord de lagune à Grand-Bassam. Cuisine ivoirienne et internationale préparée par notre chef étoilé. Terrasse, salle climatisée, espace privatisable pour événements.',
      capacity: 60,
      cuisineType: 'Gastronomique ivoirien & international',
      openingHours: {
        lun: [],
        mar: ['12:00-14:30', '19:00-22:30'],
        mer: ['12:00-14:30', '19:00-22:30'],
        jeu: ['12:00-14:30', '19:00-22:30'],
        ven: ['12:00-14:30', '19:00-23:00'],
        sam: ['12:00-15:00', '19:00-23:00'],
        dim: ['12:00-15:30'],
      },
      street: 'Boulevard de la Corniche, Grand-Bassam',
      city: 'Grand-Bassam',
      latitude: 5.2101,
      longitude: -3.7385,
      status: PropertyStatus.active,
      amenities: ['terrasse', 'climatisation', 'parking', 'wifi', 'evenements'],
      paymentOptions: [PaymentOption.full_online, PaymentOption.ten_percent_online],
      rating: 4.5,
      reviewCount: 1,
      media: {
        create: [
          { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/restaurant-bassam-1.jpg', mediaType: MediaType.photo, isPrimary: true, sortOrder: 1 },
          { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/restaurant-bassam-2.jpg', mediaType: MediaType.photo, sortOrder: 2 },
        ],
      },
    },
  });

  console.log(`  ✓ 7 propriétés créées`);

  // ── 3. MENU DU RESTAURANT ──────────────────────────────────────────────────

  await prisma.restaurantMenuItem.upsert({
    where: { id: 'seed-menu-001' },
    update: {},
    create: {
      id: 'seed-menu-001',
      propertyId: restaurant.id,
      section: 'Entrées',
      name: 'Accras de crevettes',
      description: 'Beignets de crevettes fraîches, sauce tartare maison',
      price: 3500,
      isAvailable: true,
      sortOrder: 1,
    },
  });
  await prisma.restaurantMenuItem.upsert({
    where: { id: 'seed-menu-002' },
    update: {},
    create: {
      id: 'seed-menu-002',
      propertyId: restaurant.id,
      section: 'Plats',
      name: 'Kedjenou de pintade',
      description: 'Pintade mijotée aux épices ivoiriennes, accompagnée d\'attiéké',
      price: 9500,
      isAvailable: true,
      sortOrder: 1,
    },
  });
  await prisma.restaurantMenuItem.upsert({
    where: { id: 'seed-menu-003' },
    update: {},
    create: {
      id: 'seed-menu-003',
      propertyId: restaurant.id,
      section: 'Plats',
      name: 'Poisson braisé entier',
      description: 'Poisson du jour grillé, alloco et sauce tomate pimentée',
      price: 8000,
      isAvailable: true,
      sortOrder: 2,
    },
  });
  await prisma.restaurantMenuItem.upsert({
    where: { id: 'seed-menu-004' },
    update: {},
    create: {
      id: 'seed-menu-004',
      propertyId: restaurant.id,
      section: 'Desserts',
      name: 'Tarte à l\'ananas rôti',
      description: 'Ananas caramélisé, glace coco artisanale',
      price: 2500,
      isAvailable: true,
      sortOrder: 1,
    },
  });
  await prisma.restaurantMenuItem.upsert({
    where: { id: 'seed-menu-005' },
    update: {},
    create: {
      id: 'seed-menu-005',
      propertyId: restaurant.id,
      section: 'Boissons',
      name: 'Gnamankoudji (gingembre)',
      description: 'Jus de gingembre frais maison, citron vert',
      price: 1500,
      isAvailable: true,
      sortOrder: 1,
    },
  });

  // ── 4. DISPONIBILITÉS ──────────────────────────────────────────────────────

  const propertiesToOpen = [villaPrestige, studioPlateauAmina, hotelPlateau];
  for (const prop of propertiesToOpen) {
    for (let i = 1; i <= 60; i++) {
      const date = dateOnly(daysFromNow(i));
      await prisma.availability.upsert({
        where: { propertyId_date: { propertyId: prop.id, date } },
        update: {},
        create: { propertyId: prop.id, date, status: AvailabilityStatus.available },
      });
    }
  }
  console.log(`  ✓ Disponibilités créées (60 jours)`);

  // ── 5. RÉSERVATIONS — toutes options + tous statuts ────────────────────────

  // Réservation 1 : completed + full_online (Koffi → Villa Prestige)
  const booking1 = await prisma.booking.upsert({
    where: { id: 'seed-booking-001' },
    update: {},
    create: {
      id: 'seed-booking-001',
      clientId: koffi.id,
      propertyId: villaPrestige.id,
      startDate: dateOnly(daysAgo(30)),
      endDate: dateOnly(daysAgo(25)),
      guests: 3,
      totalAmount: 425000,        // 5 nuits × 85 000
      onlinePaidAmount: 425000,
      paymentOption: PaymentOption.full_online,
      commissionAmount: 21250,    // 5 %
      remainingCashAmount: 0,
      status: BookingStatus.completed,
      confirmedAt: daysAgo(32),
      specialRequests: 'Arrivée prévue vers 18h. Merci de préparer une bouteille de champagne.',
    },
  });

  // Réservation 2 : confirmed + ten_percent_online (Koffi → Hôtel Le Plateau)
  const booking2 = await prisma.booking.upsert({
    where: { id: 'seed-booking-002' },
    update: {},
    create: {
      id: 'seed-booking-002',
      clientId: koffi.id,
      propertyId: hotelPlateau.id,
      startDate: dateOnly(daysFromNow(5)),
      endDate: dateOnly(daysFromNow(8)),
      guests: 1,
      totalAmount: 165000,        // 3 nuits × 55 000
      onlinePaidAmount: 16500,    // 10 %
      paymentOption: PaymentOption.ten_percent_online,
      commissionAmount: 0,        // premium : 0 %
      remainingCashAmount: 148500,
      status: BookingStatus.confirmed,
      confirmedAt: daysAgo(2),
      specialRequests: 'Chambre calme, étage élevé si possible.',
    },
  });

  // Réservation 3 : pending_payment + zero_online (Koffi → Studio Plateau)
  const booking3 = await prisma.booking.upsert({
    where: { id: 'seed-booking-003' },
    update: {},
    create: {
      id: 'seed-booking-003',
      clientId: koffi.id,
      propertyId: studioPlateauAmina.id,
      startDate: dateOnly(daysFromNow(15)),
      endDate: dateOnly(daysFromNow(17)),
      guests: 2,
      totalAmount: 80000,         // 2 nuits × 40 000
      onlinePaidAmount: 0,
      paymentOption: PaymentOption.zero_online,
      commissionAmount: 4000,     // 5 %
      remainingCashAmount: 80000,
      status: BookingStatus.pending_payment,
    },
  });

  // Réservation 4 : cancelled_by_client + full_online (Koffi → Villa Prestige)
  const booking4 = await prisma.booking.upsert({
    where: { id: 'seed-booking-004' },
    update: {},
    create: {
      id: 'seed-booking-004',
      clientId: koffi.id,
      propertyId: villaPrestige.id,
      startDate: dateOnly(daysAgo(10)),
      endDate: dateOnly(daysAgo(7)),
      guests: 2,
      totalAmount: 255000,        // 3 nuits × 85 000
      onlinePaidAmount: 255000,
      paymentOption: PaymentOption.full_online,
      commissionAmount: 12750,    // 5 %
      remainingCashAmount: 0,
      status: BookingStatus.cancelled_by_client,
      confirmedAt: daysAgo(15),
      cancelledAt: daysAgo(12),
      cancelledBy: 'client',
      cancellationReason: 'Changement de programme professionnel imprévu.',
    },
  });

  // Réservation 5 : cancelled_by_professional + ten_percent_online (Koffi → Hôtel)
  const booking5 = await prisma.booking.upsert({
    where: { id: 'seed-booking-005' },
    update: {},
    create: {
      id: 'seed-booking-005',
      clientId: koffi.id,
      propertyId: hotelPlateau.id,
      startDate: dateOnly(daysAgo(5)),
      endDate: dateOnly(daysAgo(3)),
      guests: 2,
      totalAmount: 110000,        // 2 nuits × 55 000
      onlinePaidAmount: 11000,
      paymentOption: PaymentOption.ten_percent_online,
      commissionAmount: 0,
      remainingCashAmount: 99000,
      status: BookingStatus.cancelled_by_professional,
      confirmedAt: daysAgo(8),
      cancelledAt: daysAgo(6),
      cancelledBy: 'professional',
      cancellationReason: 'Travaux urgents dans les chambres réservées.',
    },
  });

  console.log(`  ✓ 5 réservations créées (tous statuts + toutes options de paiement)`);

  // ── 6. TRANSACTIONS ────────────────────────────────────────────────────────

  // Paiement complet pour booking 1
  await prisma.transaction.upsert({
    where: { id: 'seed-tx-001' },
    update: {},
    create: {
      id: 'seed-tx-001',
      userId: koffi.id,
      type: TransactionType.client_payment,
      amount: 425000,
      netAmount: 403750,
      fee: 21250,
      status: TransactionStatus.success,
      bookingId: booking1.id,
      geniusPayTransactionId: 'gp_test_001_full',
      webhookReceived: true,
      initiatedAt: daysAgo(32),
      completedAt: daysAgo(32),
    },
  });

  // Acompte 10 % pour booking 2
  await prisma.transaction.upsert({
    where: { id: 'seed-tx-002' },
    update: {},
    create: {
      id: 'seed-tx-002',
      userId: koffi.id,
      type: TransactionType.client_payment,
      amount: 16500,
      netAmount: 16500,
      fee: 0,
      status: TransactionStatus.success,
      bookingId: booking2.id,
      geniusPayTransactionId: 'gp_test_002_deposit',
      webhookReceived: true,
      initiatedAt: daysAgo(2),
      completedAt: daysAgo(2),
    },
  });

  // Remboursement annulation booking 4
  await prisma.transaction.upsert({
    where: { id: 'seed-tx-003' },
    update: {},
    create: {
      id: 'seed-tx-003',
      userId: koffi.id,
      type: TransactionType.refund,
      amount: 255000,
      netAmount: 255000,
      fee: 0,
      status: TransactionStatus.success,
      bookingId: booking4.id,
      notes: 'Remboursement annulation client — politique remboursement J-12',
      initiatedAt: daysAgo(12),
      completedAt: daysAgo(11),
    },
  });

  // Abonnement prestige (Amina)
  const aminaSub = await prisma.subscription.findUnique({ where: { userId: amina.id } });
  if (aminaSub) {
    await prisma.transaction.upsert({
      where: { id: 'seed-tx-004' },
      update: {},
      create: {
        id: 'seed-tx-004',
        userId: amina.id,
        type: TransactionType.subscription_payment,
        amount: 9000,
        netAmount: 9000,
        fee: 0,
        status: TransactionStatus.success,
        subscriptionId: aminaSub.id,
        notes: 'Abonnement Business — renouvellement mensuel',
        initiatedAt: daysAgo(60),
        completedAt: daysAgo(60),
      },
    });
  }

  console.log(`  ✓ Transactions créées`);

  // ── 7. AVIS ────────────────────────────────────────────────────────────────

  // Avis Koffi sur Villa Prestige (booking 1 — completed)
  await prisma.review.upsert({
    where: { bookingId: booking1.id },
    update: {},
    create: {
      bookingId: booking1.id,
      propertyId: villaPrestige.id,
      authorId: koffi.id,
      rating: 5,
      cleanlinessRating: 5,
      communicationRating: 5,
      accuracyRating: 4,
      locationRating: 5,
      valueRating: 4,
      comment: 'Séjour parfait ! La villa est exactement comme les photos, voire encore plus belle en vrai. Piscine impeccable, literie très confortable. Amina est une hôte exceptionnelle, très réactive et de bon conseil. Je recommande à 100%.',
      status: ReviewStatus.published,
      publishedAt: daysAgo(24),
      responseFromProfessional: 'Merci beaucoup Koffi ! C\'était un réel plaisir de vous accueillir. Revenez quand vous voulez ! 🙏',
    },
  });

  // Avis sur restaurant (booking fictif pour le restaurant — ajout direct)
  const bookingResto = await prisma.booking.upsert({
    where: { id: 'seed-booking-resto-001' },
    update: {},
    create: {
      id: 'seed-booking-resto-001',
      clientId: koffi.id,
      propertyId: restaurant.id,
      startDate: dateOnly(daysAgo(20)),
      endDate: dateOnly(daysAgo(20)),
      guests: 4,
      totalAmount: 52000,
      onlinePaidAmount: 5200,
      paymentOption: PaymentOption.ten_percent_online,
      commissionAmount: 0,
      remainingCashAmount: 46800,
      status: BookingStatus.completed,
      confirmedAt: daysAgo(22),
      specialRequests: 'Table en terrasse face à la lagune pour 4 personnes.',
    },
  });
  await prisma.review.upsert({
    where: { bookingId: bookingResto.id },
    update: {},
    create: {
      bookingId: bookingResto.id,
      propertyId: restaurant.id,
      authorId: koffi.id,
      rating: 5,
      cleanlinessRating: 5,
      communicationRating: 5,
      locationRating: 5,
      valueRating: 4,
      comment: 'Le kedjenou de pintade était divin ! Service impeccable, cadre enchanteur au bord de la lagune. Mme Bamba est aux petits soins. Un must à Grand-Bassam.',
      status: ReviewStatus.published,
      publishedAt: daysAgo(19),
    },
  });

  console.log(`  ✓ Avis créés`);

  // ── 8. MESSAGES ────────────────────────────────────────────────────────────

  await prisma.message.upsert({
    where: { id: 'seed-msg-001' },
    update: {},
    create: {
      id: 'seed-msg-001',
      bookingId: booking2.id,
      senderId: koffi.id,
      receiverId: kone.id,
      content: 'Bonjour M. Koné, je confirme mon arrivée le 29 mai vers 16h. Y a-t-il un parking sécurisé pour mon véhicule ?',
      sentAt: daysAgo(2),
      isRead: true,
    },
  });
  await prisma.message.upsert({
    where: { id: 'seed-msg-002' },
    update: {},
    create: {
      id: 'seed-msg-002',
      bookingId: booking2.id,
      senderId: kone.id,
      receiverId: koffi.id,
      content: 'Bonjour M. Assi, oui bien sûr ! Nous disposons d\'un parking sécurisé et couvert. Notre équipe sera là pour vous accueillir. À bientôt !',
      sentAt: daysAgo(2),
      isRead: true,
    },
  });
  await prisma.message.upsert({
    where: { id: 'seed-msg-003' },
    update: {},
    create: {
      id: 'seed-msg-003',
      bookingId: booking2.id,
      senderId: koffi.id,
      receiverId: kone.id,
      content: 'Parfait, merci ! Pouvez-vous me confirmer l\'adresse exacte et le code d\'accès au parking ?',
      sentAt: daysAgo(1),
      isRead: false,
    },
  });

  console.log(`  ✓ Messages créés`);

  // ── 9. ÉVALUATION CLIENT (ClientRating) ────────────────────────────────────

  await prisma.clientRating.upsert({
    where: { bookingId: booking1.id },
    update: {},
    create: {
      bookingId: booking1.id,
      ratedUserId: koffi.id,
      raterUserId: amina.id,
      respectRating: 5,
      communicationRating: 5,
      punctualityRating: 4,
      rulesRating: 5,
      overallRating: 5,
      comment: 'Client exemplaire, maison laissée en parfait état. Un vrai plaisir !',
    },
  });

  console.log(`  ✓ Évaluation client créée`);

  // ── 10. TICKET DE SUPPORT ──────────────────────────────────────────────────

  const ticket = await prisma.supportTicket.upsert({
    where: { id: 'seed-ticket-001' },
    update: {},
    create: {
      id: 'seed-ticket-001',
      userId: koffi.id,
      category: TicketCategory.information,
      subject: 'Comment modifier ma réservation en cours ?',
      description: 'Bonjour, je souhaite modifier la date d\'arrivée de ma réservation #seed-booking-002 (Hôtel Le Plateau). Est-ce possible et comment procéder ?',
      status: TicketStatus.in_progress,
      priority: TicketPriority.medium,
      assignedTo: admin.id,
    },
  });

  await prisma.ticketComment.upsert({
    where: { id: 'seed-ticket-comment-001' },
    update: {},
    create: {
      id: 'seed-ticket-comment-001',
      ticketId: ticket.id,
      authorId: admin.id,
      content: 'Bonjour M. Assi, vous pouvez modifier votre réservation depuis l\'application dans la rubrique "Mes réservations" → "Modifier". La modification reste possible jusqu\'à 48h avant la date d\'arrivée.',
      isInternal: false,
    },
  });

  console.log(`  ✓ Ticket support créé`);

  // ── 11. CODE PROMO ─────────────────────────────────────────────────────────

  await prisma.promoCode.upsert({
    where: { code: 'PRIMEO10' },
    update: {},
    create: {
      code: 'PRIMEO10',
      discountType: PromoDiscountType.percent,
      discountValue: 10,
      minAmount: 50000,
      maxUses: 200,
      usesCount: 23,
      validFrom: daysAgo(30),
      validUntil: daysFromNow(60),
      isActive: true,
      createdBy: admin.id,
    },
  });

  await prisma.promoCode.upsert({
    where: { code: 'BIENVENUE5000' },
    update: {},
    create: {
      code: 'BIENVENUE5000',
      discountType: PromoDiscountType.fixed_amount,
      discountValue: 5000,
      minAmount: 30000,
      maxUses: 500,
      usesCount: 87,
      validFrom: daysAgo(90),
      validUntil: daysFromNow(90),
      isActive: true,
      createdBy: admin.id,
    },
  });

  console.log(`  ✓ Codes promo créés`);

  // ── 12. BOOST ─────────────────────────────────────────────────────────────

  await prisma.boost.upsert({
    where: { id: 'seed-boost-001' },
    update: {},
    create: {
      id: 'seed-boost-001',
      userId: amina.id,
      propertyId: villaPrestige.id,
      startDate: daysAgo(7),
      endDate: daysFromNow(14),
      amount: 0,
      type: 'free',
    },
  });

  // ── 13. PARRAINAGE ────────────────────────────────────────────────────────

  await prisma.referral.upsert({
    where: { referralCode: koffi.referralCode },
    update: {},
    create: {
      referralCode: koffi.referralCode,
      referrerId: koffi.id,
      status: 'pending',
    },
  });

  // ── 14. FAVORIS ───────────────────────────────────────────────────────────

  await prisma.favorite.upsert({
    where: { userId_propertyId: { userId: koffi.id, propertyId: villaPrestige.id } },
    update: {},
    create: { userId: koffi.id, propertyId: villaPrestige.id },
  });
  await prisma.favorite.upsert({
    where: { userId_propertyId: { userId: koffi.id, propertyId: restaurant.id } },
    update: {},
    create: { userId: koffi.id, propertyId: restaurant.id },
  });

  // ── 15. CONFIGURATION PLATEFORME ──────────────────────────────────────────

  const configs: Array<{ key: string; value: string | number | boolean }> = [
    { key: 'boost_price_fcfa', value: 5000 },
    { key: 'referral_reward_fcfa', value: 2000 },
    { key: 'grace_period_hours', value: 24 },
    { key: 'min_booking_nights', value: 1 },
    { key: 'cancellation_free_hours', value: 48 },
    { key: 'commission_starter', value: 0 },
    { key: 'commission_business', value: 0 },
    { key: 'commission_entreprise', value: 0 },
    { key: 'max_images_per_property', value: 20 },
    { key: 'otp_length', value: 6 },
    { key: 'otp_expiry_minutes', value: 10 },
    { key: 'maintenance_mode', value: false },
  ];
  for (const { key, value } of configs) {
    await prisma.platformConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value, updatedBy: admin.id },
    });
  }

  console.log(`  ✓ Configuration plateforme créée`);

  // ── 16. TAUX DE CHANGE ────────────────────────────────────────────────────

  const rates: Array<{ currency: string; rate: number }> = [
    { currency: 'EUR', rate: 0.001524 },
    { currency: 'USD', rate: 0.001695 },
    { currency: 'GBP', rate: 0.001293 },
    { currency: 'CAD', rate: 0.002345 },
    { currency: 'CHF', rate: 0.001538 },
  ];
  for (const { currency, rate } of rates) {
    await prisma.currencyRate.upsert({
      where: { currency },
      update: { rate },
      create: { currency, rate },
    });
  }

  console.log(`  ✓ Taux de change créés`);

  // ── 17. NOTIFICATIONS ─────────────────────────────────────────────────────

  await prisma.notification.upsert({
    where: { id: 'seed-notif-001' },
    update: {},
    create: {
      id: 'seed-notif-001',
      userId: koffi.id,
      type: 'booking_confirmed',
      title: 'Réservation confirmée !',
      body: 'Votre réservation à l\'Hôtel Le Plateau du 29 au 31 mai est confirmée.',
      data: { bookingId: booking2.id, propertyId: hotelPlateau.id },
      isRead: false,
    },
  });
  await prisma.notification.upsert({
    where: { id: 'seed-notif-002' },
    update: {},
    create: {
      id: 'seed-notif-002',
      userId: koffi.id,
      type: 'new_message',
      title: 'Nouveau message',
      body: 'M. Koné vous a répondu concernant votre réservation.',
      data: { bookingId: booking2.id },
      isRead: true,
    },
  });
  await prisma.notification.upsert({
    where: { id: 'seed-notif-003' },
    update: {},
    create: {
      id: 'seed-notif-003',
      userId: amina.id,
      type: 'new_booking',
      title: 'Nouvelle réservation reçue',
      body: 'Koffi Assi souhaite réserver votre Studio Affaires Le Plateau pour 2 nuits.',
      data: { bookingId: booking3.id, propertyId: studioPlateauAmina.id },
      isRead: false,
    },
  });

  console.log(`  ✓ Notifications créées`);

  // ── Résumé ────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed terminé !');
  console.log('─────────────────────────────────────────────');
  console.log(`Admin       : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log('Client      : koffi.assi@gmail.com / Client1234!');
  console.log('Pro hébgt 1 : amina.coulibaly@residences.ci / Pro1234!');
  console.log('Pro hôtel   : dkone@hotel-plateau.ci / Pro1234!');
  console.log('Restaurateur: f.bamba@restaurant-saveur.ci / Pro1234!');
  console.log('Pro immo    : m.diallo@immo-abidjan.ci / Pro1234!');
  console.log('─────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
