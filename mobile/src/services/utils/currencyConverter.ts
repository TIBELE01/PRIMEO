// currencyConverter: converts amounts between XOF and other currencies
import { useCurrencyStore } from '../../store/currencyStore';

export const currencyConverter = {
  convert: (amount: number, fromCurrency: string, toCurrency: string, rates: Record<string, number>): number => {
    if (fromCurrency === toCurrency) return amount;
    // All rates are relative to XOF
    const amountInXOF = fromCurrency === 'XOF' ? amount : amount / (rates[fromCurrency] ?? 1);
    return toCurrency === 'XOF' ? amountInXOF : amountInXOF * (rates[toCurrency] ?? 1);
  },

  format: (amount: number, currency: string): string => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  },
};
