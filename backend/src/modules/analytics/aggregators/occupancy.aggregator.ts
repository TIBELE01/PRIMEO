// Occupancy aggregator — booking occupancy rate for a property over a date range
import { prisma } from '../../../database/prisma.service';

export const occupancyAggregator = {
  async computeForProperty(propertyId: string, from: Date, to: Date): Promise<number> {
    const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) return 0;

    const bookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: ['confirmed', 'completed'] },
        startDate: { lte: to },
        endDate: { gte: from },
      },
    });

    const bookedDays = bookings.reduce((sum, b) => {
      const start = b.startDate > from ? b.startDate : from;
      const end = b.endDate < to ? b.endDate : to;
      return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);

    return Math.min(100, Math.round((bookedDays / totalDays) * 100));
  },
};
