// Tests — listes d'administration : statut affiché, filtres, tri, compteurs et périodes.
const mockPrisma = {
  user: { findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn(), findUnique: jest.fn() },
  dispute: { findMany: jest.fn(), count: jest.fn() },
  auditLog: { create: jest.fn() },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../subscriptions/subscriptions.service', () => ({ subscriptionsService: {} }));
jest.mock('../notifications/notifications.service', () => ({ notificationsService: {} }));
jest.mock('../referrals/referrals.service', () => ({ referralsService: {} }));
jest.mock('../payments/services/genius-pay.service', () => ({ geniusPayService: {} }));
jest.mock('../../common/utils/mailer', () => ({ sendEmail: jest.fn(), sendTestEmail: jest.fn() }));
jest.mock('../../config/env.config', () => ({ env: {} }));
jest.mock('../../common/utils/account-status', () => ({ setSupabaseBan: jest.fn() }));
jest.mock('../auth/two-factor.service', () => ({ twoFactorService: {} }));
jest.mock('../../config/supabase.config', () => ({ supabaseAdmin: {} }));
jest.mock('../../common/utils/role-sync', () => ({ syncSupabaseRole: jest.fn() }));
jest.mock('../../common/middleware/maintenance.middleware', () => ({ getMaintenanceState: jest.fn(), invalidateMaintenanceCache: jest.fn() }));
jest.mock('../../common/utils/push', () => ({ sendPushBroadcast: jest.fn() }));

import { adminService } from './admin.service';

const baseUser = {
  id: 'u1', email: 'a@b.ci', phone: null, firstName: 'A', lastName: 'B', accountType: 'professional_hotel',
  status: 'pending', walletBalance: 0, createdAt: new Date(),
  professionalProfile: { verificationStatus: 'rejected', city: 'Abidjan', businessName: 'Hôtel X' }, subscription: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findMany.mockResolvedValue([baseUser]);
  mockPrisma.user.count.mockResolvedValue(1);
  mockPrisma.user.groupBy.mockResolvedValue([{ accountType: 'professional_hotel', _count: { _all: 1 } }]);
});

describe('listUsers', () => {
  it('calcule le statut affiché : KYC rejeté prime sur « en attente »', async () => {
    const res = await adminService.listUsers({});
    expect(res.data[0]!.displayStatus).toBe('rejected');
    expect(res.data[0]!.city).toBe('Abidjan');
  });

  it('un banni reste banni même avec un KYC rejeté', async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ ...baseUser, status: 'banned' }]);
    const res = await adminService.listUsers({});
    expect(res.data[0]!.displayStatus).toBe('banned');
  });

  it('retourne des compteurs par statut et par type', async () => {
    const res = await adminService.listUsers({ role: 'professional_hotel' });
    expect(Object.keys(res.counts).sort()).toEqual(['active', 'all', 'banned', 'pending', 'rejected', 'suspended']);
    expect(res.typeCounts).toEqual({ professional_hotel: 1 });
  });

  it('filtre par type, statut, ville et période', async () => {
    await adminService.listUsers({ role: 'client', status: 'banned', city: 'Abidjan', period: '7d' });
    const where = mockPrisma.user.findMany.mock.calls[0][0].where as { AND: Record<string, unknown>[] };
    const flat = JSON.stringify(where);
    expect(flat).toContain('"accountType":"client"');
    expect(flat).toContain('"status":"banned"');
    expect(flat).toContain('Abidjan');
    expect(flat).toContain('createdAt');
  });

  it('ignore une colonne de tri non autorisée', async () => {
    await adminService.listUsers({ sortBy: 'walletBalance; DROP TABLE users', sortDir: 'asc' });
    expect(mockPrisma.user.findMany.mock.calls[0][0].orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
  });

  it('accepte un tri valide et borne la pagination', async () => {
    await adminService.listUsers({ sortBy: 'email', sortDir: 'asc', page: '3', limit: '9999' });
    const args = mockPrisma.user.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual([{ email: 'asc' }, { id: 'asc' }]);
    expect(args.take).toBe(100);
    expect(args.skip).toBe(200);
  });

  it('compte les dossiers KYC uniquement à la demande', async () => {
    const without = await adminService.listUsers({});
    expect(without.kycCounts).toBeUndefined();
    const withCounts = await adminService.listUsers({ withKycCounts: 'true', pro: 'true' });
    expect(withCounts.kycCounts).toEqual({ pending: 1, approved: 1, rejected: 1, all: 3 });
  });
});

describe('listDisputes', () => {
  beforeEach(() => {
    mockPrisma.dispute.findMany.mockResolvedValue([]);
    mockPrisma.dispute.count.mockResolvedValue(0);
  });
  it('traduit la priorité « critique » en ancienneté ≥ 7 jours', async () => {
    await adminService.listDisputes({ priority: 'critique' });
    const where = JSON.stringify(mockPrisma.dispute.findMany.mock.calls[0][0].where);
    expect(where).toContain('lte');
  });
  it('retourne les compteurs par statut', async () => {
    const res = await adminService.listDisputes({});
    expect(Object.keys(res.counts)).toContain('under_review');
  });
});

describe('getUser (fiche administrateur)', () => {
  const base = {
    id: 'p1', email: 'p@x.ci', accountType: 'professional_hotel', adminNotes: 'à surveiller', status: 'active',
    subscription: null, _count: { properties: 4, clientBookings: 2 },
    professionalProfile: { verificationStatus: 'approved', documents: [
      { id: 'd1', type: 'rccm', url: 'https://x/doc.pdf', uploadedAt: new Date(), verifiedAt: new Date(), rejectedReason: null },
      { id: 'd2', type: 'identity', url: 'https://x/id.pdf', uploadedAt: new Date(), verifiedAt: null, rejectedReason: 'Illisible' },
      { id: 'd3', type: 'tax_number', url: 'https://x/t.pdf', uploadedAt: new Date(), verifiedAt: null, rejectedReason: null },
    ] },
  };
  it('expose rôle, KYC réel, documents, note et compteurs', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(base);
    const u = (await adminService.getUser('p1')) as Record<string, unknown>;
    expect(u['role']).toBe('professional_hotel');
    expect(u['kycVerified']).toBe(true);
    expect(u['isProfessional']).toBe(true);
    expect(u['internalNote']).toBe('à surveiller');
    expect(u['propertiesCount']).toBe(4);
    expect((u['kycDocuments'] as { status: string }[]).map((d) => d.status)).toEqual(['approved', 'rejected', 'pending']);
  });
  it('un client n’est pas un professionnel et n’a pas de KYC', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...base, accountType: 'client', professionalProfile: null });
    const u = (await adminService.getUser('p1')) as Record<string, unknown>;
    expect(u['isProfessional']).toBe(false);
    expect(u['kycVerified']).toBe(false);
    expect(u['kycDocuments']).toEqual([]);
  });
});
