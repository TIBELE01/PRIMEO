// Professional service — KYC workflow and TOTP management
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { generateTotpSecret, generateTotpUri, generateQrCode, verifyTotp } from '../../common/utils/totp';
import { SubmitKycInput } from './dto/professional.dto';

export const professionalService = {
  async getProfile(userId: string) {
    const profile = await prisma.professionalProfile.findUnique({ where: { userId } });
    if (!profile) throw new HttpError(404, 'Professional profile not found');
    return profile;
  },

  async submitKyc(userId: string, input: SubmitKycInput) {
    // TODO: upload KYC document to Cloudinary, update profile
    throw new Error('Not implemented');
  },

  async getKycStatus(userId: string) {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
      select: { verificationStatus: true, verifiedAt: true },
    });
    if (!profile) throw new HttpError(404, 'Profile not found');
    return profile;
  },

  async setupTotp(userId: string) {
    const secret = generateTotpSecret();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'User not found');

    // Store secret temporarily (not enabled until confirmed)
    await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

    const uri = generateTotpUri(secret, user.email);
    const qrCode = await generateQrCode(uri);
    return { secret, qrCode };
  },

  async confirmTotp(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new HttpError(400, 'TOTP setup not started');

    const isValid = verifyTotp(user.twoFactorSecret, token);
    if (!isValid) throw new HttpError(400, 'Invalid TOTP token');

    await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
  },

  async disableTotp(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
  },
};
