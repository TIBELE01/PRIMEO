// App configuration — API URL, app metadata, supported currencies
import Constants from 'expo-constants';

export const APP_NAME = 'PRIMEO';
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export const API_URL: string =
  Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';

export const SOCKET_URL: string =
  Constants.expoConfig?.extra?.socketUrl ?? API_URL;

export const SUPPORTED_CURRENCIES = [
  { code: 'XOF', name: 'Franc CFA (UEMOA)', symbol: 'CFA' },
  { code: 'EUR', name: 'Euro',               symbol: '€'   },
  { code: 'USD', name: 'Dollar américain',   symbol: '$'   },
  { code: 'GBP', name: 'Livre sterling',     symbol: '£'   },
  { code: 'CAD', name: 'Dollar canadien',    symbol: 'CA$' },
  { code: 'CHF', name: 'Franc suisse',       symbol: 'CHF' },
  { code: 'MAD', name: 'Dirham marocain',    symbol: 'MAD' },
  { code: 'GHS', name: 'Cedi ghanéen',       symbol: 'GH₵' },
  { code: 'NGN', name: 'Naira nigérian',     symbol: '₦'   },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];

export const DEFAULT_CURRENCY: CurrencyCode = 'XOF';

export const PAGINATION_LIMIT = 20;

export const MAX_IMAGES_PER_PROPERTY = 10;

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SECONDS = 300; // 5 minutes

export const BOOKING_MIN_NIGHTS = 1;
export const BOOKING_MAX_NIGHTS = 90;
