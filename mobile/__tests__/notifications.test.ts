// Unit tests for push notification helpers
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

jest.mock('../src/services/api/client', () => ({
  apiClient: {
    post: jest.fn(async () => ({ data: {} })),
  },
}));

import { registerForPushNotifications, sendTokenToBackend } from '../src/services/notifications/onesignal';
import { apiClient } from '../src/services/api/client';

const mockPost = apiClient.post as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  // Default: iOS platform with permissions granted
  (Platform as { OS: string }).OS = 'ios';
});

// ── registerForPushNotifications ──────────────────────────────────────────────

describe('registerForPushNotifications', () => {
  it('returns null on web platform', async () => {
    (Platform as { OS: string }).OS = 'web';
    const result = await registerForPushNotifications();
    expect(result).toBeNull();
  });

  it('returns the Expo push token when permission is already granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({
      data: 'ExponentPushToken[abc123]',
    });

    const token = await registerForPushNotifications();
    expect(token).toBe('ExponentPushToken[abc123]');
  });

  it('requests permissions when not already granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({
      data: 'ExponentPushToken[xyz]',
    });

    const token = await registerForPushNotifications();
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(token).toBe('ExponentPushToken[xyz]');
  });

  it('returns null when permission is denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });

    const result = await registerForPushNotifications();
    expect(result).toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('passes projectId from Constants when available', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({
      data: 'ExponentPushToken[proj]',
    });

    await registerForPushNotifications();
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project-id' });
  });
});

// ── sendTokenToBackend ────────────────────────────────────────────────────────

describe('sendTokenToBackend', () => {
  it('posts token to /notifications/push-token', async () => {
    (Platform as { OS: string }).OS = 'ios';
    await sendTokenToBackend('ExponentPushToken[token-1]');
    expect(mockPost).toHaveBeenCalledWith('/notifications/push-token', {
      token: 'ExponentPushToken[token-1]',
      platform: 'ios',
    });
  });

  it('sends platform=android on Android', async () => {
    (Platform as { OS: string }).OS = 'android';
    await sendTokenToBackend('ExponentPushToken[token-2]');
    expect(mockPost).toHaveBeenCalledWith('/notifications/push-token', {
      token: 'ExponentPushToken[token-2]',
      platform: 'android',
    });
  });
});
