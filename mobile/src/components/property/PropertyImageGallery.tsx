// PropertyImageGallery: swipeable image carousel for property detail.
// Largeur/hauteur paramétrables pour s'insérer dans la carte média (avec marges).
import React, { useState } from 'react';
import { View, Image, FlatList, TouchableOpacity, Text, Dimensions, StyleSheet } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PropertyImageGalleryProps {
  images: string[];
  onImagePress?: (index: number) => void;
  width?: number;   // largeur d'une diapo (défaut : pleine largeur écran)
  height?: number;  // hauteur du carrousel
}

export const PropertyImageGallery: React.FC<PropertyImageGalleryProps> = ({
  images,
  onImagePress,
  width = SCREEN_WIDTH,
  height = 280,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  // Garde défensif : images peut arriver undefined/null d'une donnée incomplète
  const safeImages = Array.isArray(images) ? images : [];
  if (safeImages.length === 0) {
    return <View style={[styles.empty, { width, height }]} />;
  }
  return (
    <View>
      <FlatList
        data={safeImages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        // pagination calée sur la largeur réelle d'une diapo (carte ou plein écran)
        onMomentumScrollEnd={e => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index }) => (
          <TouchableOpacity onPress={() => onImagePress?.(index)} activeOpacity={0.9}>
            <Image source={{ uri: item }} style={{ width, height }} />
          </TouchableOpacity>
        )}
      />
      {safeImages.length > 1 && (
        <View style={styles.dots}>
          {safeImages.map((_, i) => <View key={i} style={[styles.dot, i === activeIndex && styles.activeDot]} />)}
        </View>
      )}
      <View style={styles.counter}><Text style={styles.counterText}>{activeIndex + 1}/{safeImages.length}</Text></View>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: { backgroundColor: '#E5E7EB' },
  // Pagination superposée en bas du carrousel (visible sur la carte média)
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  activeDot: { backgroundColor: '#fff', width: 18 },
  counter: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  counterText: { color: '#fff', fontSize: 12 },
});
