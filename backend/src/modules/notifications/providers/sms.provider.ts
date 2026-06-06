// SMS notification provider — wraps the Orange SMS client
import { sendSms } from '../../../common/utils/sms';
import { logger } from '../../../common/utils/logger';

export const smsProvider = {
  async sendOtp(phone: string, otp: string): Promise<void> {
    const message = `Votre code de vérification Primeo : ${otp}. Valable 5 minutes. Ne le partagez pas.`;
    await sendSms(phone, message);
    logger.debug(`OTP SMS sent to ${phone}`);
  },

  async sendBookingAlert(phone: string, propertyName: string, checkIn: string): Promise<void> {
    const message = `PRIMEO: Nouvelle réservation pour ${propertyName} le ${checkIn}. Connectez-vous pour confirmer.`;
    await sendSms(phone, message);
  },
};
