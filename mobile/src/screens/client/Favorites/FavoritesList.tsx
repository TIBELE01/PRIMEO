// FavoritesList: scrollable list of favorited properties
import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { PropertyCard } from '../../../components/property/PropertyCard';

interface Property { id: string; title: string; city: string; pricePerNight: number; mainImageUrl?: string; rating?: number; reviewCount?: number }

interface FavoritesListProps {
  favorites: Property[];
  onPropertyPress: (id: string) => void;
  onRemoveFavorite: (id: string) => void;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({ favorites, onPropertyPress, onRemoveFavorite }) => {
  if (!favorites.length) {
    return <View style={styles.empty}><Text style={styles.emptyText}>Aucun favori pour le moment</Text></View>;
  }
  return (
    <FlatList
      data={favorites}
      keyExtractor={f => f.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <PropertyCard property={item} onPress={() => onPropertyPress(item.id)} onFavorite={() => onRemoveFavorite(item.id)} isFavorite />
      )}
    />
  );
};

const styles = StyleSheet.create({
  list: { padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 15, color: '#999', textAlign: 'center' },
});
