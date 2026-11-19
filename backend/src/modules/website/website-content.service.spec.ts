// Tests — blocs de contenu statique du site vitrine : registre, nettoyage HTML, validation, lecture/écriture.
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../../common/utils/s3-client', () => ({ uploadToCloudinary: jest.fn(async () => ({ url: 'https://res.cloudinary.com/x/a.png' })) }));
jest.mock('../admin/admin.service', () => ({ createAudit: jest.fn(async () => undefined) }));

const mockPrisma = {
  websiteContentBlock: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn(), groupBy: jest.fn() },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { websiteContentService, sanitizeHtml, REGISTRY, PAGE_LABELS } from './website-content.service';

const textKey = REGISTRY.find((b) => b.type === 'text')!;
const htmlKey = REGISTRY.find((b) => b.type === 'html')!;
const linkKey = REGISTRY.find((b) => b.type === 'link')!;
const imgKey = REGISTRY.find((b) => b.type === 'image')!;
const numKey = REGISTRY.find((b) => b.type === 'number')!;

describe('registre', () => {
  it('a des clés uniques et chaque page est connue', () => {
    expect(new Set(REGISTRY.map((b) => b.key)).size).toBe(REGISTRY.length);
    REGISTRY.forEach((b) => expect(PAGE_LABELS[b.page]).toBeDefined());
  });
  it('couvre les cinq types de blocs', () => {
    [textKey, htmlKey, linkKey, imgKey, numKey].forEach((b) => expect(b).toBeDefined());
  });
});

describe('sanitizeHtml', () => {
  it('retire scripts, attributs d\'événement et balises non autorisées', () => {
    const out = sanitizeHtml('<p onclick="x()">Bonjour <strong>toi</strong><script>alert(1)</script><img src=x onerror=alert(1)></p>');
    expect(out).toBe('Bonjour <strong>toi</strong>');
  });
  it('n\'accepte que des liens sûrs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitizeHtml('<a href="/contact/">x</a>')).toBe('<a href="/contact/">x</a>');
    expect(sanitizeHtml('<a href="https://exemple.ci">x</a>')).toContain('rel="noopener noreferrer"');
  });
});

describe('websiteContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.websiteContentBlock.findUnique.mockResolvedValue(null);
    mockPrisma.websiteContentBlock.upsert.mockImplementation(async ({ create }: { create: { value: string } }) => ({ ...create, updatedAt: new Date() }));
  });

  it('refuse une clé inconnue', async () => {
    await expect(websiteContentService.upsert('inconnue.cle', 'x', 'admin')).rejects.toMatchObject({ statusCode: 404 });
  });
  it('valide les liens, images et nombres', async () => {
    await expect(websiteContentService.upsert(linkKey.key, 'javascript:alert(1)', 'a')).rejects.toMatchObject({ statusCode: 400 });
    await expect(websiteContentService.upsert(imgKey.key, 'http://non-securise.ci/a.png', 'a')).rejects.toMatchObject({ statusCode: 400 });
    await expect(websiteContentService.upsert(numKey.key, '12abc', 'a')).rejects.toMatchObject({ statusCode: 400 });
    await expect(websiteContentService.upsert(numKey.key, '42', 'a')).resolves.toMatchObject({ value: '42' });
  });
  it('enregistre un texte (sans balises) et nettoie un bloc HTML', async () => {
    await expect(websiteContentService.upsert(textKey.key, 'Nouveau <b>titre</b>', 'a')).resolves.toMatchObject({ value: 'Nouveau btitre/b' });
    const r = await websiteContentService.upsert(htmlKey.key, 'Du <strong>gras</strong><script>x</script>', 'a');
    expect(r.value).toBe('Du <strong>gras</strong>');
  });
  it('ne renvoie au public que les valeurs modifiées de la page et du global', async () => {
    mockPrisma.websiteContentBlock.findMany.mockResolvedValue([{ key: 'home.a', value: 'X' }]);
    await expect(websiteContentService.publicBlocks('home')).resolves.toEqual({ 'home.a': 'X' });
    expect(mockPrisma.websiteContentBlock.findMany.mock.calls[0][0].where.page.in).toEqual(['home', 'global']);
    await expect(websiteContentService.publicBlocks('page-inexistante')).rejects.toMatchObject({ statusCode: 404 });
  });
  it('rétablit le contenu par défaut', async () => {
    mockPrisma.websiteContentBlock.findUnique.mockResolvedValue({ key: textKey.key, value: 'X' });
    await websiteContentService.reset(textKey.key, 'a');
    expect(mockPrisma.websiteContentBlock.delete).toHaveBeenCalled();
  });
  it('liste les blocs avec leur état « modifié »', async () => {
    mockPrisma.websiteContentBlock.findMany.mockResolvedValue([{ key: textKey.key, value: 'Autre', updatedAt: new Date() }]);
    const list = await websiteContentService.adminList({ page: textKey.page });
    expect(list.find((b) => b.key === textKey.key)).toMatchObject({ isModified: true, value: 'Autre' });
    expect(list.every((b) => b.page === textKey.page)).toBe(true);
  });
});
