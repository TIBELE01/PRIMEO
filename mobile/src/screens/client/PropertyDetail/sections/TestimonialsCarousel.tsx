// TestimonialsCarousel — avis clients réels de l'annonce : filtre par note, chargement
// progressif (« Voir plus d'avis »), réponse du professionnel, et bouton « Ajouter un avis ».
// Les premiers avis viennent du détail d'annonce ; avec `propertyId`, la liste complète et
// les filtres sont servis par l'API /reviews/property/:id.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import type { ReviewsSummary, Review } from '@/types/property';
import { num, normalizeReview } from '@/utils/normalizeProperty';
import { reviewsApi } from '@/services/api/endpoints/reviews';

interface Props {
  reviewsSummary?: ReviewsSummary;
  propertyId?: string;
  color?: string;
  onAddReview: () => void;
}

const PAGE_SIZE = 10;

function Card({ review }: { review: Review }) {
  return (
    <View style={styles.card} testID="review-card">
      <View style={styles.head}>
        <View style={styles.avatar}>
          {review.authorAvatarUrl
            ? <Image source={{ uri: review.authorAvatarUrl }} style={styles.avatarImg} />
            : <Text style={styles.avatarInitial}>{review.authorName?.[0] ?? '?'}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{review.authorName}</Text>
          <Text style={styles.stars} accessibilityLabel={`${Math.round(num(review.rating))} sur 5`}>
            {'★'.repeat(Math.round(num(review.rating)))}<Text style={styles.starsOff}>{'★'.repeat(5 - Math.round(num(review.rating)))}</Text>
          </Text>
        </View>
      </View>
      {!!review.comment && <Text style={styles.comment} numberOfLines={5}>“{review.comment}”</Text>}
      {!!review.media?.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginTop: 8 }}>
          {review.media.map(m => <Image key={m.id} source={{ uri: m.url }} style={styles.thumb} />)}
        </ScrollView>
      )}
      {!!review.reply && (
        <View style={styles.reply}>
          <Text style={styles.replyLabel}>Réponse de l’hôte</Text>
          <Text style={styles.replyText} numberOfLines={4}>{review.reply}</Text>
        </View>
      )}
    </View>
  );
}

export function TestimonialsCarousel({ reviewsSummary, propertyId, color = '#1056E0', onAddReview }: Props) {
  // Avis réels uniquement — aucun témoignage fictif.
  const initial = reviewsSummary?.items ?? [];
  const [items, setItems] = useState<Review[]>(initial);
  const [total, setTotal] = useState(reviewsSummary?.total ?? initial.length);
  const [average, setAverage] = useState(reviewsSummary?.average ?? 0);
  const [distribution, setDistribution] = useState<Record<string, number> | null>(null);
  const [stars, setStars] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (nextPage: number, rating: number | null) => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const res = await reviewsApi.getForProperty(propertyId, { page: nextPage, limit: PAGE_SIZE, ...(rating ? { rating } : {}) });
      const body = (res?.data ?? {}) as { reviews?: unknown[]; pages?: number; total?: number; distribution?: Record<string, number>; average?: number; totalAll?: number };
      const list = (body.reviews ?? []).map(normalizeReview);
      setItems(prev => (nextPage === 1 ? list : [...prev, ...list.filter(r => !prev.some(p => p.id === r.id))]));
      setPage(nextPage);
      setPages(body.pages ?? 1);
      if (body.distribution) setDistribution(body.distribution);
      if (rating == null && typeof body.total === 'number') setTotal(body.total);
      if (typeof body.average === 'number' && body.average > 0) setAverage(body.average);
    } catch {
      // Hors ligne : on garde les avis déjà affichés
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { void load(1, null); }, [load]);

  const pick = (n: number | null) => { setStars(n); void load(1, n); };
  const allCount = distribution ? Object.values(distribution).reduce((a, b) => a + b, 0) : total;

  return (
    <View style={styles.wrap}>
      {total > 0 || items.length > 0 ? (
        <>
          <View style={styles.summary}>
            <Text style={[styles.avg, { color }]}>★ {num(average).toFixed(1)}</Text>
            <Text style={styles.total}>· {allCount} avis</Text>
          </View>

          {propertyId && allCount > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {[null, 5, 4, 3, 2, 1].map(n => {
                const count = n == null ? allCount : distribution?.[String(n)] ?? 0;
                const active = stars === n;
                const disabled = n != null && count === 0;
                return (
                  <TouchableOpacity
                    key={String(n)}
                    testID={`reviews-filter-${n ?? 'all'}`}
                    onPress={() => pick(n)}
                    disabled={disabled}
                    style={[styles.chip, active && { backgroundColor: color, borderColor: color }, disabled && styles.chipDisabled]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled }}
                    accessibilityLabel={n == null ? `Tous les avis (${count})` : `Avis ${n} étoile${n > 1 ? 's' : ''} (${count})`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{n == null ? 'Tous' : `${n} ★`} ({count})</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {items.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {items.map(r => <Card key={r.id} review={r} />)}
              {page < pages && (
                <TouchableOpacity style={[styles.more, { borderColor: color }]} onPress={() => load(page + 1, stars)} disabled={loading} testID="reviews-more">
                  {loading ? <ActivityIndicator color={color} /> : <Text style={[styles.moreText, { color }]}>Voir plus d’avis</Text>}
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : loading ? (
            <ActivityIndicator color={color} style={{ marginVertical: 16 }} />
          ) : (
            <Text style={styles.empty}>Aucun avis avec cette note.</Text>
          )}
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
  filters: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  chipDisabled: { opacity: 0.45 },
  chipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  chipTextActive: { color: '#fff' },
  row: { paddingHorizontal: 16, gap: 12 },
  empty: { paddingHorizontal: 16, fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 4 },
  card: { width: 250, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 38, height: 38 },
  avatarInitial: { color: '#fff', fontSize: 16, fontWeight: '700' },
  name: { fontSize: 13.5, fontWeight: '700', color: '#111827' },
  stars: { fontSize: 12, color: '#F59E0B', marginTop: 1 },
  starsOff: { color: '#E5E7EB' },
  comment: { fontSize: 13, color: '#374151', lineHeight: 19, fontStyle: 'italic' },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  reply: { marginTop: 10, backgroundColor: '#fff', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#1056E0' },
  replyLabel: { fontSize: 11, fontWeight: '700', color: '#1056E0', marginBottom: 2 },
  replyText: { fontSize: 12.5, color: '#374151', lineHeight: 18 },
  more: { width: 140, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 13.5, fontWeight: '700' },
  addBtn: { marginHorizontal: 16, marginTop: 14, borderWidth: 1.5, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  addBtnText: { fontSize: 14.5, fontWeight: '700' },
});
