/**
 * Migration + (ré)organisation des médias sur Cloudinary selon l'arborescence
 * Primeo (cf. src/config/cloudinary-paths.ts).
 *
 * Pour chaque média référencé en base :
 *   • pas encore sur Cloudinary  → upload (par URL distante) dans le dossier cible ;
 *   • déjà sur Cloudinary mais mauvais dossier → rename/déplacement + asset_folder ;
 *   • déjà bien rangé → on s'assure juste que l'asset_folder est aligné.
 *
 * IDEMPOTENT · ROBUSTE (try/catch par média) · `--dry-run` (ou DRY_RUN=1).
 * Lancement : npm run migrate:cloudinary [-- --dry-run]
 */
import 'dotenv/config';

for (const k of ['PUBLIC_URL', 'BACKEND_URL', 'FRONTEND_URL']) {
  if (!/^https?:\/\//.test(process.env[k] ?? '')) process.env[k] = 'http://localhost:4000';
}

/* eslint-disable @typescript-eslint/no-require-imports */
const { prisma } = require('../src/database/prisma.service') as typeof import('../src/database/prisma.service');
const s3 = require('../src/common/utils/s3-client') as typeof import('../src/common/utils/s3-client');
type CloudinaryResourceType = import('../src/common/utils/s3-client').CloudinaryResourceType;
const { cloudinaryPaths } = require('../src/config/cloudinary-paths') as typeof import('../src/config/cloudinary-paths');
const { cloudinaryParsed } = require('../src/config/env.config') as typeof import('../src/config/env.config');
/* eslint-enable @typescript-eslint/no-require-imports */

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const CLOUDINARY_HOST = 'res.cloudinary.com';

type Row = Record<string, string> & { id: string; u: string };

interface Target {
  name: string;
  table: string;
  publicIdCol?: string;
  query: string;
  folderFor: (row: Row) => string;
  resourceTypeFor: (row: Row) => CloudinaryResourceType;
}

const TARGETS: Target[] = [
  {
    name: 'property_media', table: 'property_media', publicIdCol: 'publicId',
    query: `SELECT pm.id AS id, pm."url" AS u, pm."mediaType" AS "mediaType",
                   pm."propertyId" AS "propertyId", p."propertyType" AS "propertyType"
            FROM "property_media" pm JOIN "properties" p ON p.id = pm."propertyId"
            WHERE pm."url" IS NOT NULL AND pm."url" <> ''`,
    folderFor: (r) => cloudinaryPaths.propertyMedia(r.propertyType as never, r.propertyId, r.mediaType as never),
    resourceTypeFor: (r) => (r.mediaType === 'video' ? 'video' : 'image'),
  },
  {
    name: 'property_3d_scenes', table: 'property_3d_scenes', publicIdCol: 'publicId',
    query: `SELECT s.id AS id, s."url" AS u, s."propertyId" AS "propertyId", p."propertyType" AS "propertyType"
            FROM "property_3d_scenes" s JOIN "properties" p ON p.id = s."propertyId"
            WHERE s."url" IS NOT NULL AND s."url" <> ''`,
    folderFor: (r) => cloudinaryPaths.property3d(r.propertyType as never, r.propertyId),
    resourceTypeFor: () => 'image',
  },
  {
    name: 'review_media', table: 'review_media', publicIdCol: 'publicId',
    query: `SELECT rm.id AS id, rm."url" AS u, r."authorId" AS "authorId"
            FROM "review_media" rm JOIN "reviews" r ON r.id = rm."reviewId"
            WHERE rm."url" IS NOT NULL AND rm."url" <> ''`,
    folderFor: (r) => cloudinaryPaths.clientReviews(r.authorId),
    resourceTypeFor: () => 'image',
  },
  {
    name: 'professional_documents', table: 'professional_documents',
    query: `SELECT pd.id AS id, pd."url" AS u, pd."type" AS "docType", u.id AS "userId", u."accountType" AS "accountType"
            FROM "professional_documents" pd
            JOIN "professional_profiles" pp ON pp.id = pd."profileId"
            JOIN "users" u ON u.id = pp."userId"
            WHERE pd."url" IS NOT NULL AND pd."url" <> ''`,
    folderFor: (r) => cloudinaryPaths.kycDocument(r.accountType as never, r.userId, r.docType as never),
    resourceTypeFor: () => 'auto',
  },
  {
    name: 'users.avatar', table: 'users', publicIdCol: undefined,
    query: `SELECT id AS id, "avatarUrl" AS u, "accountType" AS "accountType"
            FROM "users" WHERE "avatarUrl" IS NOT NULL AND "avatarUrl" <> ''`,
    folderFor: (r) => cloudinaryPaths.userAvatar(r.accountType as never, r.id),
    resourceTypeFor: () => 'image',
  },
];

function publicIdFromUrl(url: string): string | null {
  const m = url.match(/\/upload\/(.+)$/);
  if (!m) return null;
  return m[1].replace(/^v\d+\//, '').replace(/\.[^./]+$/, '');
}
const dirname = (pid: string) => pid.split('/').slice(0, -1).join('/');
const basename = (pid: string) => pid.split('/').pop() as string;

async function updateDb(t: Target, urlCol: string, id: string, url: string, publicId: string): Promise<void> {
  if (t.publicIdCol) {
    await prisma.$executeRawUnsafe(`UPDATE "${t.table}" SET "${urlCol}" = $1, "${t.publicIdCol}" = $2 WHERE id = $3`, url, publicId, id);
  } else {
    await prisma.$executeRawUnsafe(`UPDATE "${t.table}" SET "${urlCol}" = $1 WHERE id = $2`, url, id);
  }
}

interface Stat { table: string; total: number; uploads: number; deplaces: number; ranges: number; echecs: number }

async function migrateTarget(t: Target): Promise<Stat> {
  const urlCol = t.table === 'users' ? 'avatarUrl' : 'url';
  const rows = await prisma.$queryRawUnsafe<Row[]>(t.query);
  const stat: Stat = { table: t.name, total: rows.length, uploads: 0, deplaces: 0, ranges: 0, echecs: 0 };

  for (const row of rows) {
    const url = row.u;
    const targetFolder = t.folderFor(row);
    const resourceType = t.resourceTypeFor(row);
    try {
      if (url.includes(CLOUDINARY_HOST)) {
        const currentPid = publicIdFromUrl(url);
        if (!currentPid) { stat.ranges++; continue; }
        let finalPid = currentPid;
        if (dirname(currentPid) !== targetFolder) {
          const targetPid = `${targetFolder}/${basename(currentPid)}`;
          if (DRY_RUN) { console.log(`  [dry] MOVE ${t.name}#${row.id}: ${currentPid} → ${targetPid}`); stat.deplaces++; }
          else {
            const res = await s3.renameCloudinaryAsset(currentPid, targetPid, resourceType);
            await updateDb(t, urlCol, row.id, res.url, res.publicId);
            finalPid = res.publicId;
            stat.deplaces++;
            console.log(`  ⇄ ${t.name}#${row.id} → ${res.publicId}`);
          }
        } else {
          stat.ranges++;
        }
        if (!DRY_RUN) {
          await s3.setCloudinaryAssetFolder(finalPid, dirname(finalPid), resourceType)
            .catch((e) => console.error(`  ⚠ asset_folder ${t.name}#${row.id}: ${(e as Error).message}`));
        }
      } else {
        if (DRY_RUN) { console.log(`  [dry] UPLOAD ${t.name}#${row.id} → ${targetFolder}`); stat.uploads++; continue; }
        const res = await s3.uploadRemoteToCloudinary(url, targetFolder, resourceType);
        await updateDb(t, urlCol, row.id, res.url, res.publicId);
        stat.uploads++;
        console.log(`  ✓ ${t.name}#${row.id} → ${res.publicId}`);
      }
    } catch (err) {
      stat.echecs++;
      console.error(`  ✗ ${t.name}#${row.id} (${url}) : ${(err as Error).message}`);
    }
  }
  return stat;
}

async function main(): Promise<void> {
  if (!cloudinaryParsed) {
    console.error('❌ Cloudinary non configuré (CLOUDINARY_* manquantes).');
    process.exit(1);
  }
  console.log(`\n🌥️  Migration + organisation médias → Cloudinary (cloud="${cloudinaryParsed.cloudName}") ${DRY_RUN ? '— DRY-RUN' : ''}\n`);

  const stats: Stat[] = [];
  for (const t of TARGETS) {
    console.log(`→ ${t.name} …`);
    stats.push(await migrateTarget(t));
  }

  console.log('\n──────── Récapitulatif ────────');
  console.table(stats);
  const echecs = stats.reduce((s, r) => s + r.echecs, 0);
  console.log(
    `\nTotal : ${stats.reduce((s, r) => s + r.uploads, 0)} uploadé(s), ` +
    `${stats.reduce((s, r) => s + r.deplaces, 0)} déplacé(s), ` +
    `${stats.reduce((s, r) => s + r.ranges, 0)} déjà rangé(s), ${echecs} échec(s).${DRY_RUN ? ' (dry-run)' : ''}\n`,
  );

  await prisma.$disconnect();
  process.exit(echecs > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Erreur fatale migration:', err);
  await prisma.$disconnect();
  process.exit(1);
});
