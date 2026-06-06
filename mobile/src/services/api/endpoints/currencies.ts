// Currencies API endpoints
import { apiClient } from '../client';

export const currenciesApi = {
  getRates: () => apiClient.get('/currencies/rates'),
  convert: (amountXof: number, targetCurrency: string) =>
    apiClient.post('/currencies/convert', { amountXof, targetCurrency }),
};
