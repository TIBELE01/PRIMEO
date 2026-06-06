// Geoapify geocoding client — resolves addresses to coordinates for Côte d'Ivoire properties
import axios from 'axios';
import { geoapifyConfig } from '../../config/geoapify.config';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface GeocodingResult {
  coordinates: Coordinates;
  formattedAddress: string;
  city?: string;
  country?: string;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!geoapifyConfig.apiKey) return null;

  const response = await axios.get(geoapifyConfig.geocodingUrl, {
    params: {
      text: address,
      filter: `countrycode:${geoapifyConfig.defaultCountryCode}`,
      apiKey: geoapifyConfig.apiKey,
      limit: 1,
    },
  });

  const feature = response.data.features?.[0];
  if (!feature) return null;

  const { lat, lon } = feature.properties;
  return {
    coordinates: { lat, lon },
    formattedAddress: feature.properties.formatted,
    city: feature.properties.city,
    country: feature.properties.country,
  };
}

export interface AutocompleteResult {
  label: string;
  city?: string;
  lat: number;
  lon: number;
}

export async function autocompleteAddress(text: string): Promise<AutocompleteResult[]> {
  if (!geoapifyConfig.apiKey || !text || text.length < 3) return [];

  try {
    const response = await axios.get(`${geoapifyConfig.baseUrl}/geocode/autocomplete`, {
      params: {
        text,
        filter: `countrycode:${geoapifyConfig.defaultCountryCode}`,
        apiKey: geoapifyConfig.apiKey,
        limit: 5,
        format: 'json',
      },
      timeout: 3000,
    });

    return ((response.data.results as Record<string, unknown>[]) ?? []).map((r) => ({
      label: (r['formatted'] as string) ?? '',
      city: r['city'] as string | undefined,
      lat: r['lat'] as number,
      lon: r['lon'] as number,
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
  if (!geoapifyConfig.apiKey) return null;

  const response = await axios.get(geoapifyConfig.reverseGeocodingUrl, {
    params: { lat, lon, apiKey: geoapifyConfig.apiKey },
  });

  const feature = response.data.features?.[0];
  if (!feature) return null;

  return {
    coordinates: { lat, lon },
    formattedAddress: feature.properties.formatted,
    city: feature.properties.city,
    country: feature.properties.country,
  };
}
