// ImageUploader: grid picker for multiple property photos using expo-image-picker
import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet, FlatList, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface ImageUploaderProps {
  images: string[];
  onAdd: (uri: string) => void;
  onRemove: (uri: string) => void;
  maxImages?: number;
  /** Taille max par image en Mo (défaut 5). Au-delà, l'image est refusée. */
  maxSizeMb?: number;
}

const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'heic'];

export const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onAdd, onRemove, maxImages = 10, maxSizeMb = 5 }) => {
  // Garde défensif : images peut arriver undefined/null
  const safeImages = Array.isArray(images) ? images : [];
  const [picking, setPicking] = useState(false);

  const handlePick = async () => {
    if (picking) return;
    const remaining = maxImages - safeImages.length;
    if (remaining <= 0) {
      Alert.alert('Limite atteinte', `Vous pouvez ajouter au maximum ${maxImages} images.`);
      return;
    }
    setPicking(true);
    try {
      // 1. Permission galerie
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission requise',
          "Autorisez l'accès à vos photos dans les réglages pour ajouter des images.",
        );
        return;
      }

      // 2. Sélection multiple, qualité compressée
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });
      if (result.canceled) return;

      // 3. Validation format + taille, puis remontée au parent
      for (const asset of result.assets) {
        const ext = (asset.uri.split('.').pop() ?? '').toLowerCase();
        if (ext && !ALLOWED_EXT.includes(ext)) {
          Alert.alert('Format non supporté', `Le format .${ext} n'est pas accepté (JPG, PNG, WEBP).`);
          continue;
        }
        const sizeMb = (asset.fileSize ?? 0) / (1024 * 1024);
        if (sizeMb > maxSizeMb) {
          Alert.alert('Image trop lourde', `Chaque image doit faire moins de ${maxSizeMb} Mo.`);
          continue;
        }
        onAdd(asset.uri);
      }
    } catch {
      Alert.alert('Erreur', "Impossible d'ouvrir la galerie. Veuillez réessayer.");
    } finally {
      setPicking(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={safeImages}
        horizontal
        keyExtractor={item => item}
        renderItem={({ item, index }) => (
          <View style={styles.imageBox}>
            <Image source={{ uri: item }} style={styles.image} accessibilityRole="image" accessibilityLabel={`Image ${index + 1}`} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemove(item)}
              accessibilityRole="button"
              accessibilityLabel={`Supprimer l'image ${index + 1}`}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={safeImages.length < maxImages ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handlePick}
            disabled={picking}
            accessibilityRole="button"
            accessibilityLabel="Ajouter des images"
            accessibilityHint="Ouvre la galerie photo de l'appareil"
          >
            <Text style={styles.addIcon}>{picking ? '…' : '+'}</Text>
          </TouchableOpacity>
        ) : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  imageBox: { marginRight: 8, position: 'relative' },
  image: { width: 80, height: 80, borderRadius: 8 },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#fff', fontSize: 12 },
  addBtn: { width: 80, height: 80, borderRadius: 8, borderWidth: 2, borderColor: '#1056E0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addIcon: { fontSize: 28, color: '#1056E0' },
});
