import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import type { Property } from '@/types/property';

interface Props {
  properties: Property[];
  onMarkerPress: (propertyId: string) => void;
  color?: string; // accent color (parity with web MapView); native markers use a fixed style
}

const DEFAULT_REGION: Region = {
  latitude: 5.3484, longitude: -4.0166, // Abidjan
  latitudeDelta: 0.5, longitudeDelta: 0.5,
};

const fmt = (n: number | null) => n ? `${n.toLocaleString('fr-CI')} F` : '—';

export function SearchMapView({ properties, onMarkerPress }: Props) {
  const withCoords = properties.filter(p => p.latitude != null && p.longitude != null);

  const region: Region = withCoords.length > 0 ? {
    latitude: withCoords.reduce((s, p) => s + p.latitude!, 0) / withCoords.length,
    longitude: withCoords.reduce((s, p) => s + p.longitude!, 0) / withCoords.length,
    latitudeDelta: 0.3, longitudeDelta: 0.3,
  } : DEFAULT_REGION;

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region} showsUserLocation showsMyLocationButton={false}>
        {withCoords.map(p => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude!, longitude: p.longitude! }}
            onPress={() => onMarkerPress(p.id)}
          >
            <View style={[styles.marker, p.isBoosted && styles.markerBoosted]}>
              <Text style={styles.markerText}>{fmt(p.pricePerNight ?? p.priceForSale)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
      {withCoords.length === 0 && (
        <View style={styles.noCoords} pointerEvents="none">
          <Text style={styles.noCoordsText}>Aucune propriété géolocalisée</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  marker: { backgroundColor: '#1056E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  markerBoosted: { backgroundColor: '#F59E0B' },
  markerText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  noCoords: { position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' },
  noCoordsText: { backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
});
