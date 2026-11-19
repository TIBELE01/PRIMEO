// Dossier de partenariat (PDF) — remplaçable depuis l'administration.
// Le fichier est stocké dans un bucket privé ; le lien public de la page « Devenir partenaire »
// pointe vers l'API, qui sert toujours la version en vigueur (ou le fichier d'origine du site).
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { uploadPrivateFile, downloadPrivateFile, deletePrivateFile } from '../../common/utils/private-storage';
import { createAudit } from '../admin/admin.service';

export const DOSSIER_BUCKET = 'website-docs';
export const DOSSIER_CONFIG_KEY = 'partnership_dossier';
export const DOSSIER_DOWNLOAD_NAME = 'Primeo-dossier-de-partenariat.pdf';
const VITRINE = (process.env['VITRINE_URL']?.trim() || 'https://primeo-vitrine-152o.onrender.com').replace(/\/+$/, '');
/** Fichier d'origine livré avec le site vitrine (utilisé tant qu'aucun dossier n'a été téléversé) */
export const DOSSIER_DEFAULT_URL = `${VITRINE}/assets/docs/primeo-dossier-partenariat.pdf`;
const MAX_SIZE = 10 * 1024 * 1024;

interface DossierMeta { ref: string; filename: string; size: number; uploadedAt: string }

async function readMeta(): Promise<DossierMeta | null> {
  const row = await prisma.platformConfig.findUnique({ where: { key: DOSSIER_CONFIG_KEY } });
  const v = row?.value as unknown as DossierMeta | null;
  return v && typeof v === 'object' && typeof v.ref === 'string' ? v : null;
}

export const partnershipDossierService = {
  /** Informations pour l'administration */
  async info() {
    const meta = await readMeta();
    return meta
      ? { custom: true, filename: meta.filename, size: meta.size, uploadedAt: meta.uploadedAt, defaultUrl: DOSSIER_DEFAULT_URL }
      : { custom: false, filename: 'primeo-dossier-partenariat.pdf', size: null, uploadedAt: null, defaultUrl: DOSSIER_DEFAULT_URL };
  },

  /** Contenu à servir au public : le PDF téléversé, ou null pour rediriger vers le fichier d'origine */
  async publicFile(): Promise<Buffer | null> {
    const meta = await readMeta();
    if (!meta) return null;
    try {
      return await downloadPrivateFile(meta.ref);
    } catch {
      return null; // fichier indisponible : repli sur le dossier d'origine plutôt qu'une erreur
    }
  },

  async upload(buffer: Buffer, filename: string, adminId: string, ip?: string) {
    if (!/\.pdf$/i.test(filename) || buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new HttpError(400, 'Le dossier doit être un fichier PDF valide');
    }
    if (buffer.length > MAX_SIZE) throw new HttpError(400, 'Le fichier dépasse 10 Mo');
    const previous = await readMeta();
    const ref = await uploadPrivateFile(DOSSIER_BUCKET, filename, buffer);
    const meta: DossierMeta = { ref, filename, size: buffer.length, uploadedAt: new Date().toISOString() };
    await prisma.platformConfig.upsert({
      where: { key: DOSSIER_CONFIG_KEY },
      create: { key: DOSSIER_CONFIG_KEY, value: meta as never, updatedBy: adminId },
      update: { value: meta as never, updatedBy: adminId },
    });
    if (previous) deletePrivateFile(previous.ref).catch(() => {});
    await createAudit({
      adminId, action: 'admin.website.partnership_dossier.update', targetType: 'website', targetId: DOSSIER_CONFIG_KEY,
      description: `Dossier de partenariat remplacé (${filename}, ${Math.round(buffer.length / 1024)} Ko)`, ipAddress: ip,
    });
    return this.info();
  },

  /** Revient au dossier d'origine du site */
  async reset(adminId: string, ip?: string) {
    const previous = await readMeta();
    if (previous) {
      await prisma.platformConfig.delete({ where: { key: DOSSIER_CONFIG_KEY } });
      deletePrivateFile(previous.ref).catch(() => {});
      await createAudit({
        adminId, action: 'admin.website.partnership_dossier.reset', targetType: 'website', targetId: DOSSIER_CONFIG_KEY,
        description: 'Dossier de partenariat : retour au fichier d\'origine', ipAddress: ip,
      });
    }
    return this.info();
  },
};
