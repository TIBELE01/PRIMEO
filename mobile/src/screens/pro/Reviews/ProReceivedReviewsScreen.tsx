import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { reviewsApi } from '../../../services/api/endpoints/reviews';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reply?: string | null;
  reviewer?: { firstName: string; lastName: string };
  // injected by this screen
  propertyName?: string;
  propertyId?: string;
}

function Stars({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Ionicons
          key={n}
          name={n <= Math.round(value) ? 'star' : 'star-outline'}
          size={14}
          color={n <= Math.round(value) ? '#F59E0B' : '#D1D5DB'}
        />
      ))}
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function ProReceivedReviewsScreen() {
  const navigation = useNavigation<any>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reply modal
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // Fetch pro's property list, then reviews for each
      const propsRes = await propertiesApi.getMyListings({ limit: 20 });
      const properties: Array<{ id: string; name: string }> = (propsRes.data?.data ?? propsRes.data) ?? [];

      // Fetch reviews for each property (up to 10)
      const reviewResults = await Promise.allSettled(
        properties.slice(0, 10).map(async (prop) => {
          const res = await reviewsApi.getForProperty(prop.id, { limit: 50 });
          const data: Review[] = (res.data?.data ?? res.data) ?? [];
          return data.map(r => ({ ...r, propertyName: prop.name, propertyId: prop.id }));
        }),
      );

      const allReviews = (reviewResults as PromiseFulfilledResult<any>[])
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setReviews(allReviews);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReply = (review: Review) => {
    setReplyTarget(review);
    setReplyText(review.reply ?? '');
  };

  const submitReply = async () => {
    if (!replyTarget) return;
    if (replyText.trim().length < 3) {
      Alert.alert('Réponse invalide', 'Veuillez saisir au moins 3 caractères.');
      return;
    }
    setReplyLoading(true);
    try {
      await reviewsApi.replyToReview(replyTarget.id, replyText.trim());
      setReviews(prev =>
        prev.map(r => r.id === replyTarget.id ? { ...r, reply: replyText.trim() } : r),
      );
      setReplyTarget(null);
      setReplyText('');
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la réponse.');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleReport = (review: Review) => {
    Alert.alert(
      'Signaler cet avis',
      'Pour signaler un avis abusif, veuillez contacter notre support en mentionnant l\'identifiant de l\'avis.',
      [{ text: 'OK' }],
    );
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Avis reçus</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Summary bar */}
      {avgRating && (
        <View style={styles.summaryBar}>
          <Ionicons name="star" size={18} color="#F59E0B" />
          <Text style={styles.summaryAvg}>{avgRating}</Text>
          <Text style={styles.summaryCount}>({reviews.length} avis)</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#1056E0" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#1056E0']} tintColor="#1056E0" />
          }
          showsVerticalScrollIndicator={false}
        >
          {reviews.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={52} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Aucun avis pour le moment</Text>
              <Text style={styles.emptySubtitle}>Les avis de vos clients apparaîtront ici.</Text>
            </View>
          ) : (
            reviews.map(review => (
              <View key={review.id} style={styles.card}>
                {/* Review header */}
                <View style={styles.cardHeader}>
                  <View style={styles.reviewerAvatar}>
                    <Text style={styles.reviewerAvatarText}>
                      {review.reviewer
                        ? `${review.reviewer.firstName[0]}${review.reviewer.lastName[0]}`
                        : '?'}
                    </Text>
                  </View>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.reviewerName}>
                      {review.reviewer
                        ? `${review.reviewer.firstName} ${review.reviewer.lastName}`
                        : 'Client anonyme'}
                    </Text>
                    <Text style={styles.propertyName}>{review.propertyName}</Text>
                    <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                  </View>
                  <Stars value={review.rating} />
                </View>

                {/* Comment */}
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}

                {/* Existing reply */}
                {review.reply && (
                  <View style={styles.replyBox}>
                    <Text style={styles.replyLabel}>Votre réponse</Text>
                    <Text style={styles.replyText}>{review.reply}</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleReply(review)}>
                    <Ionicons name="chatbubble-outline" size={13} color="#1056E0" />
                    <Text style={styles.actionBtnText}>{review.reply ? 'Modifier la réponse' : 'Répondre'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => handleReport(review)}>
                    <Ionicons name="flag-outline" size={13} color="#6B7280" />
                    <Text style={[styles.actionBtnText, { color: '#6B7280' }]}>Signaler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Reply modal */}
      <Modal visible={!!replyTarget} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {replyTarget?.reply ? 'Modifier votre réponse' : 'Répondre à cet avis'}
            </Text>
            {replyTarget?.comment && (
              <Text style={styles.modalQuote}>« {replyTarget.comment} »</Text>
            )}
            <TextInput
              style={styles.modalInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Votre réponse publique…"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{replyText.length}/500</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setReplyTarget(null); setReplyText(''); }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, (!replyText.trim() || replyLoading) && { opacity: 0.6 }]}
                onPress={submitReply}
                disabled={!replyText.trim() || replyLoading}
              >
                {replyLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalConfirmText}>Publier</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  headerBack: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  summaryBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  summaryAvg: { fontSize: 18, fontWeight: '800', color: '#111827' },
  summaryCount: { fontSize: 13, color: '#6B7280' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  reviewerAvatarText: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  cardHeaderInfo: { flex: 1 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  propertyName: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  reviewDate: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  reviewComment: { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 10 },
  replyBox: { backgroundColor: '#F0FDF4', borderLeftWidth: 3, borderLeftColor: '#1056E0', padding: 10, borderRadius: 8, marginBottom: 10 },
  replyLabel: { fontSize: 11, fontWeight: '600', color: '#1056E0', marginBottom: 4 },
  replyText: { fontSize: 12, color: '#374151', lineHeight: 18 },
  cardActions: { flexDirection: 'row', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#D1FAE5' },
  actionBtnSecondary: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#1056E0' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalQuote: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', lineHeight: 20 },
  modalInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: -4 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  modalCancelText: { fontSize: 15, color: '#374151', fontWeight: '600' },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#1056E0', alignItems: 'center' },
  modalConfirmText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
