// Calendar service — monthly availability view for a property
import { prisma } from '../../../database/prisma.service';

export const calendarService = {
  async getCalendar(propertyId: string, year: number, month: number) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    return prisma.availability.findMany({
      where: { propertyId, date: { gte: firstDay, lte: lastDay } },
      orderBy: { date: 'asc' },
    });
  },
};
