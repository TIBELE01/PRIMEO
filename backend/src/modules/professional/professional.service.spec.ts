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
jest.mock('../../config/supabase.config', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        getUserById: jest.fn(async () => ({ data: { user: { id: 'user-1', user_metadata: {} } }, error: null })),
        updateUserById: jest.fn(async () => ({ error: null })),
      },
    },
  },
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
});
