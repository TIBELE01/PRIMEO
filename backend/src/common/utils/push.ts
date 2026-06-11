// Push notification delivery — supports OneSignal (player_ids) and Expo Push API.
// Strategy: if device has a OneSignal player_id → use OneSignal REST API.
//           otherwise → send directly via Expo Push API.
// Both paths report invalid / unregistered tokens so callers can clean up the DB.
import axios from 'axios';
import { onesignalConfig } from '../../config/onesignal.config';
import { logger } from './logger';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PushPayload {
  headings: { en: string; fr: string };
  contents: { en: string; fr: string };
  data?: Record<string, unknown>;
  priority?: 'high' | 'normal';
}

// ── OneSignal ─────────────────────────────────────────────────────────────────

// Register an Expo push token with OneSignal (device_type 0=iOS, 1=Android).
// Returns the OneSignal player_id on success, null if not configured or on error.
export async function registerExpoTokenWithOneSignal(
  expoToken: string,
  externalUserId: string,
  platform: string | null | undefined,
): Promise<string | null> {
  if (!onesignalConfig.appId || !onesignalConfig.apiKey) return null;

  const deviceType = platform === 'ios' ? 0 : 1;

  try {
    const resp = await axios.post<{ id?: string }>(
      `${onesignalConfig.baseUrl}/players`,
      {
        app_id: onesignalConfig.appId,
        device_type: deviceType,
        identifier: expoToken,
        external_user_id: externalUserId,
        notification_types: 1,
      },
      {
        headers: {
          Authorization: `Basic ${onesignalConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );
    const playerId = resp.data?.id;
    if (playerId) {
      logger.debug(`Expo token registered with OneSignal — player_id=${playerId}`);
      return playerId;
    }
    return null;
  } catch (err: unknown) {
    const msg = axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
    logger.warn(`OneSignal device registration failed: ${msg}`);
    return null;
  }
}

// Send via OneSignal REST API using player_ids.
// Returns the list of invalid player_ids reported by OneSignal so callers can deactivate them.
export async function sendViaOneSignal(
  playerIds: string[],
  payload: PushPayload,
): Promise<{ invalidIds: string[] }> {
  const invalidIds: string[] = [];
  if (!playerIds.length || !onesignalConfig.appId || !onesignalConfig.apiKey) {
    if (!onesignalConfig.appId) logger.warn('OneSignal not configured — push skipped');
    return { invalidIds };
  }

  try {
    const resp = await axios.post<{ recipients?: number; errors?: { invalid_player_ids?: string[] } }>(
      `${onesignalConfig.baseUrl}/notifications`,
      {
        app_id: onesignalConfig.appId,
        include_player_ids: playerIds,
        headings: payload.headings,
        contents: payload.contents,
        data: payload.data ?? {},
        priority: payload.priority === 'high' ? 10 : 5,
        android_channel_id: payload.priority === 'high' ? 'high_priority' : 'default',
      },
      {
        headers: {
          Authorization: `Basic ${onesignalConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );
    const bad = resp.data?.errors?.invalid_player_ids ?? [];
    invalidIds.push(...bad);
    logger.debug(`OneSignal push sent — recipients=${resp.data?.recipients ?? '?'} invalid=${bad.length}`);
  } catch (err: unknown) {
    const msg = axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
    logger.warn(`OneSignal push failed: ${msg}`);
  }

  return { invalidIds };
}

// Diffusion à TOUS les appareils abonnés (segment OneSignal par défaut) —
// utilisée pour les annonces plateforme (ex : maintenance planifiée).
export async function sendPushBroadcast(payload: PushPayload): Promise<boolean> {
  if (!onesignalConfig.appId || !onesignalConfig.apiKey) {
    logger.warn('OneSignal not configured — broadcast skipped');
    return false;
  }
  try {
    const resp = await axios.post<{ recipients?: number }>(
      `${onesignalConfig.baseUrl}/notifications`,
      {
        app_id: onesignalConfig.appId,
        included_segments: ['Subscribed Users'],
        headings: payload.headings,
        contents: payload.contents,
        data: payload.data ?? {},
        priority: 10,
        android_channel_id: 'high_priority',
      },
      {
        headers: {
          Authorization: `Basic ${onesignalConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );
    logger.info(`OneSignal broadcast sent — recipients=${resp.data?.recipients ?? '?'}`);
    return true;
  } catch (err: unknown) {
    const msg = axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
    logger.warn(`OneSignal broadcast failed: ${msg}`);
    return false;
  }
}

// ── Backward-compat wrapper ───────────────────────────────────────────────────

// Legacy callers (food-orders, webhooks) use this signature. New code should call
// sendViaOneSignal / sendViaExpoPush directly via pushProvider.
export async function sendPushNotification(payload: {
  playerIds?: string[];
  externalUserIds?: string[];
  headings: { en: string; fr: string };
  contents: { en: string; fr: string };
  data?: Record<string, unknown>;
  priority?: number; // 10 = high, 5 = normal
}): Promise<void> {
  const ids = payload.playerIds ?? payload.externalUserIds ?? [];
  if (!ids.length) return;
  await sendViaOneSignal(ids, {
    headings: payload.headings,
    contents: payload.contents,
    data: payload.data,
    priority: payload.priority === 10 ? 'high' : 'normal',
  });
}

// ── Expo Push API ─────────────────────────────────────────────────────────────

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  priority?: string;
  channelId?: string;
}

interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

// Send via Expo's push gateway. Returns tokens that are no longer registered.
export async function sendViaExpoPush(
  expoTokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  priority: 'high' | 'normal' = 'high',
): Promise<{ badTokens: string[] }> {
  const badTokens: string[] = [];
  if (!expoTokens.length) return { badTokens };

  const messages: ExpoPushMessage[] = expoTokens.map((to) => ({
    to,
    title,
    body,
    data: data ?? {},
    sound: 'default',
    priority: priority === 'high' ? 'high' : 'default',
    channelId: priority === 'high' ? 'high_priority' : 'default',
  }));

  try {
    const resp = await axios.post<{ data: ExpoPushReceipt[] }>(EXPO_PUSH_URL, messages, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
    const results = resp.data?.data ?? [];
    results.forEach((r, i) => {
      if (
        r.status === 'error' &&
        (r.details?.error === 'DeviceNotRegistered' || r.message?.includes('DeviceNotRegistered'))
      ) {
        const token = expoTokens[i];
        if (token) badTokens.push(token);
      }
    });
    logger.debug(`Expo push sent — count=${messages.length} bad=${badTokens.length}`);
  } catch (err: unknown) {
    const msg = axios.isAxiosError(err) ? err.message : String(err);
    logger.warn(`Expo push failed: ${msg}`);
  }

  return { badTokens };
}
