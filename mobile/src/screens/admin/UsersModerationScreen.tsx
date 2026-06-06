import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { adminApi } from '../../services/api/endpoints/adminApi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface KycUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  accountType?: string;  // mobile field from updated API
  role?: string;         // web-admin alias — same value
  status: string;
  createdAt: string;
  kycStatus?: string | null;  // direct status string from updated API
  professionalProfile?: { verificationStatus: string } | null;  // kept for KYC detail modal
}

interface KycDocument {
  id: string;
  type: string;
  url: string;
  uploadedAt: string;
  verifiedAt?: string | null;
  rejectedReason?: string | null;
}

interface KycProfile {
  id: string;
  businessName: string;
  rccm?: string | null;
  taxId?: string | null;
  touristLicense?: string | null;
  verificationStatus: string;
  documents: KycDocument[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  professional_hebergement: 'Hébergement',
  professional_hotel:       'Hôtel',
  professional_immobilier:  'Immobilier',
  restaurateur:             'Restaurant',
};

const ACCOUNT_TYPE_COLOR: Record<string, string> = {
  professional_hebergement: '#1056E0',
  professional_hotel:       '#7C3AED',
  professional_immobilier:  '#059669',
  restaurateur:             '#D97706',
};

const VERIFICATION_COLOR: Record<string, string> = {
  pending:  '#D97706',
  approved: '#059669',
  rejected: '#DC2626',
};

const VERIFICATION_LABEL: Record<string, string> = {
  pending:  'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
};

const DOC_TYPE_LABEL: Record<string, string> = {
  id_card:          "Carte d'identité",
  passport:         'Passeport',
  business_license: 'Licence commerciale',
  tax_certificate:  'Attestation fiscale',
  other:            'Autre document',
};

// kycStatus is the new direct field; professionalProfile.verificationStatus is the legacy path
function getVerifStatus(u: KycUser): string {
  return u.kycStatus ?? u.professionalProfile?.verificationStatus ?? 'pending';
}

function getAccountType(u: KycUser): string {
  return u.accountType ?? u.role ?? '';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const PRO_ROLES = ['professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'];

// ── Reject reason modal ────────────────────────────────────────────────────────

function RejectModal({
  visible,
  onCancel,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  const handleConfirm = () => {
    if (reason.trim().length < 10) {
      Alert.alert('Motif requis', 'Le motif doit contenir au moins 10 caractères.');
      return;
    }
    onConfirm(reason.trim());
    setReason('');
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={modal.backdrop}>
        <View style={modal.box}>
          <Text style={modal.title}>Motif de rejet</Text>
          <Text style={modal.sub}>Ce motif sera envoyé au professionnel par email et notification push.</Text>
          <TextInput
            style={modal.input}
            multiline
            numberOfLines={4}
            placeholder="Décrivez la raison du rejet (min. 10 caractères)…"
            placeholderTextColor="#9CA3AF"
            value={reason}
            onChangeText={setReason}
            textAlignVertical="top"
          />
          <View style={modal.row}>
            <TouchableOpacity style={modal.cancel} onPress={onCancel} disabled={loading}>
              <Text style={modal.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modal.confirm} onPress={handleConfirm} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" />
                       : <Text style={modal.confirmText}>Rejeter</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Image viewer modal ─────────────────────────────────────────────────────────

function ImageViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={iv.backdrop}>
        <TouchableOpacity style={iv.closeBtn} onPress={onClose}>
          <Ionicons name="close-circle" size={36} color="#fff" />
        </TouchableOpacity>
        <Image source={{ uri }} style={iv.img} resizeMode="contain" />
      </View>
    </Modal>
  );
}

// ── KYC Detail modal ───────────────────────────────────────────────────────────

function KycDetailModal({
  user,
  onClose,
  onApproved,
  onRejected,
}: {
  user: KycUser;
  onClose: () => void;
  onApproved: () => void;
  onRejected: () => void;
}) {
  const [profile, setProfile] = useState<KycProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getKycDocuments(user.id)
      .then(res => setProfile(res.data as KycProfile))
      .catch(() => Alert.alert('Erreur', 'Impossible de charger les documents KYC'))
      .finally(() => setLoading(false));
  }, [user.id]);

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await adminApi.approveKyc(user.id);
      Alert.alert('KYC approuvé', `${user.firstName} ${user.lastName} a été validé(e).`);
      onApproved();
      onClose();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible d\'approuver');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reason: string) => {
    setActionLoading('reject');
    try {
      await adminApi.rejectKyc(user.id, reason);
      Alert.alert('KYC refusé', `La demande de ${user.firstName} ${user.lastName} a été refusée.`);
      setShowRejectModal(false);
      onRejected();
      onClose();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de rejeter');
    } finally {
      setActionLoading(null);
    }
  };

  const verifStatus = getVerifStatus(user);
  const isPending   = verifStatus === 'pending';

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={det.safe}>
        {/* Header */}
        <View style={det.header}>
          <TouchableOpacity onPress={onClose} style={det.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={det.headerTitle} numberOfLines={1}>
            {user.firstName} {user.lastName}
          </Text>
          <View style={[det.statusBadge, { backgroundColor: (VERIFICATION_COLOR[verifStatus] ?? '#D97706') + '30' }]}>
            <Text style={[det.statusText, { color: VERIFICATION_COLOR[verifStatus] ?? '#D97706' }]}>
              {VERIFICATION_LABEL[verifStatus] ?? verifStatus}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Identity */}
          <View style={det.section}>
            <Text style={det.sectionTitle}>Identité</Text>
            <InfoRow icon="person-outline" label="Nom" value={`${user.firstName} ${user.lastName}`} />
            <InfoRow icon="mail-outline" label="Email" value={user.email} />
            {user.phone ? <InfoRow icon="call-outline" label="Téléphone" value={user.phone} /> : null}
            <InfoRow icon="calendar-outline" label="Inscrit le" value={formatDate(user.createdAt)} />
            <InfoRow
              icon="briefcase-outline"
              label="Type"
              value={ACCOUNT_TYPE_LABEL[getAccountType(user)] ?? getAccountType(user)}
            />
          </View>

          {/* Professional profile */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color="#1056E0" />
          ) : profile ? (
            <>
              <View style={det.section}>
                <Text style={det.sectionTitle}>Profil professionnel</Text>
                <InfoRow icon="business-outline" label="Raison sociale" value={profile.businessName} />
                {profile.rccm    ? <InfoRow icon="document-outline" label="RCCM"          value={profile.rccm} /> : null}
                {profile.taxId   ? <InfoRow icon="receipt-outline"   label="NIF / Taxe"   value={profile.taxId} /> : null}
                {profile.touristLicense ? <InfoRow icon="star-outline" label="Licence touristique" value={profile.touristLicense} /> : null}
              </View>

              {/* Documents KYC */}
              <View style={det.section}>
                <Text style={det.sectionTitle}>Documents KYC ({profile.documents.length})</Text>
                {profile.documents.length === 0 ? (
                  <Text style={det.noDoc}>Aucun document soumis</Text>
                ) : (
                  profile.documents.map(doc => (
                    <View key={doc.id} style={det.docCard}>
                      <TouchableOpacity onPress={() => setViewerUri(doc.url)} activeOpacity={0.85}>
                        <Image source={{ uri: doc.url }} style={det.docThumb} resizeMode="cover" />
                        <View style={det.docOverlay}>
                          <Ionicons name="expand-outline" size={20} color="#fff" />
                        </View>
                      </TouchableOpacity>
                      <View style={det.docInfo}>
                        <Text style={det.docType}>{DOC_TYPE_LABEL[doc.type] ?? doc.type}</Text>
                        <Text style={det.docDate}>Soumis le {formatDate(doc.uploadedAt)}</Text>
                        {doc.verifiedAt   ? <Text style={[det.docStatus, { color: '#059669' }]}>✓ Vérifié</Text> : null}
                        {doc.rejectedReason ? <Text style={[det.docStatus, { color: '#DC2626' }]}>✗ {doc.rejectedReason}</Text> : null}
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          ) : (
            <Text style={det.noDoc}>Profil professionnel introuvable</Text>
          )}
        </ScrollView>

        {/* Action buttons — only show for pending */}
        {isPending && (
          <View style={det.actions}>
            <TouchableOpacity
              style={det.rejectBtn}
              onPress={() => setShowRejectModal(true)}
              disabled={!!actionLoading}
            >
              {actionLoading === 'reject'
                ? <ActivityIndicator color="#DC2626" size="small" />
                : <Text style={det.rejectText}>✗ Rejeter</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={det.approveBtn}
              onPress={handleApprove}
              disabled={!!actionLoading}
            >
              {actionLoading === 'approve'
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={det.approveText}>✓ Approuver le KYC</Text>}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      <RejectModal
        visible={showRejectModal}
        onCancel={() => setShowRejectModal(false)}
        onConfirm={handleReject}
        loading={actionLoading === 'reject'}
      />

      {viewerUri && <ImageViewer uri={viewerUri} onClose={() => setViewerUri(null)} />}
    </Modal>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={det.infoRow}>
      <Ionicons name={icon as any} size={16} color="#6B7280" style={{ marginRight: 8, marginTop: 1 }} />
      <Text style={det.infoLabel}>{label} :</Text>
      <Text style={det.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ── Filter tabs ────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'pending',  label: 'En attente' },
  { key: 'approved', label: 'Approuvés'  },
  { key: 'rejected', label: 'Refusés'    },
] as const;

type FilterKey = typeof FILTERS[number]['key'];

// ── Main screen ────────────────────────────────────────────────────────────────

export default function UsersModerationScreen() {
  const navigation = useNavigation();
  const [users, setUsers] = useState<KycUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [selectedUser, setSelectedUser] = useState<KycUser | null>(null);
  const [searchText, setSearchText] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      // Fetch professional users across all pro roles and merge
      const results = await Promise.all(
        PRO_ROLES.map(role =>
          adminApi.listUsers({ role, limit: 100 })
            .then(r => (r.data as any).data as KycUser[])
            .catch(() => [] as KycUser[]),
        ),
      );
      const all = results.flat();
      // Deduplicate by id
      const seen = new Set<string>();
      const deduped = all.filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true; });
      setUsers(deduped);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    if (getVerifStatus(u) !== filter) return false;
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const counts = {
    pending:  users.filter(u => getVerifStatus(u) === 'pending').length,
    approved: users.filter(u => getVerifStatus(u) === 'approved').length,
    rejected: users.filter(u => getVerifStatus(u) === 'rejected').length,
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.title}>Modération KYC</Text>
          <Text style={s.subtitle}>Vérification des professionnels</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher par nom ou email…"
          placeholderTextColor="#9CA3AF"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter tabs */}
      <View style={s.tabs}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.tab, filter === f.key && s.tabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.tabText, filter === f.key && s.tabTextActive]}>
              {f.label}
              {counts[f.key] > 0 ? ` (${counts[f.key]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#1056E0" />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1056E0" />}
          contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="checkmark-circle-outline" size={52} color="#D1FAE5" />
              <Text style={s.emptyTitle}>
                {filter === 'pending' ? 'Aucun compte en attente' : `Aucun compte ${VERIFICATION_LABEL[filter].toLowerCase()}`}
              </Text>
              <Text style={s.emptyText}>
                {filter === 'pending' ? 'Tous les professionnels ont été traités.' : 'Aucun résultat pour ce filtre.'}
              </Text>
            </View>
          ) : (
            filtered.map(user => (
              <TouchableOpacity
                key={user.id}
                style={s.card}
                onPress={() => setSelectedUser(user)}
                activeOpacity={0.8}
              >
                {/* Avatar */}
                <View style={[s.avatar, { backgroundColor: (ACCOUNT_TYPE_COLOR[getAccountType(user)] ?? '#1056E0') + '20' }]}>
                  <Text style={[s.avatarText, { color: ACCOUNT_TYPE_COLOR[getAccountType(user)] ?? '#1056E0' }]}>
                    {(user.firstName[0] ?? '?').toUpperCase()}
                  </Text>
                </View>

                {/* Info */}
                <View style={s.cardBody}>
                  <View style={s.cardRow}>
                    <Text style={s.name}>{user.firstName} {user.lastName}</Text>
                    <View style={[s.typeBadge, { backgroundColor: (ACCOUNT_TYPE_COLOR[getAccountType(user)] ?? '#1056E0') + '15' }]}>
                      <Text style={[s.typeText, { color: ACCOUNT_TYPE_COLOR[getAccountType(user)] ?? '#1056E0' }]}>
                        {ACCOUNT_TYPE_LABEL[getAccountType(user)] ?? getAccountType(user)}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.email} numberOfLines={1}>{user.email}</Text>
                  <View style={s.cardMeta}>
                    <Ionicons name="calendar-outline" size={11} color="#9CA3AF" />
                    <Text style={s.metaText}>Inscrit le {formatDate(user.createdAt)}</Text>
                    {user.phone ? (
                      <>
                        <Text style={s.metaDot}>·</Text>
                        <Ionicons name="call-outline" size={11} color="#9CA3AF" />
                        <Text style={s.metaText}>{user.phone}</Text>
                      </>
                    ) : null}
                  </View>
                </View>

                {/* Status + chevron */}
                <View style={s.cardRight}>
                  <View style={[s.verifBadge, { backgroundColor: (VERIFICATION_COLOR[getVerifStatus(user)] ?? '#D97706') + '20' }]}>
                    <Text style={[s.verifText, { color: VERIFICATION_COLOR[getVerifStatus(user)] ?? '#D97706' }]}>
                      {VERIFICATION_LABEL[getVerifStatus(user)] ?? getVerifStatus(user)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginTop: 6 }} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {selectedUser && (
        <KycDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onApproved={fetchUsers}
          onRejected={fetchUsers}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F8FAFC' },
  header:        { backgroundColor: '#1056E0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  backBtn:       { padding: 4 },
  headerText:    { flex: 1 },
  title:         { fontSize: 18, fontWeight: '800', color: '#fff' },
  subtitle:      { fontSize: 12, color: '#BFDBFE', marginTop: 1 },
  searchWrap:    { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  searchIcon:    {},
  searchInput:   { flex: 1, fontSize: 14, color: '#111827' },
  tabs:          { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8, gap: 8 },
  tab:           { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff', alignItems: 'center' },
  tabActive:     { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  tabText:       { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  avatar:        { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:    { fontSize: 18, fontWeight: '800' },
  cardBody:      { flex: 1 },
  cardRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name:          { fontSize: 15, fontWeight: '700', color: '#111827' },
  typeBadge:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typeText:      { fontSize: 10, fontWeight: '700' },
  email:         { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText:      { fontSize: 10, color: '#9CA3AF' },
  metaDot:       { fontSize: 10, color: '#D1D5DB' },
  cardRight:     { alignItems: 'flex-end', marginLeft: 8 },
  verifBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  verifText:     { fontSize: 10, fontWeight: '700' },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 16, textAlign: 'center' },
  emptyText:     { fontSize: 13, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
});

const det = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#F8FAFC' },
  header:     { backgroundColor: '#1056E0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  backBtn:    { padding: 4 },
  headerTitle:{ flex: 1, fontSize: 17, fontWeight: '800', color: '#fff' },
  statusBadge:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  section:    { margin: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  infoLabel:  { fontSize: 13, color: '#6B7280', width: 130, flexShrink: 0 },
  infoValue:  { fontSize: 13, color: '#111827', fontWeight: '500', flex: 1 },
  noDoc:      { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
  docCard:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  docThumb:   { width: 72, height: 54, borderRadius: 8, backgroundColor: '#F3F4F6' },
  docOverlay: { position: 'absolute', top: 0, left: 0, width: 72, height: 54, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  docInfo:    { flex: 1 },
  docType:    { fontSize: 13, fontWeight: '600', color: '#111827' },
  docDate:    { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  docStatus:  { fontSize: 11, fontWeight: '600', marginTop: 2 },
  actions:    { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 8 },
  rejectBtn:  { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#DC2626', alignItems: 'center' },
  rejectText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  approveBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#059669', alignItems: 'center' },
  approveText:{ fontSize: 15, fontWeight: '700', color: '#fff' },
});

const modal = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  box:         { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  title:       { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 6 },
  sub:         { fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 18 },
  input:       { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', minHeight: 96, marginBottom: 16 },
  row:         { flexDirection: 'row', gap: 12 },
  cancel:      { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelText:  { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  confirm:     { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#DC2626', alignItems: 'center' },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

const iv = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 48, right: 16, zIndex: 10 },
  img:      { width: '100%', height: '80%' },
});
