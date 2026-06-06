// Refund service — handles Genius Pay refund requests
import axios from 'axios';
import { geniusPayConfig } from '../../../config/genius-pay.config';
import { prisma } from '../../../database/prisma.service';
import { HttpError } from '../../../common/handlers/http-error.handler';
import { logger } from '../../../common/utils/logger';

export const refundService = {
  async initiateRefund(transactionId: string, amount: number): Promise<void> {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.status !== 'success') throw new HttpError(400, 'Transaction not eligible for refund');
    if (!tx.geniusPayTransactionId) throw new HttpError(400, 'No payment reference found');

    await axios.post(
      `${geniusPayConfig.baseUrl}/payments/${tx.geniusPayTransactionId}/refund`,
      { amount },
      { headers: { Authorization: `Bearer ${geniusPayConfig.apiKey}` } }
    );

    await prisma.transaction.update({ where: { id: transactionId }, data: { status: 'refunded' } });
    logger.info(`Refund initiated: transaction=${transactionId}, amount=${amount} XOF`);
  },
};
