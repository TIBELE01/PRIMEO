// Tests des rappels de séjour J-7 / J-1 : sélection des réservations confirmées qui
// commencent demain, notification push du client, et idempotence (pas de
// double rappel pour une même réservation).
jest.mock('../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../modules/notifications/notifications.service', () => ({
  notificationsService: { notify: jest.fn(async () => undefined) },
}));

const mockPrisma: Record<string, any> = {
  booking: { findMany: jest.fn() },
  notification: { findFirst: jest.fn() },
};
jest.mock('../database/prisma.service', () => ({ prisma: mockPrisma }));

import { runStayReminders } from './stay-reminder.job';
import { notificationsService } from '../modules/notifications/notifications.service';

const booking = (id: string, clientId: string) => ({
  id, clientId, startDate: new Date('2026-07-01'), endDate: new Date('2026-07-03'), property: { title: 'Villa Cocody' },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.notification.findFirst.mockResolvedValue(null);
});

describe('runStayReminders — rappels J-7 et J-1', () => {
  it('J-7 puis J-1 : chaque échéance a sa fenêtre et son libellé', async () => {
    mockPrisma.booking.findMany
      .mockResolvedValueOnce([booking('bk-7', 'c7')])  // J-7
      .mockResolvedValueOnce([booking('bk-1', 'c1')]); // J-1
    const res = await runStayReminders();
    expect(res).toEqual({ sent: 2, skipped: 0 });
    const [j7, j1] = mockPrisma.booking.findMany.mock.calls.map((c: any[]) => c[0].where.startDate.gte.getTime());
    expect(j7 - j1).toBe(6 * 24 * 60 * 60 * 1000);
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'c7', data: expect.objectContaining({ bookingId: 'bk-7', reminder: 'J-7', daysBefore: '7' }),
    }));
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'c1', data: expect.objectContaining({ bookingId: 'bk-1', reminder: 'J-1', daysBefore: '1' }),
    }));
  });

  it('notifie le client de chaque réservation confirmée commençant demain', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([booking('bk-1', 'c1'), booking('bk-2', 'c2')]);
    const res = await runStayReminders();

    expect(res).toEqual({ sent: 2, skipped: 0 });
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'stay_reminder', recipientId: 'c1',
      data: expect.objectContaining({ bookingId: 'bk-1', propertyTitle: 'Villa Cocody' }),
    }));
    // Sélection : status confirmed + fenêtre [demain, après-demain)
    const where = mockPrisma.booking.findMany.mock.calls[1][0].where;
    expect(where.status).toBe('confirmed');
    expect(where.startDate.gte).toBeInstanceOf(Date);
    expect(where.startDate.lt.getTime() - where.startDate.gte.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('idempotent : un rappel déjà émis pour la réservation est sauté', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([booking('bk-1', 'c1')]);
    mockPrisma.notification.findFirst.mockResolvedValue({ id: 'notif-existante' });
    const res = await runStayReminders();

    expect(res).toEqual({ sent: 0, skipped: 1 });
    expect(notificationsService.notify).not.toHaveBeenCalled();
    // La garde cherche bien une notification stay_reminder portant ce bookingId
    expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ type: 'stay_reminder', data: { path: ['bookingId'], equals: 'bk-1' } }),
    }));
  });
});
