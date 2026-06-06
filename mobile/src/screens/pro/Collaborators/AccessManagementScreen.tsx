// Access management screen — co-manager invitations (§7.11, Premium only)
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput, Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collaboratorsApi, CollaboratorRole } from '../../../services/api/endpoints/collaboratorsApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GuestUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

interface Collaborator {
  id: string;
  guestUser: GuestUser;
  role: CollaboratorRole;
  isActive: boolean;
  invitedAt: string;
  acceptedAt?: string;
}

interface PendingInvitation {
  id: string;
  role: CollaboratorRole;
  invitedAt: string;
  profile: {
    id: string;
    businessName: string;
    city?: string;
    user: { firstName: string; lastName: string; email: string };
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLES: { value: CollaboratorRole; label: string; description: string }[] = [
  { value: 'admin',  label: 'Administrateur', description: 'Tous les droits, peut gérer les co-gérants' },
  { value: 'editor', label: 'Éditeur',        description: 'Modifier les annonces et gérer les réservations' },
  { value: 'reader', label: 'Lecteur',        description: 'Consultation uniquement' },
];

function roleLabel(role: CollaboratorRole): string {
  return ROLES.find(r => r.value === role)?.label ?? role;
}

function roleColor(role: CollaboratorRole): string {
  switch (role) {
    case 'admin':  return '#7C3AED';
    case 'editor': return '#2563EB';
    case 'reader': return '#6B7280';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CollaboratorCard({
  item,
  onChangeRole,
  onRevoke,
}: {
  item: Collaborator;
  onChangeRole: (id: string, current: CollaboratorRole) => void;
  onRevoke: (id: string, name: string) => void;
}) {
  const name = `${item.guestUser.firstName} ${item.guestUser.lastName}`;
  const color = roleColor(item.role);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{name}</Text>
          <Text style={styles.cardEmail}>{item.guestUser.email}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: color + '20', borderColor: color }]}>
          <Text style={[styles.roleBadgeText, { color }]}>{roleLabel(item.role)}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>
          {item.isActive
            ? `Membre depuis ${formatDate(item.acceptedAt ?? item.invitedAt)}`
            : `Invité le ${formatDate(item.invitedAt)} — en attente`}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onChangeRole(item.id, item.role)}
          >
            <Ionicons name="swap-horizontal-outline" size={18} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { marginLeft: 8 }]}
            onPress={() => onRevoke(item.id, name)}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function PendingInvitationCard({
  item,
  onAccept,
}: {
  item: PendingInvitation;
  onAccept: (id: string) => void;
}) {
  return (
    <View style={[styles.card, styles.inviteCard]}>
      <View style={styles.cardHeader}>
        <Ionicons name="business-outline" size={28} color="#1056E0" style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.profile.businessName}</Text>
          <Text style={styles.cardEmail}>
            {item.profile.user.firstName} {item.profile.user.lastName}
          </Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: roleColor(item.role) + '20', borderColor: roleColor(item.role) }]}>
          <Text style={[styles.roleBadgeText, { color: roleColor(item.role) }]}>{roleLabel(item.role)}</Text>
        </View>
      </View>
      <Text style={styles.cardDate}>Invité le {formatDate(item.invitedAt)}</Text>
      <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(item.id)}>
        <Text style={styles.acceptBtnText}>Accepter via code</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AccessManagementScreen() {
  const [tab, setTab] = useState<'team' | 'invitations'>('team');

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPremium, setIsPremium] = useState(true);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('editor');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Role change modal
  const [roleModal, setRoleModal] = useState<{ id: string; current: CollaboratorRole } | null>(null);

  // Accept invitation by token
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptToken, setAcceptToken] = useState('');
  const [acceptLoading, setAcceptLoading] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [collabRes, inviteRes] = await Promise.allSettled([
        collaboratorsApi.list(),
        collaboratorsApi.myInvitations(),
      ]);

      if (collabRes.status === 'fulfilled') {
        const data = collabRes.value.data?.data ?? collabRes.value.data ?? [];
        setCollaborators(Array.isArray(data) ? data : []);
        setIsPremium(true);
      } else {
        const status = (collabRes.reason as { response?: { status?: number } })?.response?.status;
        if (status === 403) setIsPremium(false);
      }

      if (inviteRes.status === 'fulfilled') {
        const data = inviteRes.value.data?.data ?? inviteRes.value.data ?? [];
        setInvitations(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      Alert.alert('Email invalide', 'Veuillez entrer une adresse email valide.');
      return;
    }
    setInviteLoading(true);
    try {
      await collaboratorsApi.invite({ email: inviteEmail.trim().toLowerCase(), role: inviteRole });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('editor');
      Alert.alert('Invitation envoyée', `Un email d'invitation a été envoyé à ${inviteEmail.trim()}.`);
      load(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      Alert.alert('Erreur', msg ?? 'Impossible d\'envoyer l\'invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleChangeRole = async (id: string, newRole: CollaboratorRole) => {
    try {
      await collaboratorsApi.updateRole(id, newRole);
      setCollaborators(prev => prev.map(c => c.id === id ? { ...c, role: newRole } : c));
      setRoleModal(null);
    } catch {
      Alert.alert('Erreur', 'Impossible de modifier le rôle.');
    }
  };

  const handleRevoke = (id: string, name: string) => {
    Alert.alert(
      'Révoquer l\'accès',
      `Voulez-vous retirer l'accès de ${name} ? Cette action est immédiate.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Révoquer',
          style: 'destructive',
          onPress: async () => {
            try {
              await collaboratorsApi.revoke(id);
              setCollaborators(prev => prev.filter(c => c.id !== id));
            } catch {
              Alert.alert('Erreur', 'Impossible de révoquer l\'accès.');
            }
          },
        },
      ],
    );
  };

  const handleAcceptByToken = async () => {
    if (!acceptToken.trim()) return;
    setAcceptLoading(true);
    try {
      await collaboratorsApi.accept(acceptToken.trim());
      setShowAcceptModal(false);
      setAcceptToken('');
      Alert.alert('Succès', 'Invitation acceptée. Vous faites maintenant partie de l\'équipe !');
      load(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      Alert.alert('Erreur', msg ?? 'Code invalide ou expiré.');
    } finally {
      setAcceptLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Gestion des accès</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1056E0" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestion des accès</Text>
        {isPremium && tab === 'team' && (
          <TouchableOpacity style={styles.inviteHeaderBtn} onPress={() => setShowInviteModal(true)}>
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.inviteHeaderBtnText}>Inviter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'team' && styles.tabActive]}
          onPress={() => setTab('team')}
        >
          <Text style={[styles.tabText, tab === 'team' && styles.tabTextActive]}>Mon équipe</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'invitations' && styles.tabActive]}
          onPress={() => setTab('invitations')}
        >
          <Text style={[styles.tabText, tab === 'invitations' && styles.tabTextActive]}>
            Mes invitations{invitations.length > 0 ? ` (${invitations.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#1056E0" />}
      >
        {/* ── Team tab ── */}
        {tab === 'team' && (
          <>
            {!isPremium && (
              <View style={styles.premiumBanner}>
                <Ionicons name="lock-closed-outline" size={24} color="#7C3AED" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.premiumTitle}>Fonctionnalité Premium</Text>
                  <Text style={styles.premiumDesc}>
                    La gestion multi-utilisateurs est disponible uniquement avec le plan Premium.
                    Passez à Premium pour inviter jusqu'à 10 co-gérants.
                  </Text>
                </View>
              </View>
            )}

            {isPremium && (
              <>
                <View style={styles.sectionInfo}>
                  <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                  <Text style={styles.sectionInfoText}>
                    Gérez qui a accès à votre espace professionnel. Jusqu'à 10 co-gérants.
                  </Text>
                </View>

                {collaborators.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>Aucun co-gérant</Text>
                    <Text style={styles.emptyDesc}>
                      Invitez des collaborateurs pour gérer votre espace ensemble.
                    </Text>
                    <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowInviteModal(true)}>
                      <Text style={styles.emptyBtnText}>Inviter un co-gérant</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  collaborators.map(item => (
                    <CollaboratorCard
                      key={item.id}
                      item={item}
                      onChangeRole={(id, current) => setRoleModal({ id, current })}
                      onRevoke={handleRevoke}
                    />
                  ))
                )}
              </>
            )}
          </>
        )}

        {/* ── Invitations tab ── */}
        {tab === 'invitations' && (
          <>
            <TouchableOpacity style={styles.tokenAcceptBtn} onPress={() => setShowAcceptModal(true)}>
              <Ionicons name="key-outline" size={18} color="#1056E0" />
              <Text style={styles.tokenAcceptBtnText}>Entrer un code d'invitation</Text>
            </TouchableOpacity>

            {invitations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="mail-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Aucune invitation en attente</Text>
                <Text style={styles.emptyDesc}>
                  Vos invitations à rejoindre des espaces professionnels apparaîtront ici.
                </Text>
              </View>
            ) : (
              invitations.map(item => (
                <PendingInvitationCard
                  key={item.id}
                  item={item}
                  onAccept={() => setShowAcceptModal(true)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* ── Invite modal ── */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inviter un co-gérant</Text>
              <TouchableOpacity onPress={() => { setShowInviteModal(false); setInviteEmail(''); }}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Adresse email *</Text>
            <TextInput
              style={styles.input}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="exemple@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.fieldLabel}>Rôle *</Text>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleOption, inviteRole === r.value && styles.roleOptionActive]}
                onPress={() => setInviteRole(r.value)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleOptionTitle, inviteRole === r.value && { color: '#1056E0' }]}>
                    {r.label}
                  </Text>
                  <Text style={styles.roleOptionDesc}>{r.description}</Text>
                </View>
                {inviteRole === r.value && (
                  <Ionicons name="checkmark-circle" size={20} color="#1056E0" />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.submitBtn, inviteLoading && { opacity: 0.7 }]}
              onPress={handleInvite}
              disabled={inviteLoading}
            >
              {inviteLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Envoyer l'invitation</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Role change modal ── */}
      <Modal visible={!!roleModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le rôle</Text>
              <TouchableOpacity onPress={() => setRoleModal(null)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleOption, roleModal?.current === r.value && styles.roleOptionActive]}
                onPress={() => roleModal && handleChangeRole(roleModal.id, r.value)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleOptionTitle, roleModal?.current === r.value && { color: '#1056E0' }]}>
                    {r.label}
                  </Text>
                  <Text style={styles.roleOptionDesc}>{r.description}</Text>
                </View>
                {roleModal?.current === r.value && (
                  <Ionicons name="checkmark-circle" size={20} color="#1056E0" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Accept by token modal ── */}
      <Modal visible={showAcceptModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Accepter une invitation</Text>
              <TouchableOpacity onPress={() => { setShowAcceptModal(false); setAcceptToken(''); }}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={styles.tokenDesc}>
              Collez le code d'invitation reçu par email pour rejoindre l'espace professionnel.
            </Text>
            <TextInput
              style={[styles.input, { fontFamily: 'monospace', fontSize: 12 }]}
              value={acceptToken}
              onChangeText={setAcceptToken}
              placeholder="Collez votre code d'invitation ici"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[styles.submitBtn, acceptLoading && { opacity: 0.7 }]}
              onPress={handleAcceptByToken}
              disabled={acceptLoading}
            >
              {acceptLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Accepter l'invitation</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F9FAFB' },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title:           { fontSize: 20, fontWeight: '700', color: '#1056E0' },
  inviteHeaderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1056E0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  inviteHeaderBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  tabs:            { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab:             { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:       { borderBottomWidth: 2, borderBottomColor: '#1056E0' },
  tabText:         { fontSize: 14, color: '#6B7280' },
  tabTextActive:   { color: '#1056E0', fontWeight: '600' },

  content:         { padding: 16, paddingBottom: 40 },

  sectionInfo:     { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0FDF4', borderRadius: 8, padding: 12, marginBottom: 16, gap: 8 },
  sectionInfoText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },

  premiumBanner:   { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F3E8FF', borderRadius: 12, padding: 16, marginBottom: 16 },
  premiumTitle:    { fontSize: 15, fontWeight: '700', color: '#7C3AED', marginBottom: 4 },
  premiumDesc:     { fontSize: 13, color: '#6D28D9', lineHeight: 18 },

  card:            { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  inviteCard:      { borderLeftWidth: 3, borderLeftColor: '#1056E0' },
  cardHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar:          { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:      { color: '#fff', fontWeight: '700', fontSize: 16 },
  cardName:        { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardEmail:       { fontSize: 13, color: '#6B7280', marginTop: 2 },
  roleBadge:       { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  roleBadgeText:   { fontSize: 11, fontWeight: '700' },
  cardFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDate:        { fontSize: 12, color: '#9CA3AF' },
  cardActions:     { flexDirection: 'row', alignItems: 'center' },
  actionBtn:       { padding: 6 },
  acceptBtn:       { marginTop: 10, backgroundColor: '#1056E0', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  acceptBtnText:   { color: '#fff', fontWeight: '600', fontSize: 14 },

  tokenAcceptBtn:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 10, padding: 14, marginBottom: 16, gap: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  tokenAcceptBtnText: { fontSize: 14, fontWeight: '600', color: '#1056E0' },

  emptyState:      { alignItems: 'center', paddingTop: 48 },
  emptyTitle:      { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptyDesc:       { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 6, paddingHorizontal: 24 },
  emptyBtn:        { marginTop: 20, backgroundColor: '#1056E0', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },

  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:           { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:      { fontSize: 18, fontWeight: '700', color: '#111827' },

  fieldLabel:      { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input:           { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#F9FAFB' },

  roleOption:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, marginBottom: 8 },
  roleOptionActive:{ borderColor: '#1056E0', backgroundColor: '#F0FDF4' },
  roleOptionTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  roleOptionDesc:  { fontSize: 12, color: '#6B7280', marginTop: 2 },

  submitBtn:       { backgroundColor: '#1056E0', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  submitBtnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },

  tokenDesc:       { fontSize: 14, color: '#6B7280', marginBottom: 12, lineHeight: 20 },
});
