// OneSignal push notification configuration
import { env } from './env.config';

export const onesignalConfig = {
  appId: env.ONESIGNAL_APP_ID,
  apiKey: env.ONESIGNAL_REST_API_KEY,
  baseUrl: 'https://onesignal.com/api/v1',
} as const;
