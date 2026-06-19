import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { adminApi } from '../../services/api/endpoints/adminApi';

interface PendingProperty {
  id: string;
  title: string;
  propertyType: string;
  city: string;
  street?: string;
  status: string;
  createdAt: string;
  pricePerNight?: number;
  pricePerMonth?: number;
  priceSale?: number;
  description?: string;
  amenities?: string[];
  paymentOptions?: string[];
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  media?: { url: string; isPrimary: boolean }[];
  images?: { url: string; isPrimary: boolean }[];
  rules?: Record<string, any>;
}

const TYPE_LABEL: Record<string, string> = {
  residence:           'Résidence',
  hotel:               'Hôtel',
  immobilier_location: 'Immobilier — Location',
  immobilier_terrain:  'Terrain',
  immobilier_achat:    'Immobilier — Vente',
  restaurant:          'Restaurant',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatPrice(p: PendingProperty) {
  if (p.pricePerNight) return `${p.pricePerNight.toLocaleString('fr-CI')} FCFA/nuit`;
  if (p.pricePerMonth) return `${p.pricePerMonth.toLocaleString('fr-CI')} FCFA/mois`;
  if (p.priceSale)     return `${p.priceSale.toLocaleString('fr-CI')} FCFA`;
  return 'Gratuit';
}

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({
  visible, onCancel, onConfirm, loading,
}: { visible: boolean; onCancel: () => void; onConfirm: (reason: string) => void; loading: boolean }) {
  const [reason, setReason] = useState('');
  const handleConfirm = () => { if (reason.trim().length >= 5) onConfirm(reason.trim()); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={ms.backdrop}>
        <View style={ms.card}>
          <Text style={ms.title}>Refuser l'annonce</Text>
          <Text style={ms.hint}>Indiquez la raison du refus (min. 5 caractères). Le professionnel sera notifié.</Text>
          <TextInput
            style={ms.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Ex: Photos insuffisantes, informations incomplètes..."
            multiline
            numberOfLines={3}
            placeholderTextColor="#9CA3AF"
          />
          <View style={ms.actions}>
            <TouchableOpacity style={ms.cancelBtn} onPress={onCancel}>
              <Text style={ms.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.rejectBtn, reason.trim().length < 5 && { opacity: 0.4 }]}
              onPress={handleConfirm}
              disabled={loading || reason.trim().length < 5}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={ms.rejectText}>Refuser</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:      { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 380 },
  title:     { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  hint:      { fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 18 },
  input:     { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', height: 90, textAlignVertical: 'top' },
  actions:   { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, alignItems: 'center' },
  cancelText:{ color: '#374151', fontWeight: '600' },
  rejectBtn: { flex: 1, backgroundColor: '#DC2626', borderRadius: 10, padding: 12, alignItems: 'center' },
  rejectText:{ color: '#fff', fontWeight: '700' },
  modBtn:    { flex: 1, backgroundColor: '#D97706', borderRadius: 10, padding: 12, alignItems: 'center' },
  modText:   { color: '#fff', fontWeight: '700' },
});

// ── Modifications modal ───────────────────────────────────────────────────────

function ModificationsModal({
  visible, onCancel, onConfirm, loading,
}: { visible: boolean; onCancel: () => void; onConfirm: (feedback: string) => void; loading: boolean }) {
  const [feedback, setFeedback] = useState('');
  const handleConfirm = () => { if (feedback.trim().length >= 10) onConfirm(feedback.trim()); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={ms.backdrop}>
        <View style={ms.card}>
          <Text style={ms.title}>Demander des modifications</Text>
          <Text style={ms.hint}>Indiquez les modifications requises (min. 10 caractères). Le professionnel sera notifié.</Text>
          <TextInput
            style={ms.input}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Ex: Veuillez ajouter des photos de meilleure qualité, préciser la superficie..."
            multiline
            numberOfLines={3}
            placeholderTextColor="#9CA3AF"
          />
          <View style={ms.actions}>
            <TouchableOpacity style={ms.cancelBtn} onPress={onCancel}>
              <Text style={ms.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.modBtn, feedback.trim().length < 10 && { opacity: 0.4 }]}
              onPress={handleConfirm}
              disabled={loading || feedback.trim().length < 10}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={ms.modText}>Envoyer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Property card ─────────────────────────────────────────────────────────────

function PropertyCard({
  property, onApprove, onReject, onRequestMods, approving, rejecting, requesting,
}: {
  property: PendingProperty;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestMods: (id: string) => void;
  approving: boolean;
  rejecting: boolean;
  requesting: boolean;
}) {
  const allMedia = property.media ?? property.images ?? [];
  const thumb = allMedia.find(m => m.isPrimary)?.url ?? allMedia[0]?.url;
  const ownerName = property.owner ? `${property.owner.firstName} ${property.owner.lastName}` : '—';

  return (
    <View style={cs.card}>
      {/* Thumbnail + basic info */}
      <View style={cs.top}>
        {thumb
          ? <Image source={{ uri: thumb }} style={cs.thumb} />
          : <View style={[cs.thumb, cs.thumbFallback]}><Text style={cs.thumbEmoji}>🏠</Text></View>
        }
        <View style={cs.info}>
          <Text style={cs.title} numberOfLines={2}>{property.title}</Text>
          <Text style={cs.type}>{TYPE_LABEL[property.propertyType] ?? property.propertyType}</Text>
          <Text style={cs.meta}>📍 {property.city}</Text>
          <Text style={cs.meta}>💰 {formatPrice(property)}</Text>
          <Text style={cs.meta}>📅 Soumise le {formatDate(property.createdAt)}</Text>
        </View>
      </View>

      {/* Owner info */}
      <View style={cs.ownerRow}>
        <Ionicons name="person-outline" size={13} color="#6B7280" />
        <Text style={cs.ownerText}>{ownerName} — {property.owner?.email ?? ''}</Text>
      </View>

      {/* Full photo gallery — admin reviews every uploaded image */}
      {allMedia.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cs.gallery} contentContainerStyle={{ gap: 8 }}>
          {allMedia.map((m, i) => (
            <Image key={i} source={{ uri: m.url }} style={cs.galleryImg} />
          ))}
        </ScrollView>
      )}

      {/* Description preview */}
      {property.description && (
        <Text style={cs.desc} numberOfLines={3}>{property.description}</Text>
      )}

      {/* Action buttons */}
      <View style={cs.actions}>
        <TouchableOpacity
          style={[cs.rejectBtn, rejecting && { opacity: 0.5 }]}
          onPress={() => onReject(property.id)}
          disabled={rejecting || approving || requesting}
        >
          {rejecting
            ? <ActivityIndicator color="#DC2626" size="small" />
            : <><Ionicons name="close-circle-outline" size={16} color="#DC2626" /><Text style={cs.rejectText}>Refuser</Text></>
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={[cs.approveBtn, approving && { opacity: 0.5 }]}
          onPress={() => onApprove(property.id)}
          disabled={approving || rejecting || requesting}
        >
          {approving
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="checkmark-circle-outline" size={16} color="#fff" /><Text style={cs.approveText}>Approuver</Text></>
          }
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[cs.modsBtn, requesting && { opacity: 0.5 }]}
        onPress={() => onRequestMods(property.id)}
        disabled={approving || rejecting || requesting}
      >
        {requesting
          ? <ActivityIndicator color="#D97706" size="small" />
          : <><Ionicons name="create-outline" size={16} color="#D97706" /><Text style={cs.modsText}>Demander des modifications</Text></>
        }
      </TouchableOpacity>
    </View>
  );
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  top:          { flexDirection: 'row', gap: 12, marginBottom: 10 },
  thumb:        { width: 80, height: 80, borderRadius: 10 },
  thumbFallback:{ backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  thumbEmoji:   { fontSize: 30 },
  gallery:      { marginBottom: 10 },
  galleryImg:   { width: 96, height: 72, borderRadius: 8, backgroundColor: '#F3F4F6' },
  info:         { flex: 1, gap: 2 },
  title:        { fontSize: 15, fontWeight: '700', color: '#111827' },
  type:         { fontSize: 12, color: '#1056E0', fontWeight: '600' },
  meta:         { fontSize: 12, color: '#6B7280' },
  ownerRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8, marginBottom: 8 },
  ownerText:    { fontSize: 12, color: '#374151', flex: 1 },
  desc:         { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 10 },
  actions:      { flexDirection: 'row', gap: 10 },
  rejectBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#FCA5A5', borderRadius: 10, paddingVertical: 10 },
  rejectText:   { color: '#DC2626', fontWeight: '700', fontSize: 14 },
  approveBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10 },
  approveText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  modsBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#FDE68A', borderRadius: 10, paddingVertical: 10, marginTop: 8 },
  modsText:     { color: '#D97706', fontWeight: '700', fontSize: 14 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PropertiesModerationScreen() {
  const navigation = useNavigation<any>();
  const [properties, setProperties] = useState<PendingProperty[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId]   = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectingId, setRejectingId]   = useState<string | null>(null);
  const [modTarget, setModTarget]       = useState<string | null>(null);
  const [modSendingId, setModSendingId] = useState<string | null>(null);

  // Feedback modal state
  const [fbModal, setFbModal] = useState<{ visible: boolean; success: boolean; message: string }>({
    visible: false, success: true, message: '',
  });

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await adminApi.listPendingProperties({ limit: 50 });
      const data = res.data?.data ?? res.data;
      setProperties(Array.isArray(data) ? data : (data?.items ?? data?.properties ?? []));
    } catch {
      setProperties([]);
    } finally {
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await adminApi.approveProperty(id);
      setProperties(prev => prev.filter(p => p.id !== id));
      setFbModal({ visible: true, success: true, message: 'Annonce approuvée — elle est maintenant visible par les clients.' });
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Impossible d\'approuver cette annonce.';
      setFbModal({ visible: true, success: false, message: msg });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    const id = rejectTarget;
    setRejectingId(id);
    setRejectTarget(null);
    try {
      await adminApi.rejectProperty(id, reason);
      setProperties(prev => prev.filter(p => p.id !== id));
      setFbModal({ visible: true, success: true, message: 'Annonce refusée — le professionnel a été notifié.' });
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Impossible de refuser cette annonce.';
      setFbModal({ visible: true, success: false, message: msg });
    } finally {
      setRejectingId(null);
    }
  };

  const handleRequestMods = async (feedback: string) => {
    if (!modTarget) return;
    const id = modTarget;
    setModSendingId(id);
    setModTarget(null);
    try {
      await adminApi.requestPropertyModifications(id, feedback);
      setProperties(prev => prev.filter(p => p.id !== id));
      setFbModal({ visible: true, success: true, message: 'Demande envoyée — le professionnel a été notifié des modifications requises.' });
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Impossible d\'envoyer la demande de modifications.';
      setFbModal({ visible: true, success: false, message: msg });
    } finally {
      setModSendingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modération des annonces</Text>
        <TouchableOpacity onPress={() => load(true)}>
          <Ionicons name="refresh-outline" size={20} color="#1056E0" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1056E0" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#1056E0']} tintColor="#1056E0" />}
        >
          {properties.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color="#D1FAE5" />
              <Text style={styles.emptyTitle}>Aucune annonce en attente</Text>
              <Text style={styles.emptyText}>Toutes les annonces ont été traitées.</Text>
            </View>
          ) : (
            <>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{properties.length} annonce{properties.length > 1 ? 's' : ''} à examiner</Text>
              </View>
              {properties.map(p => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  onApprove={handleApprove}
                  onReject={(id) => setRejectTarget(id)}
                  onRequestMods={(id) => setModTarget(id)}
                  approving={approvingId === p.id}
                  rejecting={rejectingId === p.id}
                  requesting={modSendingId === p.id}
                />
              ))}
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Reject reason modal */}
      <RejectModal
        visible={rejectTarget !== null}
        onCancel={() => setRejectTarget(null)}
        onConfirm={handleReject}
        loading={rejectingId !== null}
      />

      {/* Request modifications modal */}
      <ModificationsModal
        visible={modTarget !== null}
        onCancel={() => setModTarget(null)}
        onConfirm={handleRequestMods}
        loading={modSendingId !== null}
      />

      {/* Feedback modal */}
      <Modal visible={fbModal.visible} transparent animationType="fade" onRequestClose={() => setFbModal(prev => ({ ...prev, visible: false }))}>
        <View style={styles.fbBackdrop}>
          <View style={styles.fbCard}>
            <View style={[styles.fbIcon, { backgroundColor: fbModal.success ? '#D1FAE5' : '#FEE2E2' }]}>
              <Text style={styles.fbIconText}>{fbModal.success ? '✓' : '!'}</Text>
            </View>
            <Text style={styles.fbMessage}>{fbModal.message}</Text>
            <TouchableOpacity
              style={[styles.fbBtn, { backgroundColor: fbModal.success ? '#059669' : '#DC2626' }]}
              onPress={() => setFbModal(prev => ({ ...prev, visible: false }))}
            >
              <Text style={styles.fbBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 16, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  scroll:      { padding: 16 },
  countBadge:  { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 12 },
  countText:   { fontSize: 14, fontWeight: '700', color: '#D97706', textAlign: 'center' },
  emptyBox:    { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyText:   { fontSize: 14, color: '#6B7280' },
  fbBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  fbCard:      { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center' },
  fbIcon:      { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  fbIconText:  { fontSize: 26, fontWeight: '800' },
  fbMessage:   { fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  fbBtn:       { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  fbBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});
