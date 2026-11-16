// Wallet API — portefeuille virtuel du professionnel
import { apiClient } from '../client';

export const walletApi = {
  getMyWallet: () => apiClient.get('/wallet/me'),
  getPayoutAccount: () => apiClient.get('/wallet/payout-account'),
  savePayoutAccount: (data: { method: string; holderName: string; accountNumber: string; bankName?: string }) =>
    apiClient.put('/wallet/payout-account', data),
  listWithdrawals: () => apiClient.get('/wallet/withdrawals'),
  requestWithdrawal: (amount?: number) => apiClient.post('/wallet/withdrawals', amount ? { amount } : {}),
  cancelWithdrawal: (id: string) => apiClient.post(`/wallet/withdrawals/${id}/cancel`),
};
