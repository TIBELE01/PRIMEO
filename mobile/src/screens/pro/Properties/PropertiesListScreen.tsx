import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { useProTheme } from '../../../hooks/useProTheme';
import { statusStyle } from './propertyStatus';

function BoostTimer({ expiresAt }: { expiresAt: string }) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  return (
    <View style={styles.boostBadge}>
      <Text style={styles.boostText}>⚡ Boost {hours}h{mins}m</Text>
    </View>
  );
}

function PropertyRow({ property, onPress, onCalendar, onDuplicate }: { property: any; onPress: () => void; onCalendar: () => void; onDuplicate: () => void }) {
  const status = statusStyle(property.status);
  const imageUrl = property.mainImageUrl ?? property.media?.[0]?.url ?? property.images?.[0]?.url;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Voir l'annonce ${property.name ?? property.title}`}>
      {imageUrl
        ? <Image source={{ uri: imageUrl }} style={styles.thumb} />
        : <View style={[styles.thumb, styles.thumbFallback]}><Text style={styles.thumbEmoji}>🏠</Text></View>
      }
      <View style={styles.cardContent}>
        <Text style={styles.propName} numberOfLines={1}>{property.name ?? property.title}</Text>
        <Text style={styles.propCity}>{property.city}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          {property.isBoosted && property.boostExpiresAt && (
            <BoostTimer expiresAt={property.boostExpiresAt} />
          )}
        </View>
        {property.pricePerNight != null && (
          <Text style={styles.price}>{property.pricePerNight.toLocaleString('fr-CI')} FCFA/nuit</Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actBtn} onPress={onDuplicate} accessibilityRole="button" accessibilityLabel="Dupliquer l'annonce">
          <Text style={styles.actIcon}>⧉</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actBtn} onPress={onCalendar} accessibilityRole="button" accessibilityLabel="Voir le calendrier">
          <Text style={styles.actIcon}>📅</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function PropertiesListScreen({ navigation }: any) {
  const theme = useProTheme();
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await propertiesApi.getMyListings();
      const data = res.data?.data ?? res.data ?? [];
      setProperties(Array.isArray(data) ? data : data?.properties ?? []);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Reload on every focus so a newly created/edited property appears immediately.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDuplicate = useCallback((id: string, name: string) => {
    Alert.alert(
      'Dupliquer l\'annonce',
      `Créer une copie de « ${name} » en brouillon ? Vous pourrez la modifier avant publication.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Dupliquer',
          onPress: async () => {
            try {
              const res = await propertiesApi.duplicate(id);
              const copy = res.data?.data ?? res.data;
              await load(true);
              if (copy?.id) navigation.navigate('PropertyManagement', { propertyId: copy.id });
            } catch (e: any) {
              Alert.alert('Erreur', e?.response?.data?.error ?? 'Duplication impossible.');
            }
          },
        },
      ],
    );
  }, [load, navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={properties}
        keyExtractor={(p, i) => p.id ?? String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PropertyRow
            property={item}
            onPress={() => navigation.navigate('PropertyManagement', { propertyId: item.id })}
            onCalendar={() => navigation.navigate('PropertyCalendar', { propertyId: item.id })}
            onDuplicate={() => handleDuplicate(item.id, item.name ?? item.title)}
          />
        )}
        ListHeaderComponent={
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('AddProperty')} accessibilityRole="button" accessibilityLabel="Ajouter une propriété">
            <Text style={styles.addText}>+ Ajouter une propriété</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏘</Text>
            <Text style={styles.emptyTitle}>Aucune propriété</Text>
            <Text style={styles.emptySubtitle}>Ajoutez votre première annonce pour commencer</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 16, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  addBtn: { backgroundColor: '#1056E0', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 4 },
  addText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', overflow: 'hidden', elevation: 2 },
  thumb: { width: 90, height: 90 },
  thumbFallback: { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  thumbEmoji: { fontSize: 32 },
  cardContent: { flex: 1, padding: 12, gap: 4 },
  propName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  propCity: { fontSize: 12, color: '#6B7280' },
  cardMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  boostBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  boostText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  price: { fontSize: 13, fontWeight: '700', color: '#1056E0', marginTop: 2 },
  actions: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, gap: 10 },
  actBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  actIcon: { fontSize: 18 },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
});
