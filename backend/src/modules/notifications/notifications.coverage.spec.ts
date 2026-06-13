// Couverture étendue notificationsService : contenus in-app (switch buildInApp),
// listing, lecture, et préférences.
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../common/utils/mailer', () => ({ sendTemplateEmail: jest.fn(async () => undefined) }));
jest.mock('../../common/utils/push', () => ({ registerExpoTokenWithOneSignal: jest.fn(async () => null) }));
jest.mock('../../common/utils/sms', () => ({ sendSms: jest.fn(async () => undefined) }));
jest.mock('../../config/brevo.config', () => ({ brevoConfig: { templates: {
  bookingConfirmation: 3, bookingCancellation: 4, paymentReceipt: 5, subscriptionRenewal: 8,
  kycApproved: 6, kycRejected: 7, referralReward: 11,
} } }));
jest.mock('./providers/push.provider', () => ({ pushProvider: { sendToUser: jest.fn(async () => undefined) } }));

const mockPrisma: Record<string, any> = {
  user: { findUnique: jest.fn(), update: jest.fn(async () => ({})) },
  notification: { create: jest.fn(async () => ({})), findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn(async () => ({ count: 1 })) },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { notificationsService } from './notifications.service';

const flush = () => new Promise((r) => setTimeout(r, 0));
beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue({ email: 'u@test.ci', firstName: 'A', phone: '+2250700000000', notificationPreferences: null });
});

// Couvre le switch buildInAppContent pour un large éventail de types → le corps
// in-app est généré pour chacun (persisté via notification.create).
describe('notify — contenus in-app par type', () => {
  const types = [
    'booking_confirmed', 'booking_cancelled', 'new_booking', 'property_interest', 'interest_submitted',
    'payment_failed', 'payment_success', 'new_message', 'review_received', 'review_published',
    'dispute_opened', 'dispute_resolved', 'kyc_approved', 'kyc_rejected', 'subscription_renewal',
    'subscription_suspended', 'subscription_upgraded', 'subscription_downgraded', 'subscription_reactivated',
    'subscription_grace_warning', 'account_suspended', 'property_approved', 'property_rejected',
    'property_modifications_requested', 'property_suspended', 'ticket_status_changed', 'ticket_comment_added',
    'otp_code', 'referral_reward', 'stay_reminder',
  ];
  it.each(types)('persiste une notification in-app non vide pour %s', async (type) => {
    await notificationsService.notify({
      type: type as never,
      recipientId: 'u1',
      data: { propertyTitle: 'X', startDate: 'd1', endDate: 'd2', senderName: 'S', planName: 'Business', newPlanName: 'Business', otpCode: '123456', rating: 5, daysRemaining: 3, totalAmount: 1000, reason: 'r', subject: 'sub', newStatus: 'open', refereeName: 'R', rewardAmount: 250 },
    });
    await flush();
    expect(mockPrisma.notification.create).toHaveBeenCalled();
    const arg = mockPrisma.notification.create.mock.calls.at(-1)![0].data;
    expect(arg.title).toBeTruthy();
  });
});

describe('listing & lecture', () => {
  it('listForUser renvoie data + compteur non lus', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([{ id: 'n1' }]);
    mockPrisma.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1); // total, unread
    const res = await notificationsService.listForUser('u1', 1, 50);
    expect(res).toMatchObject({ total: 1, unread: 1, pages: 1 });
  });
  it('markRead cible la notification de l\'utilisateur', async () => {
    await notificationsService.markRead('n1', 'u1');
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({ where: { id: 'n1', userId: 'u1' }, data: { isRead: true } });
  });
  it('markAllRead passe toutes les non-lues à lues', async () => {
    await notificationsService.markAllRead('u1');
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1', isRead: false }, data: { isRead: true } });
  });
});

describe('préférences', () => {
  it('getPreferences fusionne avec les défauts', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ notificationPreferences: { sms: false } });
    const p = await notificationsService.getPreferences('u1');
    expect(p).toEqual({ email: true, push: true, sms: false });
  });
  it('updatePreferences fusionne et persiste', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ notificationPreferences: { email: true, push: true, sms: true } });
    const merged = await notificationsService.updatePreferences('u1', { push: false });
    expect(merged).toEqual({ email: true, push: false, sms: true });
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });
});
