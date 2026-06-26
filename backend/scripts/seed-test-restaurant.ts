/* Données de test pour le restaurant de démo : menus (status pending → validation
 * admin requise) + tables. Idempotent. */
import 'dotenv/config';
import { prisma } from '../src/database/prisma.service';

const PID = '095825be-2528-44e4-a7cb-0810628ea955'; // Le Corner Burger – Artisan Burgers
const PH = (label: string, color = 'DC2626') =>
  `https://placehold.co/600x400/${color}/white?text=${encodeURIComponent(label)}`;

const items = [
  { section: 'Entrées', name: 'Salade Attiéké Poisson', description: 'Attiéké frais, poisson braisé, légumes croquants.', price: 3500, photoUrl: PH('Salade') },
  { section: 'Entrées', name: 'Alloco piment', description: 'Bananes plantain frites, sauce piment maison.', price: 2000, photoUrl: PH('Alloco') },
  { section: 'Plats principaux', name: 'Corner Burger Signature', description: 'Steak haché, cheddar, oignons caramélisés, frites maison.', price: 6500, photoUrl: PH('Burger') },
  { section: 'Plats principaux', name: 'Poulet Kedjenou', description: 'Poulet mijoté aux épices, riz parfumé.', price: 5500, photoUrl: PH('Kedjenou') },
  { section: 'Plats principaux', name: 'Garba spécial', description: 'Thon frit, attiéké, oignons, piment.', price: 3000, photoUrl: PH('Garba') },
  { section: 'Desserts', name: 'Beignets sucrés', description: 'Beignets moelleux saupoudrés de sucre.', price: 1500, photoUrl: PH('Beignets', 'F59E0B') },
  { section: 'Desserts', name: 'Salade de fruits tropicaux', description: 'Mangue, ananas, papaye, fruit de la passion.', price: 2000, photoUrl: PH('Fruits', '10B981') },
  { section: 'Boissons', name: 'Bissap maison', description: "Jus d'hibiscus frais, menthe.", price: 1000, photoUrl: PH('Bissap', '7C3AED') },
  { section: 'Boissons', name: 'Jus de gingembre', description: 'Gingembre pressé, citron.', price: 1000, photoUrl: PH('Gingembre', '7C3AED') },
  { section: 'Boissons', name: 'Eau minérale 50cl', description: 'Bouteille 50cl.', price: 500, photoUrl: PH('Eau', '0284C7') },
];

const tables = [
  { name: 'Table 1', seats: 2, location: 'Intérieur' },
  { name: 'Table 2', seats: 4, location: 'Intérieur' },
  { name: 'Table 3', seats: 4, location: 'Terrasse' },
  { name: 'Table 6', seats: 6, location: 'Terrasse' },
  { name: 'Salon privé', seats: 10, location: 'Étage' },
];

(async () => {
  const prop = await prisma.property.findUnique({ where: { id: PID }, select: { title: true } });
  if (!prop) { console.error('Restaurant introuvable:', PID); process.exit(1); }
  console.log('Restaurant:', prop.title);

  for (const it of items) {
    const exists = await prisma.restaurantMenuItem.findFirst({ where: { propertyId: PID, name: it.name } });
    if (exists) { console.log('• skip menu (existe):', it.name); continue; }
    await prisma.restaurantMenuItem.create({ data: { propertyId: PID, ...it } }); // status -> pending (défaut)
    console.log('✓ menu créé (pending):', it.name);
  }
  for (const t of tables) {
    const exists = await prisma.restaurantTable.findFirst({ where: { propertyId: PID, name: t.name } });
    if (exists) { console.log('• skip table (existe):', t.name); continue; }
    await prisma.restaurantTable.create({ data: { propertyId: PID, ...t } });
    console.log('✓ table créée:', t.name);
  }

  const pending = await prisma.restaurantMenuItem.count({ where: { propertyId: PID, status: 'pending' } });
  const approved = await prisma.restaurantMenuItem.count({ where: { propertyId: PID, status: 'approved' } });
  const tbl = await prisma.restaurantTable.count({ where: { propertyId: PID } });
  console.log(`\n=> Menus: ${pending} pending, ${approved} approved | Tables: ${tbl}`);
  process.exit(0);
})();
