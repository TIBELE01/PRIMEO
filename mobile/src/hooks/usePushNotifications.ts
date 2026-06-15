// usePushNotifications — registers for push on login, wires up notification listeners.
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationsService } from '../services/notifications/onesignal';
import { useAuthStore } from '../store/authStore';
import { navigateFromNotification } from '../navigation/navigationRef';

export const usePushNotifications = (): void => {
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const receivedSub = useRef<Notifications.EventSubscription | null>(null);
  const responseSub = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Register device token and send to backend
    notificationsService
      .registerForPushNotifications()
      .then((token) => {
        if (token) return notificationsService.sendTokenToBackend(token);
      })
      .catch((err) => console.warn('[PushNotifications] registration failed:', err));

    // Foreground notification listener
    receivedSub.current = notificationsService.addNotificationReceivedListener((notification) => {
      const title = notification.request.content.title ?? '';
      const body  = notification.request.content.body  ?? '';
      console.log(`[PushNotifications] received: ${title} — ${body}`);
    });

    // Tap / interaction listener — deep-link vers l'écran approprié
    responseSub.current = notificationsService.addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      navigateFromNotification(data);
    });

    // Démarrage à froid : l'app a été lancée en touchant une notification
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          const data = response.notification.request.content.data as Record<string, unknown>;
          // Laisser le NavigationContainer se monter avant de naviguer
          setTimeout(() => navigateFromNotification(data), 600);
        }
      })
      .catch(() => { /* ignore */ });

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, [isAuthenticated]);
};
