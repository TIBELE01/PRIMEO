// Push notification setup — uses expo-notifications to get a device token,
// registers it with the backend (which in turn registers it with OneSignal),
// and wires up foreground + tap listeners.
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Le placeholder (UUID 00000000-…) n'est pas un vrai projet EAS : on l'ignore
  // pour ne pas faire échouer getExpoPushTokenAsync tant que le vrai
  // EAS_PROJECT_ID n'est pas renseigné.
  const raw = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const projectId = raw && !raw.startsWith('00000000') ? raw : undefined;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return tokenData.data;
  } catch (err) {
    // Projet EAS absent/invalide ou service push indisponible — l'app continue sans push.
    console.warn('[push] Enregistrement du token impossible :', (err as Error)?.message);
    return null;
  }
}

export async function sendTokenToBackend(token: string): Promise<void> {
  await apiClient.post('/notifications/push-token', {
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
}

export function addNotificationReceivedListener(
  callback: (n: Notifications.Notification) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (r: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export const notificationsService = {
  registerForPushNotifications,
  sendTokenToBackend,
  addNotificationReceivedListener,
  addNotificationResponseListener,
};
