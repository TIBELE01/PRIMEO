// Unit tests for pushProvider.sendToUser
import { pushProvider } from './push.provider';
import { sendViaOneSignal, sendViaExpoPush } from '../../../common/utils/push';
import { NotificationType } from '../notifications.types';

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));
jest.mock('../../../common/utils/push', () => ({
  sendViaOneSignal: jest.fn(async () => ({ invalidIds: [] })),
  sendViaExpoPush:  jest.fn(async () => ({ badTokens: [] })),
}));

jest.mock('../../../database/prisma.service', () => ({
  prisma: {
    pushToken: {
      findMany:   jest.fn(),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
  },
}));

import { prisma } from '../../../database/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as unknown as { pushToken: { findMany: jest.Mock; updateMany: jest.Mock } };

const mockedOneSignal = sendViaOneSignal as jest.Mock;
const mockedExpo      = sendViaExpoPush  as jest.Mock;

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tok-1',
    userId: 'user-1',
    token: 'ExponentPushToken[test]',
    playerId: null,
    platform: 'ios',
    isActive: true,
    ...overrides,
  };
}

const args: [string, NotificationType, string, string, Record<string, unknown>, 'high' | 'normal'] = [
  'user-1',
  'booking_confirmed',
  'Réservation confirmée',
  'Votre réservation est confirmée.',
  {},
  'high',
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('pushProvider.sendToUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.pushToken.updateMany.mockResolvedValue({ count: 0 });
  });

  it('does nothing when the user has no active tokens', async () => {
    mockPrisma.pushToken.findMany.mockResolvedValueOnce([]);
    await pushProvider.sendToUser(...args);
    expect(mockedOneSignal).not.toHaveBeenCalled();
    expect(mockedExpo).not.toHaveBeenCalled();
  });

  it('routes to Expo push for tokens without a player_id', async () => {
    mockPrisma.pushToken.findMany.mockResolvedValueOnce([makeToken()]);
    await pushProvider.sendToUser(...args);
    expect(mockedExpo).toHaveBeenCalledTimes(1);
    expect(mockedOneSignal).not.toHaveBeenCalled();
  });

  it('routes to OneSignal for tokens that have a player_id', async () => {
    mockPrisma.pushToken.findMany.mockResolvedValueOnce([makeToken({ playerId: 'player-id-1' })]);
    await pushProvider.sendToUser(...args);
    expect(mockedOneSignal).toHaveBeenCalledTimes(1);
    expect(mockedExpo).not.toHaveBeenCalled();
  });

  it('uses both paths when there are mixed tokens', async () => {
    mockPrisma.pushToken.findMany.mockResolvedValueOnce([
      makeToken({ id: 'tok-onesignal', playerId: 'player-id-2' }),
      makeToken({ id: 'tok-expo',      playerId: null }),
    ]);
    await pushProvider.sendToUser(...args);
    expect(mockedOneSignal).toHaveBeenCalledTimes(1);
    expect(mockedExpo).toHaveBeenCalledTimes(1);
  });

  it('deactivates invalid OneSignal tokens', async () => {
    mockPrisma.pushToken.findMany.mockResolvedValueOnce([makeToken({ playerId: 'bad-player' })]);
    mockedOneSignal.mockResolvedValueOnce({ invalidIds: ['bad-player'] });

    await pushProvider.sendToUser(...args);

    expect(mockPrisma.pushToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });

  it('deactivates invalid Expo tokens (DeviceNotRegistered)', async () => {
    const badToken = 'ExponentPushToken[bad]';
    mockPrisma.pushToken.findMany.mockResolvedValueOnce([makeToken({ token: badToken })]);
    mockedExpo.mockResolvedValueOnce({ badTokens: [badToken] });

    await pushProvider.sendToUser(...args);

    expect(mockPrisma.pushToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });

  it('forwards the notification type in the data payload', async () => {
    mockPrisma.pushToken.findMany.mockResolvedValueOnce([makeToken()]);
    await pushProvider.sendToUser(...args);

    const [, title, body, data] = mockedExpo.mock.calls[0]!;
    expect(title).toBe('Réservation confirmée');
    expect(body).toBe('Votre réservation est confirmée.');
    expect(data).toMatchObject({ type: 'booking_confirmed' });
  });
});
