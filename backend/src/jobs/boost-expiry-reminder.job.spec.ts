// Tests du rappel d'expiration de boost J-1 : sélection des boosts expirant
// dans les prochaines 24-25h, notification email+push+in-app du propriétaire,
// et idempotence (pas de double rappel pour un même boost).
jest.mock('../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../modules/notifications/notifications.service', () => ({
  notificationsService: { notify: jest.fn(async () => undefined) },
}));

const mockPrisma: Record<string, any> = {
  boost: { findMany: jest.fn() },
  notification: { findFirst: jest.fn() },
};
jest.mock('../database/prisma.service', () => ({ prisma: mockPrisma }));

import { runBoostExpiryReminders } from './boost-expiry-reminder.job';
import { notificationsService } from '../modules/notifications/notifications.service';

const boost = (id: string, userId: string) => ({
  id, userId, endDate: new Date('2026-06-14T10:00:00Z'), property: { title: 'Belle Villa' },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.notification.findFirst.mockResolvedValue(null);
});

describe('runBoostExpiryReminders', () => {
  it('sends reminder for a boost expiring in 24-25h', async () => {
    mockPrisma.boost.findMany.mockResolvedValue([boost('b1', 'u1'), boost('b2', 'u2')]);
    const { sent, skipped } = await runBoostExpiryReminders();

    expect(sent).toBe(2);
    expect(skipped).toBe(0);
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'boost_expiry_reminder',
      recipientId: 'u1',
      data: expect.objectContaining({ boostId: 'b1', propertyTitle: 'Belle Villa' }),
    }));
  });

  it('skips if already notified (idempotence)', async () => {
    mockPrisma.boost.findMany.mockResolvedValue([boost('b1', 'u1')]);
    mockPrisma.notification.findFirst.mockResolvedValue({ id: 'n1' });
    const { sent, skipped } = await runBoostExpiryReminders();

    expect(sent).toBe(0);
    expect(skipped).toBe(1);
    expect(notificationsService.notify).not.toHaveBeenCalled();
    expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ type: 'boost_expiry_reminder', data: { path: ['boostId'], equals: 'b1' } }),
    }));
  });

  it('returns zeros when no boosts expiring', async () => {
    mockPrisma.boost.findMany.mockResolvedValue([]);
    const { sent, skipped } = await runBoostExpiryReminders();

    expect(sent).toBe(0);
    expect(skipped).toBe(0);
    expect(notificationsService.notify).not.toHaveBeenCalled();
  });
});
