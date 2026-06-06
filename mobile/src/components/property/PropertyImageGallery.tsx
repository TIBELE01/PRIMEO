// PropertyImageGallery: swipeable full-width image carousel for property detail
import React, { useState } from 'react';
import { View, Image, FlatList, TouchableOpacity, Text, Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

interface PropertyImageGalleryProps {
  images: string[];
  onImagePress?: (index: number) => void;
}

export const PropertyImageGallery: React.FC<PropertyImageGalleryProps> = ({ images, onImagePress }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  // Garde défensif : images peut arriver undefined/null d'une donnée incomplète
  const safeImages = Array.isArray(images) ? images : [];
  if (safeImages.length === 0) {
    return <View style={styles.empty} />;
  }
  return (
    <View>
      <FlatList
        data={safeImages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={e => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index }) => (
          <TouchableOpacity onPress={() => onImagePress?.(index)} activeOpacity={0.9}>
            <Image source={{ uri: item }} style={{ width, height: 280 }} />
          </TouchableOpacity>
        )}
      />
      <View style={styles.dots}>
        {safeImages.map((_, i) => <View key={i} style={[styles.dot, i === activeIndex && styles.activeDot]} />)}
      </View>
      <View style={styles.counter}><Text style={styles.counterText}>{activeIndex + 1}/{safeImages.length}</Text></View>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: { width, height: 280, backgroundColor: '#E5E7EB' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ddd' },
  activeDot: { backgroundColor: '#1056E0', width: 18 },
  counter: { position: 'absolute', bottom: 20, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  counterText: { color: '#fff', fontSize: 12 },
});
