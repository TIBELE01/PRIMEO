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
  user: { findUnique: jest.fn(), update: jest.fn(async () => ({})) },
  notification: { create: jest.fn(async () => ({})) },
  pushToken: { upsert: jest.fn(async () => ({})) },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { notificationsService } from './notifications.service';
import { sendTemplateEmail } from '../../common/utils/mailer';
import { pushProvider } from './providers/push.provider';
import { registerExpoTokenWithOneSignal } from '../../common/utils/push';

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

  it('stay_reminder (rappel J-1) : push envoyé, pas d\'email (CHANNEL_CONFIG)', async () => {
    await notificationsService.notify({
      type: 'stay_reminder', recipientId: 'client-1',
      data: { bookingId: 'bk-9', propertyTitle: 'Villa', startDate: '13 juin' },
    });
    await flush();
    expect(pushProvider.sendToUser).toHaveBeenCalledWith('client-1', 'stay_reminder', expect.any(String), expect.stringContaining('demain'), expect.any(Object), 'high');
    expect(sendTemplateEmail).not.toHaveBeenCalled();
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

describe('registerPushToken — enregistrement appareil (chaîne mobile → OneSignal → base)', () => {
  it('enregistre le token en base (push_tokens) avec le player_id OneSignal', async () => {
    await notificationsService.registerPushToken('user-1', 'ExponentPushToken[abc123]', 'android');

    // 1) Tentative d'enregistrement OneSignal (mock → player-1)
    expect(registerExpoTokenWithOneSignal).toHaveBeenCalledWith('ExponentPushToken[abc123]', 'user-1', 'android');
    // 2) Upsert idempotent dans push_tokens (même token re-soumis → réactivation)
    expect(mockPrisma.pushToken.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_token: { userId: 'user-1', token: 'ExponentPushToken[abc123]' } },
      create: expect.objectContaining({ userId: 'user-1', playerId: 'player-1', platform: 'android', isActive: true }),
    }));
    // 3) Rétro-compatibilité : player_id reflété sur le user
    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' }, data: { onesignalPlayerId: 'player-1' },
    }));
  });

  it('stocke quand même le token si OneSignal est indisponible (playerId null)', async () => {
    (registerExpoTokenWithOneSignal as jest.Mock).mockResolvedValueOnce(null);
    await notificationsService.registerPushToken('user-2', 'ExponentPushToken[xyz]', 'ios');
    expect(mockPrisma.pushToken.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ userId: 'user-2', playerId: null }),
    }));
    expect(mockPrisma.user.update).not.toHaveBeenCalled(); // pas de player_id à refléter
  });
});
