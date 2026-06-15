// Référence de navigation globale — permet de naviguer hors des composants React
// (ex: au tap sur une notification push). Attachée au NavigationContainer (App.tsx).
import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Route l'utilisateur vers l'écran approprié selon les données d'une notification.
 * Tolérant : si la route n'existe pas pour le rôle courant (ex: pro), on n'échoue
 * pas — l'app s'ouvre simplement sur l'écran courant.
 *
 * data attendu : { type, bookingId?, senderName?, propertyTitle? }
 */
export function navigateFromNotification(data: Record<string, unknown> | undefined): void {
  if (!data || !navigationRef.isReady()) return;

  const type = String(data.type ?? '');
  const bookingId = data.bookingId ? String(data.bookingId) : undefined;
  const recipientName = String(data.senderName ?? data.propertyTitle ?? 'Conversation');

  // Types → conversation (messagerie)
  const chatTypes = ['new_message', 'message', 'interest_booking_received', 'interest_submitted', 'property_interest'];
  // Types → détail de réservation
  const bookingTypes = [
    'booking_confirmed', 'new_booking', 'booking_cancelled', 'payment_success',
    'payment_failed', 'stay_reminder', 'review_received', 'review_published', 'review_reply',
  ];

  try {
    if (chatTypes.includes(type) && bookingId) {
      navigationRef.dispatch(
        CommonActions.navigate('Messages', { screen: 'Chat', params: { bookingId, recipientName } }),
      );
    } else if (bookingTypes.includes(type) && bookingId) {
      navigationRef.dispatch(
        CommonActions.navigate('Réservations', { screen: 'BookingDetail', params: { bookingId } }),
      );
    }
    // Autres types : aucune navigation ciblée — l'ouverture de l'app suffit.
  } catch {
    // Route absente pour ce rôle/contexte — on ignore silencieusement.
  }
}
