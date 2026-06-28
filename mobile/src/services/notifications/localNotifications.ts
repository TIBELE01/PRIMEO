// localNotifications: schedule and cancel local notifications via expo-notifications
// ⚠️ expo-notifications n'est pas supporté sur web → no-op si Platform.OS === 'web'.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const isWeb = Platform.OS === 'web';

export const localNotifications = {
  scheduleReminder: async (title: string, body: string, triggerDate: Date): Promise<string> => {
    if (isWeb) return '';
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  },

  cancelNotification: async (id: string): Promise<void> => {
    if (isWeb) return;
    await Notifications.cancelScheduledNotificationAsync(id);
  },

  cancelAll: async (): Promise<void> => {
    if (isWeb) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  sendImmediate: async (title: string, body: string): Promise<void> => {
    if (isWeb) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  },
};
