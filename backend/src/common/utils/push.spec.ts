import axios from 'axios';
import { computeHmacSha256 } from './webhook-verifier';
import {
  sendViaOneSignal,
  sendViaExpoPush,
  sendPushNotification,
  PushPayload,
} from './push';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('axios');
jest.mock('./logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn() } }));
jest.mock('../../config/onesignal.config', () => ({
  onesignalConfig: { appId: 'test-app-id', apiKey: 'test-api-key', baseUrl: 'https://onesignal.com/api/v1' },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

const payload: PushPayload = {
  headings: { en: 'Hello', fr: 'Bonjour' },
  contents: { en: 'World', fr: 'Monde' },
};

// ── sendViaOneSignal ──────────────────────────────────────────────────────────

describe('sendViaOneSignal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty invalidIds on success', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { recipients: 2, errors: {} } });
    const result = await sendViaOneSignal(['pid1', 'pid2'], payload);
    expect(result.invalidIds).toEqual([]);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('extracts invalid_player_ids from error response', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { recipients: 1, errors: { invalid_player_ids: ['pid-bad'] } },
    });
    const result = await sendViaOneSignal(['pid-good', 'pid-bad'], payload);
    expect(result.invalidIds).toEqual(['pid-bad']);
  });

  it('returns empty array when playerIds list is empty', async () => {
    const result = await sendViaOneSignal([], payload);
    expect(result.invalidIds).toEqual([]);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('does not throw when request fails; returns empty invalidIds', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('network error'));
    mockedAxios.isAxiosError.mockReturnValueOnce(false);
    const result = await sendViaOneSignal(['pid1'], payload);
    expect(result.invalidIds).toEqual([]);
  });

  it('sends high-priority as 10', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { recipients: 1 } });
    await sendViaOneSignal(['p1'], { ...payload, priority: 'high' });
    const body = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;
    expect(body.priority).toBe(10);
  });

  it('sends normal-priority as 5', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { recipients: 1 } });
    await sendViaOneSignal(['p1'], { ...payload, priority: 'normal' });
    const body = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;
    expect(body.priority).toBe(5);
  });
});

// ── sendViaExpoPush ───────────────────────────────────────────────────────────

describe('sendViaExpoPush', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty badTokens on success', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { data: [{ status: 'ok' }] } });
    const result = await sendViaExpoPush(['ExponentPushToken[token1]'], 'Title', 'Body');
    expect(result.badTokens).toEqual([]);
  });

  it('collects DeviceNotRegistered tokens', async () => {
    const tokens = ['ExponentPushToken[a]', 'ExponentPushToken[b]'];
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: [
          { status: 'ok' },
          { status: 'error', details: { error: 'DeviceNotRegistered' } },
        ],
      },
    });
    const result = await sendViaExpoPush(tokens, 'Title', 'Body');
    expect(result.badTokens).toEqual(['ExponentPushToken[b]']);
  });

  it('collects DeviceNotRegistered from message string too', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: [{ status: 'error', message: 'DeviceNotRegistered — unsubscribed' }],
      },
    });
    const result = await sendViaExpoPush(['ExponentPushToken[c]'], 'T', 'B');
    expect(result.badTokens).toEqual(['ExponentPushToken[c]']);
  });

  it('returns empty array when tokens list is empty', async () => {
    const result = await sendViaExpoPush([], 'T', 'B');
    expect(result.badTokens).toEqual([]);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('does not throw on network error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('timeout'));
    mockedAxios.isAxiosError.mockReturnValueOnce(false);
    const result = await sendViaExpoPush(['ExponentPushToken[x]'], 'T', 'B');
    expect(result.badTokens).toEqual([]);
  });
});

// ── sendPushNotification (backward-compat) ────────────────────────────────────

describe('sendPushNotification', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls OneSignal with player ids', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { recipients: 1 } });
    await sendPushNotification({
      playerIds: ['pid1'],
      headings: { en: 'H', fr: 'H' },
      contents: { en: 'C', fr: 'C' },
      priority: 10,
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('falls back to externalUserIds when no playerIds', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { recipients: 1 } });
    await sendPushNotification({
      externalUserIds: ['uid1'],
      headings: { en: 'H', fr: 'H' },
      contents: { en: 'C', fr: 'C' },
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('does nothing when ids are empty', async () => {
    await sendPushNotification({ headings: { en: 'H', fr: 'H' }, contents: { en: 'C', fr: 'C' } });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
