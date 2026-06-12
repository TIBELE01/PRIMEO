// Seed de démonstration — propriétés avec vidéos de présentation
// Crée 3 propriétés publiées avec photos + 1 vidéo chacune, visibles dans l'app.
//
// Usage (depuis le dossier backend/) :
//   npx ts-node prisma/seed-video-demo.ts
//
// Prérequis : DATABASE_URL dans .env pointant vers votre Supabase.
import 'dotenv/config';
import { PrismaClient, Prisma, PropertyType, PropertyStatus, MediaType, PaymentOption, PlanType, SubscriptionStatus, AccountType, UserStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── URLs publiques MP4 (Google Sample Videos — domaine public, toujours disponibles) ──
const VIDEOS = {
  residence: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  hotel:     'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  immo:      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
};

// ── Photos Cloudinary seed (utilisées par le seed principal) ──
const PHOTOS = {
  residence: [
    { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/villa-cocody-1.jpg', isPrimary: true,  sortOrder: 1 },
    { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/villa-cocody-2.jpg', isPrimary: false, sortOrder: 2 },
    { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/villa-cocody-3.jpg', isPrimary: false, sortOrder: 3 },
  ],
  hotel: [
    { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/hotel-plateau-1.jpg', isPrimary: true,  sortOrder: 1 },
    { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/hotel-plateau-2.jpg', isPrimary: false, sortOrder: 2 },
  ],
  immo: [
    { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/villa-bassam-1.jpg', isPrimary: true,  sortOrder: 1 },
    { url: 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/seed/villa-bassam-2.jpg', isPrimary: false, sortOrder: 2 },
  ],
};

async function ensureProUser(
  email: string,
  firstName: string,
  lastName: string,
  accountType: AccountType,
): Promise<string> {
  // Find existing user in Prisma
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`  ✓ Utilisateur existant : ${email}`);
    return existing.id;
  }

  // Create in Supabase Auth first
  const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'Demo1234!',
    email_confirm: true,
    app_metadata: { role: accountType },
  });

  let uid: string;
  if (authData?.user) {
    uid = authData.user.id;
  } else {
    // Already in Supabase — find by email
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
    const found = list?.users?.find((u: any) => u.email === email);
    if (!found) throw new Error(`Impossible de créer/trouver ${email}: ${error?.message}`);
    uid = found.id;
  }

  // Mot de passe géré par Supabase Auth (créé ci-dessus) — aucun hash local
  await prisma.user.create({
    data: {
      id: uid,
      email,
      firstName,
      lastName,
      phone: `+2250101${Math.floor(Math.random() * 90000 + 10000)}`,
      accountType,
      status: UserStatus.active,
      subscription: {
        create: {
          // Formule v2 « Business » (§3.3 : 9 000 FCFA, 10 biens, 0 % commission)
          planType: PlanType.business,
          status: SubscriptionStatus.active,
          nextBillingDate: new Date(Date.now() + 30 * 86_400_000),
          monthlyPrice: 9000,
          includedPropertiesLimit: 10,
          commissionRate: 0,
          boostsFreeMonthly: 2,
        },
      },
    },
  });

  console.log(`  ✓ Utilisateur créé : ${email} (business)`);
  return uid;
}

async function upsertProperty(
  id: string,
  ownerId: string,
  data: Omit<Prisma.PropertyUncheckedCreateInput, 'id' | 'ownerId'>,
): Promise<string> {
  const prop = await prisma.property.upsert({
    where: { id },
    update: { status: PropertyStatus.active },
    create: { id, ownerId, ...data },
  });
  return prop.id;
}

async function upsertMedia(
  id: string,
  propertyId: string,
  url: string,
  mediaType: MediaType,
  isPrimary: boolean,
  sortOrder: number,
): Promise<void> {
  await prisma.propertyMedia.upsert({
    where: { id },
    update: { url },
    create: { id, propertyId, url, mediaType, isPrimary, sortOrder },
  });
}

async function main() {
  console.log('\n🎬 Seed vidéo démo — PRIMEO\n');

  // ── 1. Créer les propriétaires pro ──────────────────────────────────────────
  console.log('1. Propriétaires professionnels...');
  const aminaId = await ensureProUser(
    'amina.video.demo@primeo.ci', 'Amina', 'Coulibaly', AccountType.professional_hebergement,
  );
  const koneId = await ensureProUser(
    'dkone.video.demo@primeo.ci', 'Djibril', 'Koné', AccountType.professional_hotel,
  );
  const dialloId = await ensureProUser(
    'mdiallo.video.demo@primeo.ci', 'Mariama', 'Diallo', AccountType.professional_immobilier,
  );

  // ── 2. Créer les propriétés ──────────────────────────────────────────────────
  console.log('\n2. Propriétés...');

  // 2a. Villa résidence
  console.log('  → Villa Cocody Premium');
  const villaId = await upsertProperty('demo-video-villa-cocody', aminaId, {
    propertyType: PropertyType.residence,
    title: 'Villa Cocody Premium — Vidéo démo',
    description:
      'Magnifique villa entièrement meublée avec piscine privée et vue lagune. ' +
      '4 chambres, cuisine équipée, climatisation dans toutes les pièces. ' +
      'Idéale pour familles ou séjours professionnels de longue durée.',
    rooms: 5, bedrooms: 4, beds: 5, bathrooms: 2, surface: 220, capacity: 8,
    pricePerNight: 85000,
    street: 'Cocody Riviera Golf, Rue des Cocotiers',
    city: 'Abidjan', latitude: 5.3721, longitude: -3.9836,
    status: PropertyStatus.active,
    rating: 4.8, reviewCount: 7,
    amenities: ['wifi', 'piscine', 'parking', 'climatisation', 'cuisine_equipee', 'jardin'],
    paymentOptions: [PaymentOption.full_online, PaymentOption.ten_percent_online],
  });
  for (const p of PHOTOS.residence) {
    await upsertMedia(`demo-media-villa-${p.sortOrder}`, villaId, p.url, MediaType.photo, p.isPrimary, p.sortOrder);
  }
  await upsertMedia('demo-media-villa-video', villaId, VIDEOS.residence, MediaType.video, false, 10);

  // Scènes 3D de démonstration — panoramas équirectangulaires publics (three.js examples)
  const PANORAMAS = [
    { id: 'demo-3d-villa-salon',   roomName: 'Salon',   url: 'https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg' },
    { id: 'demo-3d-villa-exterieur', roomName: 'Extérieur', url: 'https://threejs.org/examples/textures/kandao3.jpg' },
  ];
  for (let i = 0; i < PANORAMAS.length; i++) {
    const sc = PANORAMAS[i];
    await prisma.property3dScene.upsert({
      where: { id: sc.id },
      update: { url: sc.url, roomName: sc.roomName },
      create: { id: sc.id, propertyId: villaId, roomName: sc.roomName, url: sc.url, sortOrder: i },
    });
  }
  await prisma.property.update({ where: { id: villaId }, data: { hasVirtualTour: true } });
  console.log(`     ✓ id=${villaId} — ${PHOTOS.residence.length} photos + 🎬 vidéo + 🔭 ${PANORAMAS.length} scènes 3D`);

  // 2b. Hôtel
  console.log('  → Hôtel Le Plateau Boutique');
  const hotelId = await upsertProperty('demo-video-hotel-plateau', koneId, {
    propertyType: PropertyType.hotel,
    title: 'Hôtel Palm Boutique ★★★★ — Vidéo démo',
    description:
      'Hôtel boutique 4 étoiles en plein cœur du Plateau. Chambres climatisées, ' +
      'restaurant gastronomique, spa, salle de réunion. Personnel multilingue 24h/24.',
    rooms: 24, bedrooms: 1, beds: 1, bathrooms: 1, surface: 35, capacity: 2,
    pricePerNight: 65000,
    street: 'Avenue Botreau Roussel, Le Plateau',
    city: 'Abidjan', latitude: 5.3189, longitude: -4.0167,
    status: PropertyStatus.active,
    rating: 4.5, reviewCount: 18,
    amenities: ['wifi', 'restaurant', 'spa', 'parking', 'climatisation', 'room_service', 'gym'],
    paymentOptions: [PaymentOption.full_online, PaymentOption.ten_percent_online],
  });
  for (const p of PHOTOS.hotel) {
    await upsertMedia(`demo-media-hotel-${p.sortOrder}`, hotelId, p.url, MediaType.photo, p.isPrimary, p.sortOrder);
  }
  await upsertMedia('demo-media-hotel-video', hotelId, VIDEOS.hotel, MediaType.video, false, 10);
  console.log(`     ✓ id=${hotelId} — ${PHOTOS.hotel.length} photos + 🎬 vidéo`);

  // 2c. Immobilier
  console.log('  → Villa à vendre Grand-Bassam');
  const immoId = await upsertProperty('demo-video-villa-bassam', dialloId, {
    propertyType: PropertyType.immobilier_achat,
    title: 'Villa R+1 Grand-Bassam face mer — Vidéo démo',
    description:
      'Villa R+1 de 220 m² à vendre dans le quartier France de Grand-Bassam. ' +
      '4 chambres, piscine, garage double. Titre foncier propre, notaire disponible.',
    rooms: 7, bedrooms: 4, bathrooms: 3, surface: 220,
    priceSale: 45000000,
    street: 'Rue du Bain Beurré, Quartier France',
    city: 'Grand-Bassam', latitude: 5.2087, longitude: -3.7352,
    status: PropertyStatus.active,
    rating: 4.2, reviewCount: 3,
    amenities: ['piscine', 'garage', 'jardin', 'titre_foncier'],
    paymentOptions: [PaymentOption.full_online],
  });
  for (const p of PHOTOS.immo) {
    await upsertMedia(`demo-media-immo-${p.sortOrder}`, immoId, p.url, MediaType.photo, p.isPrimary, p.sortOrder);
  }
  await upsertMedia('demo-media-immo-video', immoId, VIDEOS.immo, MediaType.video, false, 10);
  console.log(`     ✓ id=${immoId} — ${PHOTOS.immo.length} photos + 🎬 vidéo`);

  // ── Résumé ──────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed vidéo démo terminé !');
  console.log('─────────────────────────────────────────────────────────');
  console.log('3 propriétés avec vidéos créées/mises à jour :');
  console.log(`  • ${villaId}  → Villa Cocody (résidence)`);
  console.log(`  • ${hotelId}  → Hôtel Palm Boutique`);
  console.log(`  • ${immoId}  → Villa Grand-Bassam (immobilier)`);
  console.log("\nOuvrez l'app et cherchez \"Vidéo démo\" pour les retrouver.");
  console.log('─────────────────────────────────────────────────────────');
}

main()
  .catch((e) => { console.error('❌ Erreur seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
