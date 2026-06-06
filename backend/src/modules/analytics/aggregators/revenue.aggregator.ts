// Revenue aggregator — computes platform revenue for a given period
import { prisma } from '../../../database/prisma.service';

export const revenueAggregator = {
  async computePeriod(from: Date, to: Date) {
    const result = await prisma.transaction.aggregate({
      where: { status: 'success', completedAt: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    });
    return {
      totalRevenue: result._sum?.amount ?? 0,
      transactionCount: result._count,
    };
  },
};
