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

// ── setupTotp() ───────────────────────────────────────────────────────────────

describe('professionalService.setupTotp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('generates a TOTP secret and QR code, stores secret in Supabase user_metadata', async () => {
    const { generateTotpSecret, generateQrCode } = jest.requireMock('../../common/utils/totp') as Record<string, jest.Mock>;
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', email: 'u@test.ci' });

    const result = await professionalService.setupTotp('user-1');

    expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(result.qrCode).toBe('data:image/png;base64,abc123');
    expect(generateTotpSecret).toHaveBeenCalled();
    expect(generateQrCode).toHaveBeenCalled();
    expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('user-1', {
      user_metadata: { twoFactorSecret: 'JBSWY3DPEHPK3PXP', twoFactorEnabled: false },
    });
  });

  it('throws 404 when user not found in DB', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPrisma.user.findUnique.mockResolvedValueOnce(null as any);
    await expect(professionalService.setupTotp('ghost')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── confirmTotp() ─────────────────────────────────────────────────────────────

describe('professionalService.confirmTotp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('enables 2FA in Supabase user_metadata when code is valid', async () => {
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { id: 'user-1', user_metadata: { twoFactorSecret: 'SECRET', twoFactorEnabled: false } } },
      error: null,
    });

    await professionalService.confirmTotp('user-1', '123456');

    expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('user-1', {
      user_metadata: { twoFactorSecret: 'SECRET', twoFactorEnabled: true },
    });
  });

  it('throws 400 when TOTP setup has not been started (no secret)', async () => {
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { id: 'user-1', user_metadata: {} } },
      error: null,
    });
    await expect(professionalService.confirmTotp('user-1', '123456')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when TOTP code is invalid', async () => {
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { id: 'user-1', user_metadata: { twoFactorSecret: 'SECRET' } } },
      error: null,
    });
    const { verifyTotp } = jest.requireMock('../../common/utils/totp') as { verifyTotp: jest.Mock };
    verifyTotp.mockReturnValueOnce(false);

    await expect(professionalService.confirmTotp('user-1', '000000')).rejects.toMatchObject({ statusCode: 400 });
    expect(mockSupabaseAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it('throws 404 when Supabase user not found', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValueOnce({ data: { user: null }, error: { message: 'not found' } } as any);
    await expect(professionalService.confirmTotp('ghost', '123456')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── disableTotp() ─────────────────────────────────────────────────────────────

describe('professionalService.disableTotp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clears twoFactorEnabled and twoFactorSecret in Supabase', async () => {
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { id: 'user-1', user_metadata: { twoFactorEnabled: true, twoFactorSecret: 'SEC', otherField: 'x' } } },
      error: null,
    });

    await professionalService.disableTotp('user-1');

    expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('user-1', {
      user_metadata: { otherField: 'x', twoFactorEnabled: false, twoFactorSecret: null },
    });
  });
});
