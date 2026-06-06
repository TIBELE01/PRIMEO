// PropertyMap: static map view using Geoapify static map API
import React from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({ latitude, longitude, zoom = 14 }) => {
  // Geoapify static map endpoint — requires EXPO_PUBLIC_GEOAPIFY_KEY
  const apiKey = process.env.EXPO_PUBLIC_GEOAPIFY_KEY ?? '';
  const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=600&height=300&center=lonlat:${longitude},${latitude}&zoom=${zoom}&marker=lonlat:${longitude},${latitude};color:%231B5E20&apiKey=${apiKey}`;
  return (
    <View style={styles.container}>
      <Image source={{ uri: mapUrl }} style={styles.map} resizeMode="cover" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderRadius: 12, overflow: 'hidden', height: 180 },
  map: { width: '100%', height: '100%' },
});
