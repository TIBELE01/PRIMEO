import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { ReviewsSummary, Review, ReviewCriteria } from '@/types/property';
import { num } from '@/utils/normalizeProperty';

interface Props { reviewsSummary?: ReviewsSummary; }

const CRITERIA_LABELS: Record<keyof ReviewCriteria, string> = {
  cleanliness: 'Propreté',
  location: 'Emplacement',
  value: 'Rapport qualité/prix',
  service: 'Service',
  communication: 'Communication',
};

function StarBar({ value }: { value: number }) {
  return (
    <View style={styles.starBar}>
      <View style={[styles.starFill, { width: `${(value / 5) * 100}%` }]} />
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.avatar}>
          {review.authorAvatarUrl ? (
            <Image source={{ uri: review.authorAvatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarInitial}>{review.authorName?.[0] ?? '?'}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{review.authorName}</Text>
          <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString('fr-CI', { month: 'long', year: 'numeric' })}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingBadgeText}>★ {num(review.rating).toFixed(1)}</Text>
        </View>
      </View>
      <Text style={styles.reviewText}>{review.comment}</Text>
      {review.media && review.media.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow} contentContainerStyle={{ gap: 8 }}>
          {review.media.map((m: { id: string; url: string }) => (
            <Image key={m.id} source={{ uri: m.url }} style={styles.mediaThumb} resizeMode="cover" />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export function ReviewsSection({ reviewsSummary }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (!reviewsSummary || reviewsSummary.total === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Avis</Text>
        <Text style={styles.noReviews}>Aucun avis pour l'instant</Text>
      </View>
    );
  }

  const { average, total, criteria, items } = reviewsSummary;
  const visible = showAll ? items : items.slice(0, 3);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Avis</Text>
        <View style={styles.overallBadge}>
          <Text style={styles.overallStar}>★</Text>
          <Text style={styles.overallScore}>{num(average).toFixed(1)}</Text>
          <Text style={styles.overallCount}>({total})</Text>
        </View>
      </View>

      {/* Sub-criteria bars */}
      {criteria && (
        <View style={styles.criteriaWrap}>
          {(Object.keys(CRITERIA_LABELS) as (keyof ReviewCriteria)[])
            .filter(k => criteria[k] != null)
            .map(k => (
              <View key={k} style={styles.criteriaRow}>
                <Text style={styles.criteriaLabel}>{CRITERIA_LABELS[k]}</Text>
                <StarBar value={num(criteria[k])} />
                <Text style={styles.criteriaScore}>{num(criteria[k]).toFixed(1)}</Text>
              </View>
            ))
          }
        </View>
      )}

      {/* Reviews list */}
      <View style={styles.reviewsList}>
        {visible.map(r => <ReviewCard key={r.id} review={r} />)}
      </View>

      {items.length > 3 && (
        <TouchableOpacity style={styles.showMore} onPress={() => setShowAll(s => !s)}>
          <Text style={styles.showMoreText}>
            {showAll ? 'Voir moins' : `Voir les ${items.length - 3} avis restants`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  overallBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  overallStar: { color: '#F59E0B', fontSize: 16 },
  overallScore: { fontSize: 18, fontWeight: '800', color: '#111827' },
  overallCount: { fontSize: 13, color: '#6B7280' },
  criteriaWrap: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 16, gap: 10 },
  criteriaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  criteriaLabel: { fontSize: 12, color: '#374151', width: 140 },
  starBar: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  starFill: { height: '100%', backgroundColor: '#1056E0', borderRadius: 3 },
  criteriaScore: { fontSize: 12, fontWeight: '600', color: '#111827', width: 28 },
  noReviews: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  reviewsList: { gap: 16 },
  reviewCard: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1056E0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 38, height: 38 },
  avatarInitial: { color: '#fff', fontSize: 16, fontWeight: '700' },
  authorName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  reviewDate: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  ratingBadge: { backgroundColor: '#FEF9C3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  ratingBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  reviewText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  showMore: { marginTop: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, alignItems: 'center' },
  showMoreText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  mediaRow: { marginTop: 10 },
  mediaThumb: { width: 80, height: 80, borderRadius: 8 },
});
