// ImageUploader: grid picker for multiple property photos using expo-image-picker
import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet, FlatList } from 'react-native';

interface ImageUploaderProps {
  images: string[];
  onAdd: (uri: string) => void;
  onRemove: (uri: string) => void;
  maxImages?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onAdd, onRemove, maxImages = 10 }) => {
  // Garde défensif : images peut arriver undefined/null
  const safeImages = Array.isArray(images) ? images : [];
  const handlePick = async () => {
    // TODO: use expo-image-picker to launch image library
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={safeImages}
        horizontal
        keyExtractor={item => item}
        renderItem={({ item }) => (
          <View style={styles.imageBox}>
            <Image source={{ uri: item }} style={styles.image} />
            <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(item)}><Text style={styles.removeText}>✕</Text></TouchableOpacity>
          </View>
        )}
        ListFooterComponent={safeImages.length < maxImages ? (
          <TouchableOpacity style={styles.addBtn} onPress={handlePick}>
            <Text style={styles.addIcon}>+</Text>
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
