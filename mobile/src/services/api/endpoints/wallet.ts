// Wallet API — portefeuille virtuel du professionnel
import { apiClient } from '../client';

export const walletApi = {
  getMyWallet: () => apiClient.get('/wallet/me'),
};
