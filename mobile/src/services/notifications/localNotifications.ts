// localNotifications: schedule and cancel local notifications via expo-notifications
import * as Notifications from 'expo-notifications';

export const localNotifications = {
  scheduleReminder: async (title: string, body: string, triggerDate: Date): Promise<string> => {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  },

  cancelNotification: async (id: string): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(id);
  },

  cancelAll: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  sendImmediate: async (title: string, body: string): Promise<void> => {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  },
};
