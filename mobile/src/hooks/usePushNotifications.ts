// usePushNotifications — registers for push on login, wires up notification listeners.
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationsService } from '../services/notifications/onesignal';
import { useAuthStore } from '../store/authStore';

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

    // Tap / interaction listener
    responseSub.current = notificationsService.addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      console.log('[PushNotifications] tapped:', data?.type);
      // Deep-link routing can be added here based on data.type
    });

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, [isAuthenticated]);
};
