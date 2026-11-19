const mockPrisma = { platformConfig: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() } };
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));
const mockUpload = jest.fn(async () => 'storage:website-docs/2026/abc-dossier.pdf');
const mockDownload = jest.fn(async () => Buffer.from('%PDF-1.4 contenu'));
const mockDelete = jest.fn(async () => undefined);
jest.mock('../../common/utils/private-storage', () => ({
  uploadPrivateFile: (...a: unknown[]) => mockUpload(...(a as [])),
  downloadPrivateFile: (...a: unknown[]) => mockDownload(...(a as [])),
  deletePrivateFile: (...a: unknown[]) => mockDelete(...(a as [])),
}));
jest.mock('../admin/admin.service', () => ({ createAudit: jest.fn() }));

import { partnershipDossierService, DOSSIER_DEFAULT_URL } from './partnership-dossier.service';

beforeEach(() => jest.clearAllMocks());

describe('dossier de partenariat', () => {
  it('sans dossier téléversé : fichier d’origine du site', async () => {
    mockPrisma.platformConfig.findUnique.mockResolvedValue(null);
    expect(await partnershipDossierService.publicFile()).toBeNull();
    expect((await partnershipDossierService.info()).custom).toBe(false);
    expect(DOSSIER_DEFAULT_URL).toMatch(/\/assets\/docs\/primeo-dossier-partenariat\.pdf$/);
  });

  it('refuse un fichier qui n’est pas un PDF', async () => {
    mockPrisma.platformConfig.findUnique.mockResolvedValue(null);
    await expect(partnershipDossierService.upload(Buffer.from('bonjour'), 'dossier.pdf', 'a1')).rejects.toMatchObject({ statusCode: 400 });
    await expect(partnershipDossierService.upload(Buffer.from('%PDF-1.4'), 'dossier.docx', 'a1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('téléverse, sert la nouvelle version et supprime l’ancienne', async () => {
    mockPrisma.platformConfig.findUnique.mockResolvedValueOnce({ value: { ref: 'storage:website-docs/old.pdf', filename: 'old.pdf', size: 1, uploadedAt: 'x' } });
    mockPrisma.platformConfig.findUnique.mockResolvedValue({ value: { ref: 'storage:website-docs/2026/abc-dossier.pdf', filename: 'dossier.pdf', size: 16, uploadedAt: 'y' } });
    const info = await partnershipDossierService.upload(Buffer.from('%PDF-1.4 contenu'), 'dossier.pdf', 'a1');
    expect(mockUpload).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith('storage:website-docs/old.pdf');
    expect(info.custom).toBe(true);
    expect((await partnershipDossierService.publicFile())?.toString()).toContain('%PDF');
  });

  it('retour au dossier d’origine', async () => {
    mockPrisma.platformConfig.findUnique.mockResolvedValueOnce({ value: { ref: 'storage:website-docs/x.pdf', filename: 'x.pdf', size: 1, uploadedAt: 'z' } }).mockResolvedValue(null);
    const info = await partnershipDossierService.reset('a1');
    expect(mockPrisma.platformConfig.delete).toHaveBeenCalled();
    expect(info.custom).toBe(false);
  });
});
