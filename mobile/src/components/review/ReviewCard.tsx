import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RatingStars } from '../ui/RatingStars';

interface ReviewCardProps {
  review: { id: string; author: string; rating: number; comment: string; createdAt: string; authorAvatar?: string };
}

const AVATAR_COLORS = ['#1056E0', '#D67309', '#469A0E', '#7C3AED', '#D41313', '#0891B2'];

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const avatarBg = AVATAR_COLORS[review.author.charCodeAt(0) % AVATAR_COLORS.length];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.initials}>{review.author[0].toUpperCase()}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.author}>{review.author}</Text>
          <Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
        </View>
        <RatingStars rating={review.rating} size={14} />
      </View>
      <Text style={styles.comment}>{review.comment}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  initials: { color: '#fff', fontWeight: '800', fontSize: 16 },
  meta: { flex: 1 },
  author: { fontWeight: '700', fontSize: 14, color: '#0F1729' },
  date: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  comment: { fontSize: 14, color: '#334155', lineHeight: 22 },
});
