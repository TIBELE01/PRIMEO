// Vérifie que notify() envoie bien email (Brevo) ET push (OneSignal) pour les
// types liés aux réservations/intérêts — garantissant que « les deux parties
// reçoivent email + push » pour les flux restaurant et immobilier.
jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../common/utils/mailer', () => ({ sendTemplateEmail: jest.fn(async () => undefined) }));
jest.mock('../../common/utils/push', () => ({ registerExpoTokenWithOneSignal: jest.fn(async () => 'player-1') }));
jest.mock('../../common/utils/sms', () => ({ sendSms: jest.fn(async () => undefined) }));
jest.mock('../../config/brevo.config', () => ({
  brevoConfig: { templates: { bookingConfirmation: 3, bookingCancellation: 4, paymentReceipt: 5, subscriptionRenewal: 8, kycApproved: 6, kycRejected: 7, referralReward: 11 } },
}));
jest.mock('./providers/push.provider', () => ({ pushProvider: { sendToUser: jest.fn(async () => undefined) } }));

const mockPrisma: Record<string, any> = {
  user: { findUnique: jest.fn() },
  notification: { create: jest.fn(async () => ({})) },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { notificationsService } from './notifications.service';
import { sendTemplateEmail } from '../../common/utils/mailer';
import { pushProvider } from './providers/push.provider';

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
  // Utilisateur sans préférences explicites → défauts : email/push/sms = true
  mockPrisma.user.findUnique.mockResolvedValue({
    email: 'pro@test.ci', firstName: 'Amina', phone: '+2250700000002', notificationPreferences: null,
  });
});

describe('notificationsService.notify — email + push pour les réservations', () => {
  it('new_booking (professionnel) : persiste in-app, envoie email Brevo ET push OneSignal', async () => {
    await notificationsService.notify({
      type: 'new_booking', recipientId: 'owner-1',
      data: { propertyTitle: 'Resto', startDate: '1 mars', endDate: '1 mars', senderName: 'Koffi' },
    });
    await flush();
    expect(mockPrisma.notification.create).toHaveBeenCalled();
    expect(sendTemplateEmail).toHaveBeenCalled();
    expect(pushProvider.sendToUser).toHaveBeenCalledWith('owner-1', 'new_booking', expect.any(String), expect.any(String), expect.any(Object), expect.any(String));
  });

  it('booking_confirmed (client) : email + push', async () => {
    await notificationsService.notify({
      type: 'booking_confirmed', recipientId: 'client-1',
      data: { propertyTitle: 'Villa', startDate: '1 mars', endDate: '3 mars' },
    });
    await flush();
    expect(sendTemplateEmail).toHaveBeenCalled();
    expect(pushProvider.sendToUser).toHaveBeenCalledWith('client-1', 'booking_confirmed', expect.any(String), expect.any(String), expect.any(Object), expect.any(String));
  });

  it('interest_booking_received (immobilier) : email + push', async () => {
    await notificationsService.notify({
      type: 'interest_booking_received', recipientId: 'owner-2',
      data: { propertyTitle: 'Villa Bassam', senderName: 'Koffi', isInterest: true },
    });
    await flush();
    expect(sendTemplateEmail).toHaveBeenCalled();
    expect(pushProvider.sendToUser).toHaveBeenCalledWith('owner-2', 'interest_booking_received', expect.any(String), expect.any(String), expect.any(Object), expect.any(String));
  });

  it('respecte les préférences : push désactivé → pas de push, email conservé', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      email: 'pro@test.ci', firstName: 'Amina', phone: '+2250700000002', notificationPreferences: { push: false },
    });
    await notificationsService.notify({
      type: 'booking_confirmed', recipientId: 'client-1', data: { propertyTitle: 'Villa' },
    });
    await flush();
    expect(sendTemplateEmail).toHaveBeenCalled();
    expect(pushProvider.sendToUser).not.toHaveBeenCalled();
  });
});
