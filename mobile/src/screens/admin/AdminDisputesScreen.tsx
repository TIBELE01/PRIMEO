import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { adminApi } from '../../services/api/endpoints/adminApi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DisputeMessage {
  id: string;
  content: string;
  sentAt: string;
  sender: { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
}

interface DisputeDetail {
  id: string;
  reason: string;
  description?: string | null;
  status: string;
  resolution?: string | null;
  refundAmount?: number | null;
  adminNotes?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  opener: { id: string; firstName: string; lastName: string };
  booking: {
    id: string;
    totalAmount: number;
    onlinePaidAmount: number;
    startDate: string;
    endDate: string;
    status: string;
    client: { id: string; firstName: string; lastName: string; email: string };
    property: {
      id: string;
      title: string;
      ownerId: string;
      owner: { id: string; firstName: string; lastName: string; email: string };
    };
  };
  messages: DisputeMessage[];
}

interface DisputeSummary {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  booking?: {
    client?: { firstName: string; lastName: string };
    property?: { title: string };
    totalAmount?: number;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  open:                   { label: 'Ouvert',              color: '#DC2626', icon: 'alert-circle'    },
  under_review:           { label: 'En examen',           color: '#D97706', icon: 'time'             },
  resolved_no_refund:     { label: 'Résolu — sans rembours.', color: '#059669', icon: 'checkmark-circle' },
  resolved_refund_partial:{ label: 'Résolu — remb. partiel',  color: '#059669', icon: 'checkmark-circle' },
  resolved_refund_full:   { label: 'Résolu — remb. total',    color: '#059669', icon: 'checkmark-circle' },
};

const RESOLUTION_OPTIONS: { key: 'resolved_no_refund' | 'resolved_refund_partial' | 'resolved_refund_full'; label: string; desc: string; color: string }[] = [
  { key: 'resolved_no_refund',      label: 'Aucun remboursement', desc: 'La réclamation est infondée.', color: '#6B7280' },
  { key: 'resolved_refund_partial', label: 'Remboursement partiel', desc: 'Indiquer le montant ci-dessous.', color: '#D97706' },
  { key: 'resolved_refund_full',    label: 'Remboursement total', desc: 'Le client sera intégralement remboursé.', color: '#059669' },
];

const FILTERS = [
  { key: 'open',        label: 'Ouverts'  },
  { key: 'under_review',label: 'En cours' },
  { key: 'resolved',    label: 'Résolus'  },
] as const;
type FilterKey = typeof FILTERS[number]['key'];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isResolved(status: string) {
  return status.startsWith('resolved_');
}

// ── Dispute detail modal ───────────────────────────────────────────────────────

function DisputeModal({
  disputeId,
  onClose,
  onResolved,
}: {
  disputeId: string;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [dispute, setDispute]       = useState<DisputeDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setAction]  = useState(false);
  const [resolution, setResolution] = useState<'resolved_no_refund' | 'resolved_refund_partial' | 'resolved_refund_full'>('resolved_no_refund');
  const [partialAmount, setPartial] = useState('');
  const [notes, setNotes]           = useState('');

  useEffect(() => {
    adminApi.getDispute(disputeId)
      .then(r => setDispute(r.data as DisputeDetail))
      .catch(() => Alert.alert('Erreur', 'Impossible de charger le litige'))
      .finally(() => setLoading(false));
  }, [disputeId]);

  const handleResolve = async () => {
    if (notes.trim().length < 10) {
      Alert.alert('Notes requises', 'Les notes admin doivent contenir au moins 10 caractères.');
      return;
    }
    if (resolution === 'resolved_refund_partial') {
      const amt = parseInt(partialAmount.replace(/\s/g, ''), 10);
      if (!amt || amt <= 0) {
        Alert.alert('Montant invalide', 'Indiquez un montant de remboursement valide.');
        return;
      }
    }

    setAction(true);
    try {
      if (resolution === 'resolved_refund_partial') {
        const amt = parseInt(partialAmount.replace(/\s/g, ''), 10);
        await adminApi.refundDispute(disputeId, amt, notes.trim());
      } else {
        await adminApi.resolveDispute(disputeId, resolution, notes.trim());
      }
      Alert.alert('Litige résolu', 'Le litige a été traité avec succès.');
      onResolved();
      onClose();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de résoudre le litige');
    } finally {
      setAction(false);
    }
  };

  const resolved = dispute ? isResolved(dispute.status) : false;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={dm.safe}>
        {/* Header */}
        <View style={dm.header}>
          <TouchableOpacity onPress={onClose} style={dm.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={dm.headerTitle}>Détail du litige</Text>
          {dispute && (
            <View style={[dm.statusBadge, { backgroundColor: (STATUS_CONFIG[dispute.status]?.color ?? '#6B7280') + '30' }]}>
              <Text style={[dm.statusText, { color: STATUS_CONFIG[dispute.status]?.color ?? '#6B7280' }]}>
                {STATUS_CONFIG[dispute.status]?.label ?? dispute.status}
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color="#1056E0" />
        ) : !dispute ? (
          <View style={dm.centered}><Text style={dm.errorText}>Litige introuvable</Text></View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: resolved ? 32 : 200 }}>
            {/* Booking info */}
            <View style={dm.section}>
              <Text style={dm.sectionTitle}>Réservation concernée</Text>
              <DRow icon="home-outline"   label="Propriété" value={dispute.booking.property.title} />
              <DRow icon="person-outline" label="Client"    value={`${dispute.booking.client.firstName} ${dispute.booking.client.lastName}`} />
              <DRow icon="mail-outline"   label="Email"     value={dispute.booking.client.email} />
              <DRow icon="person-outline" label="Propriétaire" value={`${dispute.booking.property.owner.firstName} ${dispute.booking.property.owner.lastName}`} />
              <DRow icon="calendar-outline" label="Dates"   value={`${formatDate(dispute.booking.startDate)} → ${formatDate(dispute.booking.endDate)}`} />
              <DRow icon="cash-outline"   label="Montant total"    value={`${dispute.booking.totalAmount.toLocaleString('fr-CI')} FCFA`} />
              <DRow icon="card-outline"   label="Payé en ligne"    value={`${dispute.booking.onlinePaidAmount.toLocaleString('fr-CI')} FCFA`} />
              {dispute.refundAmount != null ? (
                <DRow icon="refresh-outline" label="Remboursé" value={`${dispute.refundAmount.toLocaleString('fr-CI')} FCFA`} />
              ) : null}
            </View>

            {/* Dispute details */}
            <View style={dm.section}>
              <Text style={dm.sectionTitle}>Motif du litige</Text>
              <Text style={dm.reasonText}>{dispute.reason}</Text>
              {dispute.description ? <Text style={dm.descText}>{dispute.description}</Text> : null}
              <View style={dm.metaRow}>
                <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                <Text style={dm.metaText}>Ouvert le {formatDate(dispute.createdAt)}</Text>
                <Text style={dm.metaDot}>·</Text>
                <Text style={dm.metaText}>par {dispute.opener.firstName} {dispute.opener.lastName}</Text>
              </View>
              {dispute.adminNotes ? (
                <View style={dm.notesBox}>
                  <Text style={dm.notesLabel}>Notes admin :</Text>
                  <Text style={dm.notesText}>{dispute.adminNotes}</Text>
                </View>
              ) : null}
            </View>

            {/* Messages thread */}
            {dispute.messages.length > 0 && (
              <View style={dm.section}>
                <Text style={dm.sectionTitle}>Messages ({dispute.messages.length})</Text>
                {dispute.messages.map(msg => (
                  <View key={msg.id} style={dm.msgBubble}>
                    <View style={dm.msgHeader}>
                      <View style={dm.msgAvatar}>
                        <Text style={dm.msgAvatarText}>{(msg.sender?.firstName?.[0] ?? '?').toUpperCase()}</Text>
                      </View>
                      <Text style={dm.msgSender}>{msg.sender.firstName} {msg.sender.lastName}</Text>
                      <Text style={dm.msgTime}>{formatDate(msg.sentAt)} {formatTime(msg.sentAt)}</Text>
                    </View>
                    <Text style={dm.msgContent}>{msg.content}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Resolution form — only if open */}
            {!resolved && (
              <View style={dm.section}>
                <Text style={dm.sectionTitle}>Décision admin</Text>

                {/* Resolution selector */}
                {RESOLUTION_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[dm.resOption, resolution === opt.key && { borderColor: opt.color, backgroundColor: opt.color + '08' }]}
                    onPress={() => setResolution(opt.key)}
                    activeOpacity={0.85}
                  >
                    <View style={[dm.resRadio, resolution === opt.key && { borderColor: opt.color }]}>
                      {resolution === opt.key && <View style={[dm.resRadioDot, { backgroundColor: opt.color }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[dm.resLabel, resolution === opt.key && { color: opt.color }]}>{opt.label}</Text>
                      <Text style={dm.resDesc}>{opt.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Partial amount */}
                {resolution === 'resolved_refund_partial' && (
                  <TextInput
                    style={dm.input}
                    keyboardType="numeric"
                    placeholder="Montant à rembourser (FCFA)"
                    placeholderTextColor="#9CA3AF"
                    value={partialAmount}
                    onChangeText={setPartial}
                  />
                )}

                {/* Admin notes */}
                <TextInput
                  style={[dm.input, { height: 88, textAlignVertical: 'top', marginTop: 12 }]}
                  multiline
                  placeholder="Notes admin (min. 10 caractères) — visible en interne uniquement"
                  placeholderTextColor="#9CA3AF"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            )}
          </ScrollView>
        )}

        {/* Resolve button */}
        {dispute && !resolved && (
          <View style={dm.footer}>
            <TouchableOpacity style={dm.resolveBtn} onPress={handleResolve} disabled={actionLoading}>
              {actionLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={dm.resolveBtnText}>Résoudre le litige</Text>}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function DRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={dm.drow}>
      <Ionicons name={icon as any} size={14} color="#9CA3AF" style={{ marginRight: 8, marginTop: 2 }} />
      <Text style={dm.drowLabel}>{label} :</Text>
      <Text style={dm.drowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function AdminDisputesScreen() {
  const navigation = useNavigation();
  const [disputes, setDisputes]  = useState<DisputeSummary[]>([]);
  const [loading, setLoading]    = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [filter, setFilter]      = useState<FilterKey>('open');
  const [selectedId, setSelected]= useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    try {
      // Fetch open, under_review, and resolved with a single request each
      const [openRes, reviewRes, resolvedRes] = await Promise.all([
        adminApi.listDisputes({ status: 'open',         limit: 50 }).then(r => (r.data as any).data ?? []),
        adminApi.listDisputes({ status: 'under_review', limit: 50 }).then(r => (r.data as any).data ?? []),
        adminApi.listDisputes({ limit: 50 }).then(r =>
          ((r.data as any).data ?? []).filter((d: DisputeSummary) => isResolved(d.status)),
        ),
      ]);
      setDisputes([...openRes, ...reviewRes, ...resolvedRes]);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les litiges');
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const onRefresh = useCallback(() => { setRefresh(true); fetchDisputes(); }, [fetchDisputes]);

  const filtered = disputes.filter(d => {
    if (filter === 'open')         return d.status === 'open';
    if (filter === 'under_review') return d.status === 'under_review';
    if (filter === 'resolved')     return isResolved(d.status);
    return true;
  });

  const counts = {
    open:         disputes.filter(d => d.status === 'open').length,
    under_review: disputes.filter(d => d.status === 'under_review').length,
    resolved:     disputes.filter(d => isResolved(d.status)).length,
  };

  return (
    <SafeAreaView style={sc.safe}>
      {/* Header */}
      <View style={sc.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={sc.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={sc.headerText}>
          <Text style={sc.title}>Litiges & Remboursements</Text>
          <Text style={sc.subtitle}>{disputes.length} litige{disputes.length !== 1 ? 's' : ''} au total</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={sc.tabs}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[sc.tab, filter === f.key && sc.tabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[sc.tabText, filter === f.key && sc.tabTextActive]}>
              {f.label}{counts[f.key] > 0 ? ` (${counts[f.key]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#1056E0" />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1056E0" />}
          contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
        >
          {filtered.length === 0 ? (
            <View style={sc.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={52} color="#D1FAE5" />
              <Text style={sc.emptyTitle}>Aucun litige {filter === 'open' ? 'ouvert' : filter === 'under_review' ? 'en cours' : 'résolu'}</Text>
            </View>
          ) : (
            filtered.map(d => {
              const cfg = STATUS_CONFIG[d.status];
              return (
                <TouchableOpacity
                  key={d.id}
                  style={sc.card}
                  onPress={() => setSelected(d.id)}
                  activeOpacity={0.8}
                >
                  <View style={[sc.iconWrap, { backgroundColor: (cfg?.color ?? '#6B7280') + '15' }]}>
                    <Ionicons name={(cfg?.icon ?? 'alert-circle') as any} size={22} color={cfg?.color ?? '#6B7280'} />
                  </View>
                  <View style={sc.cardBody}>
                    <Text style={sc.propertyName} numberOfLines={1}>
                      {d.booking?.property?.title ?? 'Propriété inconnue'}
                    </Text>
                    <Text style={sc.clientName}>
                      {d.booking?.client ? `${d.booking.client.firstName} ${d.booking.client.lastName}` : '—'}
                    </Text>
                    <Text style={sc.reason} numberOfLines={2}>{d.reason}</Text>
                    <View style={sc.meta}>
                      <Ionicons name="calendar-outline" size={11} color="#9CA3AF" />
                      <Text style={sc.metaText}>{formatDate(d.createdAt)}</Text>
                      {d.booking?.totalAmount != null ? (
                        <>
                          <Text style={sc.metaDot}>·</Text>
                          <Ionicons name="cash-outline" size={11} color="#9CA3AF" />
                          <Text style={sc.metaText}>{d.booking.totalAmount.toLocaleString('fr-CI')} FCFA</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <View style={sc.cardRight}>
                    <View style={[sc.badge, { backgroundColor: (cfg?.color ?? '#6B7280') + '18' }]}>
                      <Text style={[sc.badgeText, { color: cfg?.color ?? '#6B7280' }]}>{cfg?.label ?? d.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginTop: 6 }} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {selectedId && (
        <DisputeModal
          disputeId={selectedId}
          onClose={() => setSelected(null)}
          onResolved={fetchDisputes}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F8FAFC' },
  header:        { backgroundColor: '#1056E0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  backBtn:       { padding: 4 },
  headerText:    { flex: 1 },
  title:         { fontSize: 18, fontWeight: '800', color: '#fff' },
  subtitle:      { fontSize: 12, color: '#BFDBFE', marginTop: 1 },
  tabs:          { flexDirection: 'row', margin: 12, gap: 8 },
  tab:           { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff', alignItems: 'center' },
  tabActive:     { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  tabText:       { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },
  card:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  iconWrap:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  cardBody:      { flex: 1 },
  propertyName:  { fontSize: 14, fontWeight: '700', color: '#111827' },
  clientName:    { fontSize: 12, color: '#1056E0', fontWeight: '600', marginTop: 1 },
  reason:        { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 16 },
  meta:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText:      { fontSize: 10, color: '#9CA3AF' },
  metaDot:       { fontSize: 10, color: '#D1D5DB' },
  cardRight:     { alignItems: 'flex-end', marginLeft: 8 },
  badge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, maxWidth: 120 },
  badgeText:     { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: '#374151', marginTop: 16 },
});

const dm = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F8FAFC' },
  header:        { backgroundColor: '#1056E0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  backBtn:       { padding: 4 },
  headerTitle:   { flex: 1, fontSize: 17, fontWeight: '800', color: '#fff' },
  statusBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText:    { fontSize: 11, fontWeight: '700' },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:     { fontSize: 15, color: '#9CA3AF' },
  section:       { margin: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle:  { fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  drow:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 9 },
  drowLabel:     { fontSize: 13, color: '#6B7280', width: 130, flexShrink: 0 },
  drowValue:     { fontSize: 13, color: '#111827', fontWeight: '500', flex: 1 },
  reasonText:    { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  descText:      { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 8 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaText:      { fontSize: 11, color: '#9CA3AF' },
  metaDot:       { fontSize: 11, color: '#D1D5DB' },
  notesBox:      { marginTop: 12, backgroundColor: '#FEF9EE', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#D97706' },
  notesLabel:    { fontSize: 11, fontWeight: '700', color: '#D97706', marginBottom: 4 },
  notesText:     { fontSize: 12, color: '#78350F', lineHeight: 17 },
  msgBubble:     { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 10 },
  msgHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  msgAvatar:     { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1056E020', alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { fontSize: 12, fontWeight: '700', color: '#1056E0' },
  msgSender:     { flex: 1, fontSize: 12, fontWeight: '700', color: '#111827' },
  msgTime:       { fontSize: 10, color: '#9CA3AF' },
  msgContent:    { fontSize: 13, color: '#374151', lineHeight: 18 },
  resOption:     { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 10, gap: 12 },
  resRadio:      { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  resRadioDot:   { width: 10, height: 10, borderRadius: 5 },
  resLabel:      { fontSize: 14, fontWeight: '700', color: '#111827' },
  resDesc:       { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  input:         { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 8 },
  resolveBtn:    { backgroundColor: '#1056E0', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  resolveBtnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
});
