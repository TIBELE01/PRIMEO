// cache: AsyncStorage-backed offline data cache for properties and bookings
import AsyncStorage from '@react-native-async-storage/async-storage';

export const cache = {
  set: async <T>(key: string, data: T, ttlMs = 300_000): Promise<void> => {
    const entry = { data, expiresAt: Date.now() + ttlMs };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  },

  get: async <T>(key: string): Promise<T | null> => {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) { await AsyncStorage.removeItem(key); return null; }
    return entry.data as T;
  },

  remove: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },

  clear: async (): Promise<void> => {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
  },
};
