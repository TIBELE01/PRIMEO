// notificationStore: Zustand store for in-app notification badge counts
import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  increment: () => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>(set => ({
  unreadCount: 0,
  setUnreadCount: count => set({ unreadCount: count }),
  increment: () => set(s => ({ unreadCount: s.unreadCount + 1 })),
  reset: () => set({ unreadCount: 0 }),
}));
