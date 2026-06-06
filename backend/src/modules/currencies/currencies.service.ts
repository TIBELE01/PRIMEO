// Currencies service — indicative exchange rates for mobile display
import { fetchExchangeRates } from '../../common/utils/currency';
import { HttpError } from '../../common/handlers/http-error.handler';

const DISCLAIMER =
  'Taux indicatifs uniquement. Toutes les transactions Primeo sont effectuées en FCFA (XOF). ' +
  'Ces taux ne sont pas utilisés pour des calculs de paiement.';

export const currenciesService = {
  /**
   * Returns current XOF→EUR and XOF→USD rates with last-update timestamp.
   * Mobile app calls this on startup for indicative price display.
   */
  async getRates() {
    const rates = await fetchExchangeRates();
    if (!rates) throw new HttpError(503, 'Service de taux de change temporairement indisponible');

    const { source: _source, ...payload } = rates;
    return {
      ...payload,
      disclaimer: DISCLAIMER,
    };
  },
};
