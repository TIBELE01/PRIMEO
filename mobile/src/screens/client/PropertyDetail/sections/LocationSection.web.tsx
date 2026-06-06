import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface Props {
  latitude: number | null;
  longitude: number | null;
  city: string;
  isBooked: boolean;
}

const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_KEY ?? '';

export function LocationSection({ latitude, longitude, city, isBooked }: Props) {
  if (!latitude || !longitude) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Localisation</Text>
        <View style={styles.noMap}>
          <Text style={styles.noMapText}>📍 {city}</Text>
          <Text style={styles.noMapSub}>Carte non disponible</Text>
        </View>
      </View>
    );
  }

  const mapUrl = GEOAPIFY_KEY
    ? `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=220` +
      `&center=lonlat:${longitude},${latitude}&zoom=${isBooked ? 15 : 13}` +
      (isBooked
        ? `&marker=lonlat:${longitude},${latitude};type:awesome;color:%231B5E20;size:large`
        : `&circle=lonlat:${longitude},${latitude};radius:600;linecolor:%231B5E20;lineopacity:0.9;linewidth:2;fillcolor:%231B5E2030`) +
      `&apiKey=${GEOAPIFY_KEY}`
    : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Localisation</Text>
      <Text style={styles.subtitle}>
        {isBooked
          ? '📍 Adresse exacte'
          : '🔒 Zone approximative — l\'adresse exacte est fournie après confirmation'}
      </Text>
      <View style={styles.mapWrap}>
        {mapUrl ? (
          <Image source={{ uri: mapUrl }} style={styles.mapImg} resizeMode="cover" />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>🗺️ Carte non disponible</Text>
          </View>
        )}
      </View>
      <Text style={styles.city}>📍 {city}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:         { paddingHorizontal: 16, marginBottom: 24 },
  title:        { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle:     { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  mapWrap:      { borderRadius: 16, overflow: 'hidden', height: 220 },
  mapImg:       { width: '100%', height: 220 },
  fallback:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  fallbackText: { fontSize: 14, color: '#9CA3AF' },
  city:         { fontSize: 13, color: '#6B7280', marginTop: 8 },
  noMap:        { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 20, alignItems: 'center', gap: 4 },
  noMapText:    { fontSize: 15, fontWeight: '600', color: '#111827' },
  noMapSub:     { fontSize: 13, color: '#9CA3AF' },
});
