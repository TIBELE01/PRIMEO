// Geoapify geocoding and maps API configuration
import { env } from './env.config';

export const geoapifyConfig = {
  apiKey: env.GEOAPIFY_API_KEY,
  tileUrl: env.GEOAPIFY_URL,
  baseUrl: 'https://api.geoapify.com/v1',
  geocodingUrl: 'https://api.geoapify.com/v1/geocode/search',
  reverseGeocodingUrl: 'https://api.geoapify.com/v1/geocode/reverse',
  defaultCountryCode: 'ci',
} as const;
