/**
 * Supprime les dossiers VIDES laissés par les migrations successives (anciens
 * dossiers à plat <propertyId>, "tour-3d", etc.), sans toucher aux dossiers qui
 * contiennent des assets ni au squelette permanent (STATIC_FOLDERS).
 *
 * Parcours post-ordre : on nettoie les enfants avant le parent ; un dossier
 * n'est supprimé que s'il est réellement vide (l'API Cloudinary refuse sinon).
 *
 * Lancement : npx tsx scripts/cleanup-cloudinary-folders.ts [racine]
 *   (racine par défaut : "primeo")
 */
import 'dotenv/config';
for (const k of ['PUBLIC_URL', 'BACKEND_URL', 'FRONTEND_URL']) {
  if (!/^https?:\/\//.test(process.env[k] ?? '')) process.env[k] = 'http://localhost:4000';
}
/* eslint-disable @typescript-eslint/no-require-imports */
import axios from 'axios';
const { cloudinaryParsed } = require('../src/config/env.config') as typeof import('../src/config/env.config');
const { STATIC_FOLDERS } = require('../src/config/cloudinary-paths') as typeof import('../src/config/cloudinary-paths');
/* eslint-enable @typescript-eslint/no-require-imports */

const ROOT = process.argv[2] ?? 'primeo';

if (!cloudinaryParsed) { console.error('Cloudinary non configuré'); process.exit(1); }
const { cloudName, apiKey, apiSecret } = cloudinaryParsed;
const auth = { username: apiKey as string, password: apiSecret as string };
const base = `https://api.cloudinary.com/v1_1/${cloudName}`;

// Dossiers à NE JAMAIS supprimer, même vides (squelette + ancêtres).
const PROTECT = new Set<string>();
for (const f of STATIC_FOLDERS) {
  const parts = f.split('/');
  for (let i = 1; i <= parts.length; i++) PROTECT.add(parts.slice(0, i).join('/'));
}
PROTECT.add('primeo');

let deleted = 0;
let kept = 0;

async function listSub(path: string): Promise<string[]> {
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    try {
      const r = await axios.get(`${base}/folders/${encodeURI(path)}`, {
        auth, params: { max_results: 500, ...(cursor ? { next_cursor: cursor } : {}) },
      });
      for (const f of r.data.folders as Array<{ path: string }>) out.push(f.path);
      cursor = r.data.next_cursor;
    } catch {
      break;
    }
  } while (cursor);
  return out;
}

async function purge(path: string): Promise<void> {
  for (const sub of await listSub(path)) await purge(sub);
  if (PROTECT.has(path)) { kept++; return; }
  try {
    await axios.delete(`${base}/folders/${encodeURI(path)}`, { auth });
    deleted++;
    console.log(`  🗑️  ${path}`);
  } catch {
    kept++; // non vide (contient des assets) → conservé
  }
}

(async () => {
  console.log(`\n🧹 Nettoyage des dossiers vides sous "${ROOT}" …\n`);
  for (const sub of await listSub(ROOT)) await purge(sub);
  console.log(`\nTerminé : ${deleted} dossier(s) vide(s) supprimé(s), ${kept} conservé(s).\n`);
})().catch((e) => { console.error(e); process.exit(1); });
