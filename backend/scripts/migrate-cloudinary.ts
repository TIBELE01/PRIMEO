/**
 * Migration + organisation des médias sur Cloudinary.
 *
 * Pour chaque média référencé en base :
 *   • s'il n'est PAS encore sur Cloudinary  → upload (par URL distante) dans le
 *     bon sous-dossier, puis mise à jour de la base ;
 *   • s'il est DÉJÀ sur Cloudinary mais dans le mauvais dossier → rename/déplacement
 *     vers le sous-dossier cible, puis mise à jour de la base ;
 *   • s'il est déjà bien rangé → ignoré.
 *
 * Arborescence cible (dans le dossier "primeo") :
 *   primeo/properties/<propertyId>/            ← photos & vidéos d'un bien
 *   primeo/properties/<propertyId>/tour-3d/    ← scènes 360°
 *   primeo/reviews/<reviewId>/                 ← médias d'avis
 *   primeo/kyc/<profileId>/                    ← documents KYC
 *   primeo/avatars/                            ← photos de profil
 *
 * Caractéristiques : IDEMPOTENT, ROBUSTE (try/catch par média), TRAÇABLE,
 * `--dry-run` (ou DRY_RUN=1) n'écrit rien.
 *
 * Lancement :  npm run migrate:cloudinary              (exécution réelle)
 *              npm run migrate:cloudinary -- --dry-run   (simulation)
 */
import 'dotenv/config';

// Ce script ne se sert pas des URLs applicatives ; on évite que la validation
// stricte d'env.config échoue dessus. À exécuter AVANT le chargement d'env.config.
for (const k of ['PUBLIC_URL', 'BACKEND_URL', 'FRONTEND_URL']) {
  if (!/^https?:\/\//.test(process.env[k] ?? '')) process.env[k] = 'http://localhost:4000';
}

/* eslint-disable @typescript-eslint/no-require-imports */
const { prisma } = require('../src/database/prisma.service') as typeof import('../src/database/prisma.service');
const s3 = require('../src/common/utils/s3-client') as typeof import('../src/common/utils/s3-client');
type CloudinaryResourceType = import('../src/common/utils/s3-client').CloudinaryResourceType;
const { cloudinaryParsed } = require('../src/config/env.config') as typeof import('../src/config/env.config');
/* eslint-enable @typescript-eslint/no-require-imports */

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const CLOUDINARY_HOST = 'res.cloudinary.com';

type Row = Record<string, string | null> & { id: string };

interface Target {
  table: string;
  urlCol: string;
  publicIdCol?: string;
  select: string[]; // colonnes supplémentaires (entre guillemets) nécessaires au rangement
  folderFor: (row: Row) => string;
  resourceTypeFor: (row: Row) => CloudinaryResourceType;
}

const TARGETS: Target[] = [
  {
    table: 'property_media', urlCol: 'url', publicIdCol: 'publicId',
    select: ['"propertyId"', '"mediaType"'],
    folderFor: (r) => `primeo/properties/${r.propertyId}`,
    resourceTypeFor: (r) => (r.mediaType === 'video' ? 'video' : 'image'),
  },
  {
    table: 'property_3d_scenes', urlCol: 'url', publicIdCol: 'publicId',
    select: ['"propertyId"'],
    folderFor: (r) => `primeo/properties/${r.propertyId}/tour-3d`,
    resourceTypeFor: () => 'image',
  },
  {
    table: 'review_media', urlCol: 'url', publicIdCol: 'publicId',
    select: ['"reviewId"'],
    folderFor: (r) => `primeo/reviews/${r.reviewId}`,
    resourceTypeFor: () => 'image',
  },
  {
    table: 'professional_documents', urlCol: 'url',
    select: ['"profileId"'],
    folderFor: (r) => `primeo/kyc/${r.profileId}`,
    resourceTypeFor: () => 'auto',
  },
  {
    table: 'users', urlCol: 'avatarUrl',
    select: [],
    folderFor: () => 'primeo/avatars',
    resourceTypeFor: () => 'image',
  },
];

// Extrait le public_id à partir d'une URL Cloudinary brute (.../upload/v123/<public_id>.<ext>).
function publicIdFromUrl(url: string): string | null {
  const m = url.match(/\/upload\/(.+)$/);
  if (!m) return null;
  return m[1].replace(/^v\d+\//, '').replace(/\.[^./]+$/, '');
}
const dirname = (pid: string) => pid.split('/').slice(0, -1).join('/');
const basename = (pid: string) => pid.split('/').pop() as string;

async function updateDb(t: Target, id: string, url: string, publicId: string): Promise<void> {
  if (t.publicIdCol) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${t.table}" SET "${t.urlCol}" = $1, "${t.publicIdCol}" = $2 WHERE id = $3`,
      url, publicId, id,
    );
  } else {
    await prisma.$executeRawUnsafe(`UPDATE "${t.table}" SET "${t.urlCol}" = $1 WHERE id = $2`, url, id);
  }
}

interface Stat { table: string; total: number; uploads: number; deplaces: number; ignores: number; echecs: number }

async function migrateTarget(t: Target): Promise<Stat> {
  const cols = ['id', `"${t.urlCol}" AS u`, ...t.select].join(', ');
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT ${cols} FROM "${t.table}" WHERE "${t.urlCol}" IS NOT NULL AND "${t.urlCol}" <> ''`,
  );

  const stat: Stat = { table: t.table, total: rows.length, uploads: 0, deplaces: 0, ignores: 0, echecs: 0 };
  for (const row of rows) {
    const url = (row as Row & { u: string }).u;
    const targetFolder = t.folderFor(row);
    const resourceType = t.resourceTypeFor(row);
    try {
      if (url.includes(CLOUDINARY_HOST)) {
        // Déjà sur Cloudinary : normaliser le public_id (URL) ET le dossier d'affichage
        const currentPid = publicIdFromUrl(url);
        if (!currentPid) { stat.ignores++; continue; }
        let finalPid = currentPid;
        if (dirname(currentPid) !== targetFolder) {
          const targetPid = `${targetFolder}/${basename(currentPid)}`;
          if (DRY_RUN) {
            console.log(`  [dry] MOVE ${t.table}#${row.id}: ${currentPid} → ${targetPid}`);
            stat.deplaces++;
          } else {
            const res = await s3.renameCloudinaryAsset(currentPid, targetPid, resourceType);
            await updateDb(t, row.id, res.url, res.publicId);
            finalPid = res.publicId;
            stat.deplaces++;
            console.log(`  ⇄ ${t.table}#${row.id} → ${res.publicId}`);
          }
        } else {
          stat.ignores++;
        }
        // Aligne le asset_folder (dossier d'affichage médiathèque) sur le public_id
        if (!DRY_RUN) {
          await s3.setCloudinaryAssetFolder(finalPid, dirname(finalPid), resourceType)
            .catch((e) => console.error(`  ⚠ asset_folder ${t.table}#${row.id}: ${(e as Error).message}`));
        }
      } else {
        // Pas encore sur Cloudinary : upload par URL distante
        if (DRY_RUN) { console.log(`  [dry] UPLOAD ${t.table}#${row.id} → ${targetFolder}`); stat.uploads++; continue; }
        const res = await s3.uploadRemoteToCloudinary(url, targetFolder, resourceType);
        await updateDb(t, row.id, res.url, res.publicId);
        stat.uploads++;
        console.log(`  ✓ ${t.table}#${row.id} → ${res.publicId}`);
      }
    } catch (err) {
      stat.echecs++;
      console.error(`  ✗ ${t.table}#${row.id} (${url}) : ${(err as Error).message}`);
    }
  }
  return stat;
}

async function main(): Promise<void> {
  if (!cloudinaryParsed) {
    console.error('❌ Cloudinary non configuré. Définissez CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET (ou CLOUDINARY_URL) dans .env.');
    process.exit(1);
  }
  console.log(`\n🌥️  Migration + organisation médias → Cloudinary (cloud="${cloudinaryParsed.cloudName}") ${DRY_RUN ? '— DRY-RUN (aucune écriture)' : ''}\n`);

  const stats: Stat[] = [];
  for (const t of TARGETS) {
    console.log(`→ ${t.table} …`);
    stats.push(await migrateTarget(t));
  }

  console.log('\n──────── Récapitulatif ────────');
  console.table(stats);
  const echecs = stats.reduce((s, r) => s + r.echecs, 0);
  console.log(
    `\nTotal : ${stats.reduce((s, r) => s + r.uploads, 0)} uploadé(s), ` +
    `${stats.reduce((s, r) => s + r.deplaces, 0)} déplacé(s), ` +
    `${stats.reduce((s, r) => s + r.ignores, 0)} déjà rangé(s), ${echecs} échec(s).${DRY_RUN ? ' (dry-run)' : ''}\n`,
  );

  await prisma.$disconnect();
  process.exit(echecs > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Erreur fatale migration:', err);
  await prisma.$disconnect();
  process.exit(1);
});
