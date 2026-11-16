// Tests de la clôture automatique : seules les réservations confirmées dont le départ est passé
// sont terminées, et la récompense de parrainage est déclenchée une fois par client.
jest.mock('../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../modules/referrals/referrals.service', () => ({
  referralsService: { triggerReward: jest.fn(async () => undefined) },
}));
const mockPrisma: Record<string, any> = {
  booking: { findMany: jest.fn(), updateMany: jest.fn() },
};
jest.mock('../database/prisma.service', () => ({ prisma: mockPrisma }));

import { runBookingCompletion } from './booking-completion.job';
import { referralsService } from '../modules/referrals/referrals.service';

beforeEach(() => jest.clearAllMocks());

describe('runBookingCompletion', () => {
  it('termine les réservations confirmées dont le départ est antérieur à aujourd\'hui', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([
      { id: 'b1', clientId: 'c1' }, { id: 'b2', clientId: 'c1' }, { id: 'b3', clientId: 'c2' },
    ]);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 3 });

    const res = await runBookingCompletion(new Date('2026-07-10T12:00:00Z'));

    expect(res).toEqual({ completed: 3 });
    const where = mockPrisma.booking.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('confirmed');
    expect(where.endDate.lt).toEqual(new Date('2026-07-10T00:00:00Z'));
    expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['b1', 'b2', 'b3'] }, status: 'confirmed' },
      data: { status: 'completed' },
    });
    expect(referralsService.triggerReward).toHaveBeenCalledTimes(2); // une fois par client
  });

  it('ne fait rien quand aucune réservation n\'est échue', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([]);
    expect(await runBookingCompletion()).toEqual({ completed: 0 });
    expect(mockPrisma.booking.updateMany).not.toHaveBeenCalled();
  });
});
