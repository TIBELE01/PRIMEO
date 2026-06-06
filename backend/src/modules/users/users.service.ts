// Users service — profile operations
import { prisma } from '../../database/prisma.service';
import { userRepository } from '../../database/repositories/user.repository';
import { HttpError } from '../../common/handlers/http-error.handler';
import { hashPassword, comparePassword } from '../../common/utils/bcrypt';
import { generateTotpSecret, generateTotpUri, generateQrCode, verifyTotp } from '../../common/utils/totp';
import { UpdateProfileInput, ChangePasswordInput } from './dto/users.dto';

export const usersService = {
  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new HttpError(404, 'User not found');
    const { passwordHash, twoFactorSecret, ...safe } = user;
    return safe;
  },

  async update(id: string, input: UpdateProfileInput) {
    const user = await userRepository.update(id, input);
    const { passwordHash, twoFactorSecret, ...safe } = user;
    return safe;
  },

  async changePassword(id: string, input: ChangePasswordInput) {
    const user = await userRepository.findById(id);
    if (!user) throw new HttpError(404, 'User not found');
    const valid = await comparePassword(input.currentPassword, user.passwordHash);
    if (!valid) throw new HttpError(400, 'Mot de passe actuel incorrect');
    const passwordHash = await hashPassword(input.newPassword);
    await userRepository.update(id, { passwordHash });
  },

  async delete(id: string) {
    // TODO: soft-delete or anonymize user data
    throw new Error('Not implemented');
  },

  // ── 2FA (TOTP) ─────────────────────────────────────────────────────────────

  async setup2fa(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    const secret = generateTotpSecret();
    // Persist the secret (not yet enabled — confirmed only after verifying the first code)
    await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

    const uri = generateTotpUri(secret, user.email);
    const qrCode = await generateQrCode(uri);
    return { secret, qrCode };
  },

  async confirm2fa(userId: string, token: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new HttpError(400, 'Configuration 2FA non initialisée. Appelez d\'abord /2fa/setup.');

    const isValid = verifyTotp(user.twoFactorSecret, token);
    if (!isValid) throw new HttpError(400, 'Code TOTP incorrect ou expiré');

    await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
  },

  async disable2fa(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    if (!user.twoFactorEnabled) throw new HttpError(400, 'Le 2FA n\'est pas activé sur ce compte');

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
  },
};
