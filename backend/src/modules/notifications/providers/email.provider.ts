// Email notification provider — wraps the Brevo mailer utility
import { sendTemplateEmail } from '../../../common/utils/mailer';
import { brevoConfig } from '../../../config/brevo.config';
import { logger } from '../../../common/utils/logger';

export const emailProvider = {
  async sendBookingConfirmation(to: string, name: string, data: Record<string, unknown>): Promise<void> {
    await sendTemplateEmail([{ email: to, name }], brevoConfig.templates.bookingConfirmation, data);
    logger.debug(`Booking confirmation email sent to ${to}`);
  },

  async sendKycApproved(to: string, name: string): Promise<void> {
    await sendTemplateEmail([{ email: to, name }], brevoConfig.templates.kycApproved, { name });
  },

  async sendKycRejected(to: string, name: string, reason: string): Promise<void> {
    await sendTemplateEmail([{ email: to, name }], brevoConfig.templates.kycRejected, { name, reason });
  },

  async sendPaymentReceipt(to: string, name: string, data: Record<string, unknown>): Promise<void> {
    await sendTemplateEmail([{ email: to, name }], brevoConfig.templates.paymentReceipt, data);
  },
};
