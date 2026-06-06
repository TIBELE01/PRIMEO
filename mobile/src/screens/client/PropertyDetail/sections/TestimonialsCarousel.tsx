// TestimonialsCarousel — horizontal carousel of client reviews + "add review" CTA.
import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { ReviewsSummary, Review } from '@/types/property';
import { num } from '@/utils/normalizeProperty';

interface Props {
  reviewsSummary?: ReviewsSummary;
  color?: string;
  onAddReview: () => void;
}

function Card({ review }: { review: Review }) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          {review.authorAvatarUrl
            ? <Image source={{ uri: review.authorAvatarUrl }} style={styles.avatarImg} />
            : <Text style={styles.avatarInitial}>{review.authorName?.[0] ?? '?'}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{review.authorName}</Text>
          <Text style={styles.stars}>{'★'.repeat(Math.round(num(review.rating)))}</Text>
        </View>
      </View>
      <Text style={styles.comment} numberOfLines={4}>“{review.comment}”</Text>
    </View>
  );
}

export function TestimonialsCarousel({ reviewsSummary, color = '#1056E0', onAddReview }: Props) {
  // Avis réels uniquement — aucun témoignage fictif.
  const items = reviewsSummary?.items ?? [];
  const total = reviewsSummary?.total ?? items.length;
  const average = reviewsSummary?.average ?? 0;

  return (
    <View style={styles.wrap}>
      {items.length > 0 ? (
        <>
          <View style={styles.summary}>
            <Text style={[styles.avg, { color }]}>★ {num(average).toFixed(1)}</Text>
            <Text style={styles.total}>· {total} avis</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {items.map(r => <Card key={r.id} review={r} />)}
          </ScrollView>
        </>
      ) : (
        <Text style={styles.empty}>Aucun avis pour le moment. Soyez le premier à partager votre expérience !</Text>
      )}

      <TouchableOpacity style={[styles.addBtn, { borderColor: color }]} onPress={onAddReview} activeOpacity={0.85}>
        <Text style={[styles.addBtnText, { color }]}>✍️  Ajouter un avis</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 12 },
  summary: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  avg: { fontSize: 18, fontWeight: '800' },
  total: { fontSize: 13, color: '#6B7280' },
  row: { paddingHorizontal: 16, gap: 12 },
  empty: { paddingHorizontal: 16, fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 4 },
  card: { width: 240, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 38, height: 38 },
  avatarInitial: { color: '#fff', fontSize: 16, fontWeight: '700' },
  name: { fontSize: 13.5, fontWeight: '700', color: '#111827' },
  stars: { fontSize: 12, color: '#F59E0B', marginTop: 1 },
  comment: { fontSize: 13, color: '#374151', lineHeight: 19, fontStyle: 'italic' },
  addBtn: { marginHorizontal: 16, marginTop: 14, borderWidth: 1.5, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  addBtnText: { fontSize: 14.5, fontWeight: '700' },
});
