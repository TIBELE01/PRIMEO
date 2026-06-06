// HorizontalPropertyList: horizontally scrolling property card row for Home screen
import React from 'react';
import { FlatList, View, StyleSheet, Text } from 'react-native';
import { PropertyCard } from './PropertyCard';

interface Property { id: string; title: string; city: string; pricePerNight: number; mainImageUrl?: string; rating?: number; reviewCount?: number; isBoosted?: boolean; boostExpiresAt?: string }

interface HorizontalPropertyListProps {
  title: string;
  properties: Property[];
  onPropertyPress: (id: string) => void;
  onSeeAll?: () => void;
}

export const HorizontalPropertyList: React.FC<HorizontalPropertyListProps> = ({ title, properties, onPropertyPress, onSeeAll }) => (
  <View style={styles.section}>
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {onSeeAll && <Text style={styles.seeAll} onPress={onSeeAll}>Voir tout</Text>}
    </View>
    <FlatList
      data={Array.isArray(properties) ? properties : []}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={p => p.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.cardWrapper}>
          <PropertyCard property={item} onPress={() => onPropertyPress(item.id)} />
        </View>
      )}
    />
  </View>
);

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#222' },
  seeAll: { color: '#1056E0', fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, gap: 12 },
  cardWrapper: { width: 240 },
});
