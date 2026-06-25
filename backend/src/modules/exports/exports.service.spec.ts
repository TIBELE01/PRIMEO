// Tests unitaires du service d'export de données professionnel.
// Couvre : gating par type de compte et par plan (advanced_stats), limite anti-abus,
// cycle de vie du job (pending → processing → ready / failed), CSV généré,
// contrôle d'accès au téléchargement et expiration du lien.

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../config/env.config', () => ({
  env: { BACKEND_URL: 'http://localhost:3000', FRONTEND_URL: '' },
  cloudinaryParsed: { cloudName: 'test', apiKey: 'k', apiSecret: 's' },
}));

const sendEmailMock = jest.fn(async () => undefined);
jest.mock('../../common/utils/mailer', () => ({
  sendEmail: sendEmailMock,
}));

const uploadMock = jest.fn(async () => ({
  url: 'https://res.cloudinary.com/test/raw/upload/primeo/exports/file.csv',
  publicId: 'primeo/exports/file',
  format: 'csv',
  bytes: 1234,
}));
const deleteMock = jest.fn(async () => undefined);
jest.mock('../../common/utils/s3-client', () => ({
  uploadToCloudinary: uploadMock,
  deleteFromCloudinary: deleteMock,
  buildImageDeliveryUrl: (u: string) => u,
}));

const detailedStatsMock = jest.fn();
jest.mock('../analytics/analytics.service', () => ({
  analyticsService: { getDetailedStats: detailedStatsMock },
}));

const mockPrisma = {
  user: { findUnique: jest.fn() },
  subscription: { findUnique: jest.fn() },
  dataExport: {
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  booking: { findMany: jest.fn() },
  property: { findMany: jest.fn() },
  transaction: { findMany: jest.fn() },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { exportsService } from './exports.service';

const PRO_USER = { accountType: 'professional_hebergement' };

describe('exportsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(PRO_USER);
    mockPrisma.dataExport.count.mockResolvedValue(0);
    mockPrisma.dataExport.update.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      // Prisma renvoie la ligne complète après update — le mock reproduit cela
      id: 'exp-1', userId: 'pro-1', type: 'bookings', format: 'csv', ...args.data,
    }));
  });

  describe('createExport — contrôle d\'accès', () => {
    it('refuse un compte client', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'client' });
      await expect(
        exportsService.createExport('client-1', { type: 'bookings', format: 'csv' }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('refuse advanced_stats pour un plan starter', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'starter' });
      await expect(
        exportsService.createExport('pro-1', { type: 'advanced_stats', format: 'csv' }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('accepte advanced_stats pour un plan business', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
      mockPrisma.dataExport.create.mockResolvedValue({ id: 'exp-1', status: 'pending' });
      const rec = await exportsService.createExport('pro-1', { type: 'advanced_stats', format: 'csv' });
      expect(rec.id).toBe('exp-1');
    });

    it('applique la limite anti-abus (429 au-delà du quota horaire)', async () => {
      mockPrisma.dataExport.count.mockResolvedValue(10);
      await expect(
        exportsService.createExport('pro-1', { type: 'bookings', format: 'csv' }),
      ).rejects.toMatchObject({ statusCode: 429 });
    });
  });

  describe('processExport — cycle de vie', () => {
    const pendingRecord = {
      id: 'exp-1',
      userId: 'pro-1',
      type: 'bookings',
      format: 'csv',
      status: 'pending',
      periodFrom: new Date('2026-03-01'),
      periodTo: new Date('2026-06-01'),
    };

    it('génère un CSV, téléverse et passe le statut à ready avec email', async () => {
      mockPrisma.dataExport.findUnique.mockResolvedValue(pendingRecord);
      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: 'b1',
          property: { title: 'Villa "Les Palmiers", Abidjan', propertyType: 'residence' },
          client: { firstName: 'Koffi', lastName: 'K.' },
          startDate: new Date('2026-04-01'),
          endDate: new Date('2026-04-05'),
          guests: 2,
          totalAmount: 100000,
          onlinePaidAmount: 10000,
          remainingCashAmount: 90000,
          commissionAmount: 5000,
          status: 'confirmed',
          createdAt: new Date('2026-03-20'),
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'pro@test.ci', firstName: 'Awa' });

      await exportsService.processExport('exp-1');

      // Upload appelé avec un buffer CSV contenant la ligne et l'échappement RFC 4180
      expect(uploadMock).toHaveBeenCalledTimes(1);
      const [buffer, folder, filename, resourceType] = uploadMock.mock.calls[0] as unknown as [Buffer, string, string, string];
      const csv = buffer.toString('utf-8');
      expect(folder).toBe('primeo/System/exports');
      expect(filename).toMatch(/^primeo-bookings-.*\.csv$/);
      expect(resourceType).toBe('raw');
      expect(csv).toContain('"Villa ""Les Palmiers"", Abidjan"'); // échappement guillemets+virgule
      expect(csv).toContain('100000');

      // Statut final ready + email envoyé
      const updates = mockPrisma.dataExport.update.mock.calls.map((c: unknown[]) => (c[0] as { data: { status?: string } }).data.status);
      expect(updates).toContain('processing');
      expect(updates).toContain('ready');
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    it('passe le statut à failed si la génération échoue', async () => {
      mockPrisma.dataExport.findUnique.mockResolvedValue(pendingRecord);
      mockPrisma.booking.findMany.mockRejectedValue(new Error('DB indisponible'));

      await exportsService.processExport('exp-1');

      const lastUpdate = mockPrisma.dataExport.update.mock.calls.at(-1) as unknown[];
      expect((lastUpdate[0] as { data: { status: string; error: string } }).data).toMatchObject({
        status: 'failed',
        error: expect.stringContaining('DB indisponible'),
      });
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('ignore un export déjà traité (idempotence)', async () => {
      mockPrisma.dataExport.findUnique.mockResolvedValue({ ...pendingRecord, status: 'ready' });
      await exportsService.processExport('exp-1');
      expect(uploadMock).not.toHaveBeenCalled();
      expect(mockPrisma.dataExport.update).not.toHaveBeenCalled();
    });
  });

  describe('getDownloadUrl — accès et expiration', () => {
    it('refuse l\'accès à l\'export d\'un autre utilisateur', async () => {
      mockPrisma.dataExport.findUnique.mockResolvedValue({ id: 'exp-1', userId: 'autre-pro' });
      await expect(exportsService.getDownloadUrl('pro-1', 'exp-1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('refuse un export non prêt', async () => {
      mockPrisma.dataExport.findUnique.mockResolvedValue({ id: 'exp-1', userId: 'pro-1', status: 'processing' });
      await expect(exportsService.getDownloadUrl('pro-1', 'exp-1')).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse un lien expiré (410)', async () => {
      mockPrisma.dataExport.findUnique.mockResolvedValue({
        id: 'exp-1', userId: 'pro-1', status: 'ready',
        fileUrl: 'https://x/file.csv', expiresAt: new Date(Date.now() - 1000),
      });
      await expect(exportsService.getDownloadUrl('pro-1', 'exp-1')).rejects.toMatchObject({ statusCode: 410 });
    });

    it('renvoie l\'URL pour un export valide', async () => {
      const expiresAt = new Date(Date.now() + 86_400_000);
      mockPrisma.dataExport.findUnique.mockResolvedValue({
        id: 'exp-1', userId: 'pro-1', status: 'ready',
        fileUrl: 'https://x/file.csv', expiresAt,
      });
      await expect(exportsService.getDownloadUrl('pro-1', 'exp-1')).resolves.toEqual({
        url: 'https://x/file.csv',
        expiresAt,
      });
    });
  });

  describe('purgeExpired', () => {
    it('supprime le fichier Cloudinary et marque expired', async () => {
      mockPrisma.dataExport.findMany.mockResolvedValue([
        { id: 'exp-1', filePublicId: 'primeo/exports/old' },
      ]);
      const purged = await exportsService.purgeExpired();
      expect(purged).toBe(1);
      expect(deleteMock).toHaveBeenCalledWith('primeo/exports/old', 'raw');
      expect(mockPrisma.dataExport.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: { status: 'expired', fileUrl: null },
      });
    });
  });
});
