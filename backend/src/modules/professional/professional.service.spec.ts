// Tests unitaires — professionalService.submitKyc. I/O externe (Cloudinary, prisma) mockée.

// ── Mocks — déclarés avant les imports ────────────────────────────────────────

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../config/cloudinary.config', () => ({
  cloudinaryConfig: { folders: { kyc: 'primeo/kyc' } },
}));

const mockUpload = jest.fn((..._args: unknown[]) => Promise.resolve({ url: 'https://cdn.test/doc.pdf', publicId: 'p1', format: 'pdf', bytes: 100 }));
jest.mock('../../common/utils/s3-client', () => ({
  uploadToCloudinary: (...args: unknown[]) => mockUpload(...args),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(async () => ({ id: 'user-1', email: 'u@test.ci' })),
  },
  professionalProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  professionalDocument: {
    create: jest.fn(async () => ({})),
  },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

// supabase.config valide les variables d'environnement au chargement (process.exit) —
// indispensable de le mocker, le service l'importe pour le TOTP en user_metadata.
const mockSupabaseAdmin = {
  auth: {
    admin: {
      getUserById: jest.fn(async () => ({ data: { user: { id: 'user-1', user_metadata: {} } }, error: null })),
      updateUserById: jest.fn(async () => ({ error: null })),
    },
  },
};
jest.mock('../../config/supabase.config', () => ({ supabaseAdmin: mockSupabaseAdmin }));

const mockTwoFactorService = {
  setup: jest.fn(async () => ({ secret: 'SECRET123', qrCode: 'data:image/png;base64,abc123' })),
  confirm: jest.fn(async () => undefined),
  disable: jest.fn(async () => undefined),
};
jest.mock('../auth/two-factor.service', () => ({ twoFactorService: mockTwoFactorService }));

jest.mock('../../common/utils/totp', () => ({
  generateTotpSecret: jest.fn(() => 'JBSWY3DPEHPK3PXP'),
  generateTotpUri: jest.fn(() => 'otpauth://totp/Primeo:u@test.ci?secret=JBSWY3DPEHPK3PXP'),
  generateQrCode: jest.fn(async () => 'data:image/png;base64,abc123'),
  verifyTotp: jest.fn(() => true),
}));

import { professionalService } from './professional.service';

function fakeFile(name: string, mimetype: string, size = 1000): Express.Multer.File {
  return { originalname: name, mimetype, size, buffer: Buffer.from('x') } as Express.Multer.File;
}

const baseInput = { businessName: 'Hôtel Savane', rccm: 'CI-ABJ-123', taxId: 'TX-9' };

describe('professionalService.submitKyc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue({ url: 'https://cdn.test/doc.pdf', publicId: 'p1', format: 'pdf', bytes: 100 });
    // Profil existant en statut rejected (cas re-soumission)
    mockPrisma.professionalProfile.findUnique
      .mockResolvedValueOnce({ id: 'prof-1', rccm: null, taxId: null, touristLicense: null, street: null, city: null, description: null, documents: [] })
      .mockResolvedValue({ id: 'prof-1', verificationStatus: 'pending', documents: [{ id: 'd1' }] });
    mockPrisma.professionalProfile.update.mockResolvedValue({ id: 'prof-1', verificationStatus: 'pending' });
    mockPrisma.professionalProfile.create.mockResolvedValue({ id: 'prof-1', verificationStatus: 'pending' });
  });

  it('téléverse les documents et repasse le statut à pending (re-soumission)', async () => {
    const files = {
      id_card: [fakeFile('cni.jpg', 'image/jpeg')],
      rccm_extract: [fakeFile('rccm.pdf', 'application/pdf')],
    };

    const result = await professionalService.submitKyc('user-1', baseInput, files);

    // Profil mis à jour avec statut pending réinitialisé
    expect(mockPrisma.professionalProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ verificationStatus: 'pending', verifiedAt: null, verifiedBy: null }),
      }),
    );
    // Deux documents téléversés vers Cloudinary en mode 'auto'
    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(mockUpload.mock.calls[0][3]).toBe('auto');
    expect(mockPrisma.professionalDocument.create).toHaveBeenCalledTimes(2);
    expect(result.uploaded).toHaveLength(2);
  });

  it('crée le profil si absent', async () => {
    mockPrisma.professionalProfile.findUnique
      .mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: 'prof-1', verificationStatus: 'pending', documents: [] });

    await professionalService.submitKyc('user-2', baseInput, {});

    expect(mockPrisma.professionalProfile.create).toHaveBeenCalled();
    expect(mockPrisma.professionalProfile.update).not.toHaveBeenCalled();
  });

  it('rejette un format de fichier non autorisé', async () => {
    const files = { id_card: [fakeFile('virus.exe', 'application/x-msdownload')] };
    await expect(professionalService.submitKyc('user-1', baseInput, files)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockPrisma.professionalDocument.create).not.toHaveBeenCalled();
  });

  it('accepte une soumission sans fichier (mise à jour des infos seulement)', async () => {
    const result = await professionalService.submitKyc('user-1', baseInput, {});
    expect(mockUpload).not.toHaveBeenCalled();
    expect(result.uploaded).toHaveLength(0);
  });

  it('rejette un fichier image dépassant 5 Mo', async () => {
    const files = { id_card: [fakeFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024)] };
    await expect(professionalService.submitKyc('user-1', baseInput, files)).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ── getKycStatus() ────────────────────────────────────────────────────────────

describe('professionalService.getKycStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retourne le statut et les documents du profil', async () => {
    const profile = {
      verificationStatus: 'approved',
      verifiedAt: new Date(),
      verificationNotes: null,
      businessName: 'Hôtel Savane',
      rccm: 'CI-ABJ-123',
      taxId: 'TX-9',
      touristLicense: null,
      documents: [{ id: 'd1', type: 'id_card', url: 'https://cdn.test/doc.jpg', uploadedAt: new Date(), rejectedReason: null }],
    };
    mockPrisma.professionalProfile.findUnique.mockResolvedValueOnce(profile);

    const result = await professionalService.getKycStatus('user-1');

    expect(result.verificationStatus).toBe('approved');
    expect(result.documents).toHaveLength(1);
  });

  it('throws 404 when no profile found', async () => {
    mockPrisma.professionalProfile.findUnique.mockResolvedValueOnce(null);
    await expect(professionalService.getKycStatus('user-missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── 2FA : délégation au service central (modules/auth/two-factor.service) ─────

describe('professionalService — 2FA', () => {
  beforeEach(() => jest.clearAllMocks());

  it('setupTotp délègue au service 2FA', async () => {
    const result = await professionalService.setupTotp('user-1');
    expect(result.secret).toBe('SECRET123');
    expect(mockTwoFactorService.setup).toHaveBeenCalledWith('user-1');
  });

  it('confirmTotp transmet le code et le jeton de la session courante', async () => {
    await professionalService.confirmTotp('user-1', '123456', 'access-token');
    expect(mockTwoFactorService.confirm).toHaveBeenCalledWith('user-1', '123456', 'access-token');
  });

  it('disableTotp transmet le code TOTP exigé pour la désactivation', async () => {
    await professionalService.disableTotp('user-1', '654321');
    expect(mockTwoFactorService.disable).toHaveBeenCalledWith('user-1', '654321');
  });
});
