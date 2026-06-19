import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ClientScreenProps } from '../../../navigation/types';
import { reviewsApi } from '../../../services/api/endpoints/reviews';

interface Review {
  id: string;
  propertyId: string;
  bookingId: string;
  rating: number;
  cleanlinessRating?: number;
  communicationRating?: number;
  accuracyRating?: number;
  locationRating?: number;
  valueRating?: number;
  comment?: string;
  status: string;
  publishedAt?: string;
  createdAt: string;
  canEdit: boolean;
  responseFromProfessional?: string;
  property?: { id: string; title: string };
}

type Props = ClientScreenProps<'MyReviews'>;

const CRITERIA_LABELS: Record<string, string> = {
  cleanlinessRating: 'Propreté',
  communicationRating: 'Communication',
  accuracyRating: 'Exactitude',
  locationRating: 'Emplacement',
  valueRating: 'Qualité-prix',
};

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Text key={n} style={{ fontSize: size, color: n <= value ? '#D67309' : '#E5E7EB' }}>★</Text>
      ))}
    </View>
  );
}

export function MyReviewsScreen({ navigation }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editTarget, setEditTarget] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await reviewsApi.listMine();
      const data: Review[] = res?.data?.reviews ?? res?.data?.data ?? [];
      setReviews(data);
    } catch { /* keep stale */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (review: Review) => {
    setEditTarget(review);
    setEditRating(review.rating);
    setEditComment(review.comment ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (editRating === 0) { Alert.alert('Note requise', 'Veuillez sélectionner une note.'); return; }
    if (editComment.length > 0 && editComment.length < 10) {
      Alert.alert('Commentaire trop court', 'Min. 10 caractères.');
      return;
    }
    setSaving(true);
    try {
      await reviewsApi.update(editTarget.id, {
        rating: editRating,
        ...(editComment.trim() ? { comment: editComment.trim() } : {}),
      });
      setEditTarget(null);
      load(true);
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Impossible de modifier l\'avis.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (review: Review) => {
    Alert.alert(
      'Supprimer l\'avis',
      'Cette action est irréversible. Voulez-vous vraiment supprimer cet avis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive', onPress: async () => {
            try {
              await reviewsApi.deleteReview(review.id);
              setReviews(prev => prev.filter(r => r.id !== review.id));
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message ?? 'Impossible de supprimer l\'avis.');
            }
          },
        },
      ],
    );
  };

  const statusLabel = (s: string) => {
    if (s === 'published') return { text: 'Publié', color: '#1056E0' };
    if (s === 'pending_moderation') return { text: 'En modération', color: '#D97706' };
    if (s === 'hidden') return { text: 'Masqué', color: '#DC2626' };
    return { text: s, color: '#6B7280' };
  };

  const renderItem = ({ item }: { item: Review }) => {
    const sl = statusLabel(item.status);
    const criteriaPairs = Object.entries(CRITERIA_LABELS).filter(([k]) => item[k as keyof Review] != null);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName} numberOfLines={1}>{item.property?.title ?? '—'}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sl.color + '20' }]}>
            <Text style={[styles.statusText, { color: sl.color }]}>{sl.text}</Text>
          </View>
        </View>

        {/* Global rating */}
        <View style={styles.ratingRow}>
          <Stars value={item.rating} size={18} />
          <Text style={styles.ratingNum}>{item.rating}/5</Text>
        </View>

        {/* Sub-criteria */}
        {criteriaPairs.length > 0 && (
          <View style={styles.criteriaGrid}>
            {criteriaPairs.map(([key, label]) => (
              <View key={key} style={styles.criteriaItem}>
                <Text style={styles.criteriaLbl}>{label}</Text>
                <Stars value={item[key as keyof Review] as number} size={12} />
              </View>
            ))}
          </View>
        )}

        {/* Comment */}
        {item.comment && (
          <Text style={styles.comment}>"{item.comment}"</Text>
        )}

        {/* Professional reply */}
        {item.responseFromProfessional && (
          <View style={styles.replyBox}>
            <Text style={styles.replyLabel}>Réponse de l'hôte :</Text>
            <Text style={styles.replyText}>{item.responseFromProfessional}</Text>
          </View>
        )}

        {/* Actions */}
        {item.canEdit && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
              <Text style={styles.editBtnText}>✏️ Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteBtnText}>🗑 Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}
        {!item.canEdit && item.status === 'published' && (
          <Text style={styles.windowExpired}>Fenêtre de modification de 7 jours écoulée</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mes avis</Text>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#1056E0" /></View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, reviews.length === 0 && styles.emptyFlex]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#1056E0" />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={styles.emptyTitle}>Aucun avis</Text>
              <Text style={styles.emptyMsg}>Vos avis sur les propriétés apparaîtront ici après vos séjours.</Text>
            </View>
          }
        />
      )}

      {/* Edit modal */}
      <Modal visible={!!editTarget} transparent animationType="slide" onRequestClose={() => setEditTarget(null)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalBox} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Modifier mon avis</Text>
            <Text style={styles.modalProp}>{editTarget?.property?.title}</Text>

            <Text style={styles.modalLabel}>Note globale</Text>
            <View style={styles.modalStars}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setEditRating(n)}>
                  <Text style={[styles.modalStar, n <= editRating && styles.modalStarFilled]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Commentaire</Text>
            <TextInput
              style={styles.modalInput}
              value={editComment}
              onChangeText={setEditComment}
              placeholder="Votre commentaire (optionnel, min. 10 caractères)..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              maxLength={2000}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditTarget(null)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, (editRating === 0 || saving) && { opacity: 0.5 }]}
                onPress={handleSaveEdit}
                disabled={editRating === 0 || saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSaveText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 16, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { padding: 4, marginRight: 8 },
  backArrow: { fontSize: 22, color: '#1056E0', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  emptyFlex: { flex: 1 },
  emptyInner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyMsg: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  propertyInfo: { flex: 1, marginRight: 10 },
  propertyName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  date: { fontSize: 12, color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ratingNum: { fontSize: 14, fontWeight: '700', color: '#111827' },
  criteriaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  criteriaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  criteriaLbl: { fontSize: 12, color: '#6B7280' },
  comment: { fontSize: 14, color: '#374151', fontStyle: 'italic', lineHeight: 20, marginBottom: 10 },
  replyBox: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, marginBottom: 10 },
  replyLabel: { fontSize: 12, fontWeight: '700', color: '#1056E0', marginBottom: 4 },
  replyText: { fontSize: 13, color: '#374151', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  editBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#1056E0', alignItems: 'center' },
  editBtnText: { fontSize: 13, fontWeight: '700', color: '#1056E0' },
  deleteBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#FCA5A5', alignItems: 'center' },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  windowExpired: { fontSize: 11, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalProp: { fontSize: 13, color: '#6B7280', marginTop: -4 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 4 },
  modalStars: { flexDirection: 'row', gap: 10 },
  modalStar: { fontSize: 36, color: '#E5E7EB' },
  modalStarFilled: { color: '#D67309' },
  modalInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', textAlignVertical: 'top', minHeight: 80 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4, paddingBottom: 12 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  modalCancelText: { fontWeight: '600', color: '#6B7280' },
  modalSave: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#1056E0', alignItems: 'center' },
  modalSaveText: { fontWeight: '700', color: '#fff' },
});
