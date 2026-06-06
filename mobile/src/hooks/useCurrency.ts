import { useCallback } from 'react';
import { useCurrencyStore } from '../store/currencyStore';

const SYMBOL: Record<string, string> = { FCFA: 'FCFA', EUR: '€', USD: '$' };
const LOCALE: Record<string, string> = { FCFA: 'fr-CI', EUR: 'fr-FR', USD: 'en-US' };

export function useCurrency() {
  const { selectedCurrency, rates, lastUpdated } = useCurrencyStore();

  const convert = useCallback(
    (amountFcfa: number): number => {
      if (selectedCurrency === 'FCFA') return amountFcfa;
      const rate = rates[selectedCurrency];
      return rate ? Math.round(amountFcfa * rate * 100) / 100 : amountFcfa;
    },
    [selectedCurrency, rates],
  );

  const formatPrice = useCallback(
    (amountFcfa: number): string => {
      const value = convert(amountFcfa);
      if (selectedCurrency === 'FCFA') {
        return value.toLocaleString('fr-CI') + ' FCFA';
      }
      return (
        value.toLocaleString(LOCALE[selectedCurrency] ?? 'fr-FR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }) +
        ' ' +
        (SYMBOL[selectedCurrency] ?? selectedCurrency)
      );
    },
    [convert, selectedCurrency],
  );

  const isIndicative = selectedCurrency !== 'FCFA';

  const rateDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('fr-CI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return { selectedCurrency, formatPrice, convert, isIndicative, rateDate };
}
