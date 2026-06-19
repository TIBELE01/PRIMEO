import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ClientScreenProps } from '../../../navigation/types';
import { clientRatingsApi } from '../../../services/api/endpoints/clientRatings';

interface ReceivedRating {
  id: string;
  bookingId: string;
  isReported: boolean;
  isHidden: boolean;
  createdAt: string;
  raterName: string;
  comment: string | null;
  propertyTitle: string | null;
  stayPeriod: string | null;
}

type Props = ClientScreenProps<'ReceivedRatings'>;

export function ReceivedRatingsScreen({ navigation }: Props) {
  const [ratings, setRatings] = useState<ReceivedRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReceivedRating | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await clientRatingsApi.listReceived();
      const data: ReceivedRating[] = res?.data?.data ?? res?.data ?? [];
      setRatings(data);
    } catch { /* keep stale */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReport = (rating: ReceivedRating) => {
    if (rating.isReported) {
      Alert.alert('Déjà signalé', 'Vous avez déjà signalé cette évaluation. Un administrateur va l\'examiner.');
      return;
    }
    setReportTarget(rating);
    setReportReason('');
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    if (reportReason.trim().length < 10) {
      Alert.alert('Motif requis', 'Veuillez fournir un motif d\'au moins 10 caractères.');
      return;
    }
    setSubmittingReport(true);
    try {
      await clientRatingsApi.report(reportTarget.id, reportReason.trim());
      setRatings(prev => prev.map(r => r.id === reportTarget.id ? { ...r, isReported: true } : r));
      setReportTarget(null);
      Alert.alert(
        'Signalement enregistré ✓',
        'Merci. Un administrateur va examiner cette évaluation et pourra la masquer si elle est jugée abusive.',
      );
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Impossible d\'envoyer le signalement.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const renderItem = ({ item }: { item: ReceivedRating }) => (
    <View style={[styles.card, item.isHidden && styles.cardHidden]}>
      {item.isHidden && (
        <View style={styles.hiddenBanner}>
          <Text style={styles.hiddenText}>🚫 Cette évaluation a été masquée par un administrateur</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>{(item.raterName?.[0] ?? '?').toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.raterName}>{item.raterName}</Text>
          {item.propertyTitle && <Text style={styles.propertyTitle} numberOfLines={1}>{item.propertyTitle}</Text>}
          {item.stayPeriod && <Text style={styles.stayPeriod}>{item.stayPeriod}</Text>}
        </View>
        <Text style={styles.ratingDate}>
          {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </Text>
      </View>

      {/* Score hidden — privacy by design */}
      <View style={styles.scoreHidden}>
        <Text style={styles.scoreHiddenIcon}>🔒</Text>
        <Text style={styles.scoreHiddenText}>Note non visible — réservée aux professionnels</Text>
      </View>

      {/* Public comment if any */}
      {item.comment && (
        <Text style={styles.comment}>"{item.comment}"</Text>
      )}

      {/* Report button */}
      {!item.isHidden && (
        <TouchableOpacity
          style={[styles.reportBtn, item.isReported && styles.reportBtnDone]}
          onPress={() => handleReport(item)}
        >
          <Text style={[styles.reportBtnText, item.isReported && styles.reportBtnTextDone]}>
            {item.isReported ? '✓ Signalée — en cours d\'examen' : '⚑ Signaler cette évaluation'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Privacy notice */}
      <View style={styles.privacyBanner}>
        <Text style={styles.privacyIcon}>ℹ️</Text>
        <Text style={styles.privacyText}>
          Vos notes sont confidentielles et visibles uniquement par les professionnels. Vous pouvez signaler toute évaluation injuste ou abusive.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#1056E0" /></View>
      ) : (
        <FlatList
          data={ratings}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, ratings.length === 0 && styles.emptyFlex]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#1056E0" />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyTitle}>Aucune évaluation</Text>
              <Text style={styles.emptyMsg}>Les professionnels pourront vous évaluer après chaque séjour terminé.</Text>
            </View>
          }
        />
      )}

      {/* Report modal */}
      <Modal visible={!!reportTarget} transparent animationType="slide" onRequestClose={() => setReportTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Signaler cette évaluation</Text>
            <Text style={styles.modalSub}>
              Expliquez pourquoi vous pensez que cette évaluation est injuste ou abusive. Un administrateur l'examinera et pourra la masquer.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="Décrivez le problème (min. 10 caractères)..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              maxLength={500}
              autoFocus
            />
            <Text style={styles.charCount}>{reportReason.length}/500</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setReportTarget(null)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, (reportReason.trim().length < 10 || submittingReport) && { opacity: 0.5 }]}
                onPress={submitReport}
                disabled={reportReason.trim().length < 10 || submittingReport}
              >
                {submittingReport
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalSubmitText}>Signaler</Text>
                }
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
  privacyBanner: { flexDirection: 'row', gap: 8, backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'flex-start' },
  privacyIcon: { fontSize: 16 },
  privacyText: { flex: 1, fontSize: 12, color: '#1D4ED8', lineHeight: 17 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  emptyFlex: { flex: 1 },
  emptyInner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyMsg: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardHidden: { opacity: 0.6 },
  hiddenBanner: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 8, marginBottom: 10 },
  hiddenText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerInfo: { flex: 1 },
  raterName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  propertyTitle: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  stayPeriod: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  ratingDate: { fontSize: 12, color: '#9CA3AF' },
  scoreHidden: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, marginBottom: 10 },
  scoreHiddenIcon: { fontSize: 16 },
  scoreHiddenText: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
  comment: { fontSize: 14, color: '#374151', fontStyle: 'italic', lineHeight: 20, marginBottom: 10 },
  reportBtn: { paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#FCA5A5', alignItems: 'center', marginTop: 4 },
  reportBtnDone: { borderColor: '#D1FAE5', backgroundColor: '#F0FDF4' },
  reportBtnText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },
  reportBtnTextDone: { color: '#1056E0' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalSub: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginTop: -4 },
  modalInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', textAlignVertical: 'top', minHeight: 90 },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: -4 },
  modalBtns: { flexDirection: 'row', gap: 10, paddingBottom: 12 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  modalCancelText: { fontWeight: '600', color: '#6B7280' },
  modalSubmit: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center' },
  modalSubmitText: { fontWeight: '700', color: '#fff' },
});
