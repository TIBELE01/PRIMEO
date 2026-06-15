// FullscreenImageViewer — visionneuse plein écran swipeable avec zoom (pinch).
// Ouverte depuis le carrousel de la fiche détail au tap sur une image.
import React, { useRef } from 'react';
import {
  Modal, View, Image, FlatList, TouchableOpacity, Text, StyleSheet,
  Dimensions, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const FullscreenImageViewer: React.FC<Props> = ({ visible, images, initialIndex = 0, onClose }) => {
  const safeImages = Array.isArray(images) ? images : [];
  const startIndex = Math.min(Math.max(0, initialIndex), Math.max(0, safeImages.length - 1));
  const [index, setIndex] = React.useState(startIndex);
  const listRef = useRef<FlatList>(null);

  // Resynchroniser l'index de départ à chaque ouverture
  React.useEffect(() => {
    if (visible) setIndex(startIndex);
  }, [visible, startIndex]);

  if (safeImages.length === 0) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        {/* Header : compteur + fermer */}
        <View style={s.header}>
          <Text style={s.counter} accessibilityRole="text">{index + 1} / {safeImages.length}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={16} accessibilityRole="button" accessibilityLabel="Fermer la galerie">
            <Text style={s.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          data={safeImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
          renderItem={({ item, index: i }) => (
            // ScrollView = pinch-to-zoom natif (iOS) + double-tap (Android via maximumZoomScale)
            <ScrollView
              style={{ width: SCREEN_W }}
              contentContainerStyle={s.zoomContent}
              maximumZoomScale={Platform.OS === 'ios' ? 3 : 1}
              minimumZoomScale={1}
              centerContent
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <Image
                source={{ uri: item }}
                style={s.image}
                resizeMode="contain"
                accessibilityRole="image"
                accessibilityLabel={`Image ${i + 1} sur ${safeImages.length}`}
              />
            </ScrollView>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, zIndex: 2,
  },
  counter: { color: '#fff', fontSize: 15, fontWeight: '600' },
  close: { color: '#fff', fontSize: 22, fontWeight: '700' },
  zoomContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: SCREEN_W, height: SCREEN_H * 0.8 },
});
