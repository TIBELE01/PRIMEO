// Carte de localisation via l'API Static Maps de Geoapify — fonctionne web et natif
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// Clé Geoapify injectée à la compilation (variable d'environnement EXPO_PUBLIC_*)
const GEOAPIFY_KEY =
  process.env.EXPO_PUBLIC_GEOAPIFY_KEY ?? '45a2f3027d5c444c91b3dd6c1cdd38cd';

interface Props {
  latitude: number | null;
  longitude: number | null;
  city: string;
  isBooked: boolean;
  color?: string;
}

function buildStaticMapUrl(
  lat: number,
  lng: number,
  isBooked: boolean,
  color: string,
): string {
  // Zoom 15 pour l'adresse exacte, 13 pour la zone approximative
  const zoom = isBooked ? 15 : 13;
  // Couleur du marqueur sans le '#'
  const hex = color.replace('#', '%23');
  const markerSize = isBooked ? 'large' : 'x-large';
  // Format Geoapify : lonlat (longitude en premier)
  const marker = `lonlat:${lng},${lat};color:${hex};size:${markerSize}`;
  return (
    `https://maps.geoapify.com/v1/staticmap` +
    `?style=osm-bright` +
    `&width=800&height=300` +
    `&center=lonlat:${lng},${lat}` +
    `&zoom=${zoom}` +
    `&marker=${marker}` +
    `&apiKey=${GEOAPIFY_KEY}`
  );
}

export function LocationSection({
  latitude,
  longitude,
  city,
  isBooked,
  color = '#1056E0',
}: Props) {
  if (!latitude || !longitude) {
    return (
      <View style={styles.wrap}>
        <View style={styles.noMap}>
          <Text style={styles.noMapIcon}>📍</Text>
          <Text style={styles.noMapText}>{city}</Text>
          <Text style={styles.noMapSub}>Carte non disponible</Text>
        </View>
      </View>
    );
  }

  const mapUrl = buildStaticMapUrl(latitude, longitude, isBooked, color);

  return (
    <View style={styles.wrap}>
      <Text style={styles.subtitle}>
        {isBooked
          ? '📍 Adresse exacte'
          : "🔒 Zone approximative — l'adresse exacte est communiquée après confirmation"}
      </Text>

      <View style={styles.mapWrap}>
        <Image
          source={{ uri: mapUrl }}
          style={styles.map}
          resizeMode="cover"
        />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerDot, { color }]}>●</Text>
        <Text style={styles.footerCity}>{city}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:         { paddingHorizontal: 16, paddingBottom: 14 },
  subtitle:     { fontSize: 12, color: '#6B7280', marginBottom: 10, lineHeight: 17 },
  mapWrap:      { borderRadius: 16, overflow: 'hidden', height: 220, backgroundColor: '#E5E7EB' },
  map:          { width: '100%', height: '100%' },
  footer:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  footerDot:    { fontSize: 8 },
  footerCity:   { fontSize: 13, color: '#374151', fontWeight: '500' },
  noMap:        { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 24, alignItems: 'center', gap: 4 },
  noMapIcon:    { fontSize: 28 },
  noMapText:    { fontSize: 15, fontWeight: '600', color: '#111827' },
  noMapSub:     { fontSize: 13, color: '#9CA3AF' },
});
