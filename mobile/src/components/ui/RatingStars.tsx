// Star rating display (read-only or interactive)
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export function RatingStars({ rating, maxRating = 5, size = 20, interactive, onRate }: RatingStarsProps) {
  const isInteractive = interactive ?? !!onRate;
  // Affichage seul : un seul élément a11y annonçant la note globale.
  if (!isInteractive) {
    return (
      <View
        style={styles.row}
        accessibilityRole="image"
        accessibilityLabel={`Note : ${rating} sur ${maxRating} étoiles`}
      >
        {Array.from({ length: maxRating }).map((_, i) => (
          <Text key={i} style={[styles.star, { fontSize: size }]} accessibilityElementsHidden importantForAccessibility="no">
            {i < rating ? '★' : '☆'}
          </Text>
        ))}
      </View>
    );
  }
  // Interactif : chaque étoile est un bouton de notation.
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Donner une note">
      {Array.from({ length: maxRating }).map((_, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onRate?.(i + 1)}
          disabled={!isInteractive}
          accessibilityRole="button"
          accessibilityLabel={`Noter ${i + 1} sur ${maxRating} étoiles`}
          accessibilityState={{ selected: i < rating }}
        >
          <Text style={[styles.star, { fontSize: size }]}>{i < rating ? '★' : '☆'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  star: { color: '#D67309', marginHorizontal: 1 },
});
