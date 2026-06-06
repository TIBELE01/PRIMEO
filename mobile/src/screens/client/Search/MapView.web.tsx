// Vue carte web — utilise l'API Static Maps de Geoapify pour afficher
// toutes les propriétés géolocalisées. La carte est statique mais les
// cartes de propriétés en dessous sont interactives.
import React, { useMemo, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import type { Property } from '@/types/property';

const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_KEY ?? '45a2f3027d5c444c91b3dd6c1cdd38cd';
const DEFAULT_LAT = 5.3484;
const DEFAULT_LON = -4.0166;

interface Props {
  properties: Property[];
  onMarkerPress: (propertyId: string) => void;
  color?: string;
}

function buildStaticMapUrl(
  props: Property[],
  color: string,
  width = 800,
  height = 380,
): string {
  const withCoords = props.filter(p => p.latitude != null && p.longitude != null);

  if (withCoords.length === 0) {
    return (
      `https://maps.geoapify.com/v1/staticmap?style=osm-bright` +
      `&width=${width}&height=${height}` +
      `&center=lonlat:${DEFAULT_LON},${DEFAULT_LAT}&zoom=12` +
      `&apiKey=${GEOAPIFY_KEY}`
    );
  }

  // Centre sur le barycentre des propriétés
  const avgLat = withCoords.reduce((s, p) => s + p.latitude!, 0) / withCoords.length;
  const avgLon = withCoords.reduce((s, p) => s + p.longitude!, 0) / withCoords.length;

  // Zoom adaptatif selon la dispersion
  const latDelta = Math.max(...withCoords.map(p => p.latitude!)) - Math.min(...withCoords.map(p => p.latitude!));
  const lonDelta = Math.max(...withCoords.map(p => p.longitude!)) - Math.min(...withCoords.map(p => p.longitude!));
  const spread = Math.max(latDelta, lonDelta);
  const zoom = spread < 0.01 ? 15 : spread < 0.05 ? 13 : spread < 0.2 ? 11 : spread < 1 ? 9 : 7;

  const hex = color.replace('#', '%23');

  // Max 10 marqueurs pour ne pas dépasser la limite d'URL
  const markers = withCoords.slice(0, 10).map((p, i) =>
    `lonlat:${p.longitude!},${p.latitude!};color:${i === 0 ? hex : '%23374151'};size:${i === 0 ? 'x-large' : 'medium'}`,
  ).join('|');

  return (
    `https://maps.geoapify.com/v1/staticmap?style=osm-bright` +
    `&width=${width}&height=${height}` +
    `&center=lonlat:${avgLon},${avgLat}&zoom=${zoom}` +
    `&marker=${markers}` +
    `&apiKey=${GEOAPIFY_KEY}`
  );
}

function fmt(p: Property): string {
  if (p.pricePerNight != null) return `${p.pricePerNight.toLocaleString('fr-CI')} F / nuit`;
  if (p.priceForSale != null) return `${p.priceForSale.toLocaleString('fr-CI')} F`;
  if ((p as any).pricePerMonth != null) return `${(p as any).pricePerMonth.toLocaleString('fr-CI')} F / mois`;
  return 'Prix sur demande';
}

export function SearchMapView({ properties, onMarkerPress, color = '#1056E0' }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const withCoords = useMemo(() => properties.filter(p => p.latitude != null && p.longitude != null), [properties]);
  const mapUrl = useMemo(() => buildStaticMapUrl(withCoords, color), [withCoords, color]);

  const selectedProp = selected ? properties.find(p => p.id === selected) : null;

  return (
    <View style={st.container}>
      {/* Carte Geoapify statique */}
      <View style={st.mapWrap}>
        {!imgLoaded && (
          <View style={st.loader}>
            <ActivityIndicator color={color} />
            <Text style={st.loaderText}>Chargement de la carte…</Text>
          </View>
        )}
        <Image
          source={{ uri: mapUrl }}
          style={st.mapImg}
          resizeMode="cover"
          onLoad={() => setImgLoaded(true)}
        />

        {/* Badge nombre de propriétés */}
        <View style={[st.badge, { backgroundColor: color }]}>
          <Text style={st.badgeText}>
            {withCoords.length} propriété{withCoords.length !== 1 ? 's' : ''} sur la carte
          </Text>
        </View>

        {/* Popup propriété sélectionnée */}
        {selectedProp && (
          <TouchableOpacity
            style={st.popup}
            onPress={() => onMarkerPress(selectedProp.id)}
          >
            <Text style={st.popupName} numberOfLines={1}>{selectedProp.name}</Text>
            <Text style={[st.popupPrice, { color }]}>{fmt(selectedProp)}</Text>
            <Text style={st.popupCity}>📍 {selectedProp.city}</Text>
            <Text style={st.popupCta}>Voir le détail →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Liste horizontale cliquable des propriétés géolocalisées */}
      {withCoords.length > 0 && (
        <View style={st.listWrap}>
          <Text style={st.listTitle}>Propriétés sur la carte</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.listRow}>
            {withCoords.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[st.card, selected === p.id && { borderColor: color, borderWidth: 2 }]}
                onPress={() => {
                  if (selected === p.id) {
                    onMarkerPress(p.id);
                  } else {
                    setSelected(p.id);
                  }
                }}
                activeOpacity={0.85}
              >
                {p.images?.[0]?.url ? (
                  <Image source={{ uri: p.images[0].url }} style={st.cardImg} resizeMode="cover" />
                ) : (
                  <View style={[st.cardImg, st.cardImgPlaceholder]}>
                    <Text style={st.cardImgIcon}>🏠</Text>
                  </View>
                )}
                <View style={st.cardBody}>
                  <Text style={st.cardName} numberOfLines={1}>{p.name}</Text>
                  <Text style={st.cardCity} numberOfLines={1}>📍 {p.city}</Text>
                  <Text style={[st.cardPrice, { color }]}>{fmt(p)}</Text>
                  <View style={st.cardRating}>
                    <Text style={st.cardStar}>★</Text>
                    <Text style={st.cardRatingText}>{p.rating.toFixed(1)}</Text>
                    <Text style={st.cardReviews}>({p.reviewCount})</Text>
                  </View>
                </View>
                {selected === p.id && (
                  <View style={[st.cardSelectedBar, { backgroundColor: color }]}>
                    <Text style={st.cardSelectedText}>Voir →</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {withCoords.length === 0 && (
        <View style={st.empty}>
          <Text style={st.emptyIcon}>📍</Text>
          <Text style={st.emptyText}>Aucune propriété géolocalisée</Text>
          <Text style={st.emptySub}>Passez en vue liste pour voir tous les résultats</Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  mapWrap: { height: 280, position: 'relative', backgroundColor: '#E5E7EB' },
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 8, zIndex: 1 },
  loaderText: { fontSize: 12, color: '#6B7280' },
  mapImg: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute', top: 10, left: 10,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  popup: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
    backgroundColor: '#fff', borderRadius: 14,
    padding: 12, gap: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10,
  },
  popupName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  popupPrice: { fontSize: 13, fontWeight: '800' },
  popupCity: { fontSize: 11, color: '#6B7280' },
  popupCta: { fontSize: 12, color: '#1056E0', fontWeight: '600', marginTop: 4 },
  listWrap: { paddingTop: 14 },
  listTitle: { fontSize: 13, fontWeight: '700', color: '#374151', paddingHorizontal: 16, marginBottom: 10 },
  listRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 16 },
  card: {
    width: 170, backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
  },
  cardImg: { width: '100%', height: 100 },
  cardImgPlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  cardImgIcon: { fontSize: 28 },
  cardBody: { padding: 10, gap: 2 },
  cardName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  cardCity: { fontSize: 11, color: '#9CA3AF' },
  cardPrice: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  cardRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  cardStar: { fontSize: 11, color: '#F59E0B' },
  cardRatingText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  cardReviews: { fontSize: 10, color: '#9CA3AF' },
  cardSelectedBar: { paddingVertical: 6, alignItems: 'center' },
  cardSelectedText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 32 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  emptySub: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
});
