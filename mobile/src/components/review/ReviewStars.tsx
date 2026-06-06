// ReviewStars: static star display for quick rating visualization
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { num } from '../../utils/normalizeProperty';

interface ReviewStarsProps {
  rating: number;
  count?: number;
}

export const ReviewStars: React.FC<ReviewStarsProps> = ({ rating, count }) => (
  <View style={styles.row}>
    <Text style={styles.star}>⭐</Text>
    <Text style={styles.rating}>{num(rating).toFixed(1)}</Text>
    {count !== undefined && <Text style={styles.count}>({count} avis)</Text>}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { fontSize: 14 },
  rating: { fontSize: 14, fontWeight: '700', color: '#D67309' },
  count: { fontSize: 13, color: '#777' },
});
