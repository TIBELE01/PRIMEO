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
  return (
    <View style={styles.row}>
      {Array.from({ length: maxRating }).map((_, i) => (
        <TouchableOpacity key={i} onPress={() => onRate?.(i + 1)} disabled={!isInteractive}>
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
