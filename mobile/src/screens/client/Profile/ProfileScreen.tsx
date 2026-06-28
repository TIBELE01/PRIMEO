// ProfileScreen — écran principal du profil utilisateur client.
// Organisé en sections accordéon (une seule ouverte à la fois) :
//   Informations · Mon compte · Avis et évaluations · Soutien et aide ·
//   Notifications · Zone sensible.
// Les sections « Apparence » et « Dispositif d'affichage / Devise » ont été
// retirées (réintégrables ultérieurement). Les favoris vivent désormais dans la
// barre d'onglets principale, plus dans le profil.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert, TextInput, Modal, Image, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClientScreenProps } from '../../../navigation/types';
import { usersApi } from '../../../services/api/endpoints/users';
import { useAuthStore } from '../../../store/authStore';
import { socketService } from '../../../services/socket/socketService';
import {
  ProfileAccordion,
  ProfileActionRow,
  ProfileInfoRow,
  useSingleAccordion,
} from '../../../components/ui/ProfileAccordion';
import { PageHeader } from '../../../components/layout/PageHeader';

// ── Constantes ──────────────────────────────────────────────────────────────

const NOTIF_KEY = '@primeo_notif_prefs';
const ACCENT = '#1056E0';

type Props = ClientScreenProps<'Profile'>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleBadgeLabel(role: string): string {
  const map: Record<string, string> = {
    client: 'Client',
    professional_hebergement: 'Pro · Hébergement',
    professional_hotel: 'Pro · Hôtel',
    professional_immobilier: 'Pro · Immobilier',
    restaurateur: 'Restaurateur',
    admin: 'Administrateur',
  };
  return map[role] ?? role;
}

function roleBadgeColor(role: string): string {
  if (role === 'client') return '#1056E0';
  if (role === 'admin') return '#7C3AED';
  return '#0D9488';
}

// ── Écran principal ───────────────────────────────────────────────────────────

export function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(false);

  // Accordéon : seule « Informations » est ouverte au montage.
  const { openKey, toggle } = useSingleAccordion('informations');

  // Préférences de notification (persistées localement)
  const [notifBookings, setNotifBookings] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifPromos, setNotifPromos] = useState(false);

  // Modal de désactivation
  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
  const [deactivateDuration, setDeactivateDuration] = useState<string | null>(null);
  // Modal de suppression (mot de passe)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [actionLoading, setActionLoading] = useState(false);

  // Chargement des préférences persistées
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((raw) => {
      if (!raw) return;
      try {
        const prefs = JSON.parse(raw);
        setNotifBookings(prefs.bookings ?? true);
        setNotifMessages(prefs.messages ?? true);
        setNotifPromos(prefs.promos ?? false);
      } catch { /* préférences corrompues ignorées */ }
    }).catch(() => null);
  }, []);

  // Chargement du profil au montage (synchronisation serveur)
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.getProfile();
      const profileData = res.data?.data ?? res.data;
      if (profileData) {
        setUser({ ...user, ...profileData } as typeof user);
      }
    } catch {
      // Profil local conservé en cas d'erreur réseau
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveNotifPref = async (key: string, value: boolean) => {
    const prefs = { bookings: notifBookings, messages: notifMessages, promos: notifPromos, [key]: value };
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(prefs)).catch(() => null);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color={ACCENT} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—';
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const detailUser = user as typeof user & {
    dateOfBirth?: string;
    birthDate?: string;
    gender?: string;
  };
  const genderLabel =
    detailUser.gender === 'male' ? 'Homme'
    : detailUser.gender === 'female' ? 'Femme'
    : detailUser.gender === 'other' ? 'Autre'
    : undefined;

  // ── Actions dangereuses ──────────────────────────────────────────────────

  const handleDeactivate = () => {
    setDeactivateDuration(null);
    setDeactivateModalVisible(true);
  };

  const confirmDeactivate = async () => {
    if (!deactivateDuration) {
      Alert.alert('Durée requise', 'Veuillez choisir une durée.');
      return;
    }
    setActionLoading(true);
    try {
      await usersApi.deactivate({ duration: deactivateDuration });
      setDeactivateModalVisible(false);
      socketService.disconnect();
      await logout();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      Alert.alert('Erreur', err.response?.data?.error ?? err.response?.data?.message ?? 'Impossible de désactiver le compte.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteStep(1);
    setDeletePassword('');
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (deletePassword.length < 4) {
      Alert.alert('Mot de passe requis', 'Saisissez votre mot de passe pour confirmer.');
      return;
    }
    if (deleteStep === 1) {
      // Deuxième confirmation
      setDeleteStep(2);
      return;
    }
    setActionLoading(true);
    try {
      await usersApi.deleteAccount({ password: deletePassword });
      setDeleteModalVisible(false);
      socketService.disconnect();
      await logout();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      Alert.alert('Erreur', err.response?.data?.error ?? err.response?.data?.message ?? 'Impossible de supprimer le compte.');
    } finally {
      setActionLoading(false);
    }
  };

  // Export RGPD des données personnelles — traité par le support (pas de
  // génération automatique côté client pour l'instant).
  const handleDataExport = () => {
    Alert.alert(
      'Exporter mes données personnelles',
      'Conformément au RGPD, vous pouvez demander une copie de vos données personnelles. La demande est traitée par notre équipe et le fichier vous est envoyé par email.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Contacter le support', onPress: () => navigation.navigate('SupportChatbot') },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: () => {
          socketService.disconnect();
          logout().catch(() => null);
        },
      },
    ]);
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1056E0" />
      <PageHeader title="Mon profil" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* En-tête : avatar + nom + badge rôle */}
        <View style={styles.header}>
          {loading && <ActivityIndicator color={ACCENT} style={styles.loadingIndicator} />}
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: roleBadgeColor(user.role) }]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.headerName}>{fullName}</Text>
          <Text style={styles.headerEmail}>{user.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleBadgeColor(user.role) + '22' }]}>
            <Text style={[styles.roleBadgeText, { color: roleBadgeColor(user.role) }]}>
              {roleBadgeLabel(user.role)}
            </Text>
          </View>
          {user.isVerified && (
            <View style={[styles.kycBadge, styles.kycApproved]}>
              <Text style={styles.kycBadgeText}>✓ Compte vérifié</Text>
            </View>
          )}
        </View>

        {/* ── 1. Informations (ouverte par défaut) ── */}
        <ProfileAccordion
          title="Informations" icon="person-circle-outline" color={ACCENT}
          open={openKey === 'informations'} onToggle={() => toggle('informations')}
        >
          <ProfileInfoRow icon="mail-outline" label="Email" value={user.email} color={ACCENT} />
          <ProfileInfoRow icon="call-outline" label="Téléphone" value={user.phone} color={ACCENT} />
          <ProfileInfoRow icon="gift-outline" label="Date de naissance" value={detailUser.birthDate ?? detailUser.dateOfBirth} color={ACCENT} />
          <ProfileInfoRow icon="male-female-outline" label="Genre" value={genderLabel} color={ACCENT} />
          <ProfileActionRow icon="create-outline" label="Modifier mes informations" color={ACCENT} last onPress={() => navigation.navigate('EditProfile')} />
        </ProfileAccordion>

        {/* ── 2. Mon compte ── */}
        <ProfileAccordion
          title="Mon compte" icon="settings-outline" color={ACCENT}
          open={openKey === 'compte'} onToggle={() => toggle('compte')}
        >
          <ProfileActionRow icon="key-outline" label="Changer de mot de passe" color={ACCENT} onPress={() => navigation.navigate('ChangePassword')} />
          <ProfileActionRow
            icon="shield-checkmark-outline" label="Authentification 2FA" color={ACCENT}
            value={user.twoFactorEnabled ? 'Activée' : 'Désactivée'}
            onPress={() => navigation.navigate('TwoFactorSetup')}
          />
          <ProfileActionRow icon="gift-outline" label="Parrainage" color={ACCENT} onPress={() => navigation.navigate('Referral')} />
          <ProfileActionRow icon="pause-circle-outline" label="Désactiver mon compte" color={ACCENT} last danger onPress={handleDeactivate} />
        </ProfileAccordion>

        {/* ── 3. Avis et évaluations ── */}
        <ProfileAccordion
          title="Avis et évaluations" icon="star-outline" color={ACCENT}
          open={openKey === 'avis'} onToggle={() => toggle('avis')}
        >
          <ProfileActionRow icon="chatbox-ellipses-outline" label="Mes avis publiés" color={ACCENT} onPress={() => navigation.navigate('MyReviews')} />
          <ProfileActionRow icon="person-outline" label="Évaluations reçues" color={ACCENT} last onPress={() => navigation.navigate('ReceivedRatings')} />
        </ProfileAccordion>

        {/* ── 4. Soutien et aide ── */}
        <ProfileAccordion
          title="Soutien et aide" icon="help-buoy-outline" color={ACCENT}
          open={openKey === 'support'} onToggle={() => toggle('support')}
        >
          <ProfileActionRow icon="chatbubbles-outline" label="Assistant Primeo" color={ACCENT} onPress={() => navigation.navigate('SupportChatbot')} />
          <ProfileActionRow icon="ticket-outline" label="Mes tickets de support" color={ACCENT} onPress={() => navigation.navigate('SupportTickets')} />
          <ProfileActionRow icon="warning-outline" label="Mes litiges" color={ACCENT} onPress={() => navigation.navigate('DisputeList')} />
          <ProfileActionRow icon="document-text-outline" label="Centre d'aide & infos légales" color={ACCENT} last onPress={() => navigation.navigate('LegalLinks')} />
        </ProfileAccordion>

        {/* ── 5. Notifications ── */}
        <ProfileAccordion
          title="Notifications" icon="notifications-outline" color={ACCENT}
          open={openKey === 'notifications'} onToggle={() => toggle('notifications')}
        >
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Réservations</Text>
            <Switch
              value={notifBookings}
              onValueChange={(v) => { setNotifBookings(v); saveNotifPref('bookings', v); }}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={notifBookings ? ACCENT : '#9CA3AF'}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Messages</Text>
            <Switch
              value={notifMessages}
              onValueChange={(v) => { setNotifMessages(v); saveNotifPref('messages', v); }}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={notifMessages ? ACCENT : '#9CA3AF'}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Offres & promotions</Text>
            <Switch
              value={notifPromos}
              onValueChange={(v) => { setNotifPromos(v); saveNotifPref('promos', v); }}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={notifPromos ? ACCENT : '#9CA3AF'}
            />
          </View>
        </ProfileAccordion>

        {/* ── 6. Zone sensible ── */}
        <ProfileAccordion
          title="Zone sensible" icon="alert-circle-outline" color={ACCENT} danger
          open={openKey === 'sensible'} onToggle={() => toggle('sensible')}
        >
          <ProfileActionRow icon="download-outline" label="Exporter mes données personnelles" color={ACCENT} onPress={handleDataExport} />
          <ProfileActionRow icon="trash-outline" label="Supprimer mon compte" color={ACCENT} last danger onPress={handleDeleteAccount} />
        </ProfileAccordion>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}
          accessibilityRole="button" accessibilityLabel="Se déconnecter">
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.version}>PRIMEO v1.0.0</Text>
      </ScrollView>

      {/* Modal désactivation */}
      <Modal visible={deactivateModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Désactiver le compte</Text>
            <Text style={styles.modalSubtitle}>
              Choisissez la durée de désactivation. Votre compte sera temporairement inaccessible.
            </Text>
            {(['1_week', '1_month', 'indefinite'] as const).map((dur) => {
              const labels: Record<string, string> = { '1_week': '1 semaine', '1_month': '1 mois', indefinite: 'Indéfiniment' };
              return (
                <TouchableOpacity
                  key={dur}
                  style={[styles.durationBtn, deactivateDuration === dur && styles.durationBtnActive]}
                  onPress={() => setDeactivateDuration(dur)}
                  accessibilityRole="radio"
                  accessibilityLabel={labels[dur]}
                  accessibilityState={{ selected: deactivateDuration === dur }}
                >
                  <Text style={[styles.durationLabel, deactivateDuration === dur && styles.durationLabelActive]}>
                    {labels[dur]}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDeactivateModalVisible(false)}
                accessibilityRole="button" accessibilityLabel="Annuler">
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, styles.btnDanger]}
                onPress={confirmDeactivate}
                disabled={actionLoading}
                accessibilityRole="button"
                accessibilityLabel="Confirmer la désactivation"
                accessibilityState={{ disabled: actionLoading, busy: actionLoading }}
              >
                {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal suppression */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {deleteStep === 1 ? 'Supprimer le compte' : '⚠️ Confirmation finale'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {deleteStep === 1
                ? 'Cette action est irréversible. Toutes vos données seront supprimées. Saisissez votre mot de passe pour continuer.'
                : 'Êtes-vous vraiment sûr ? Cette suppression est définitive et ne peut pas être annulée.'}
            </Text>
            {deleteStep === 1 && (
              <TextInput
                style={styles.modalInput}
                placeholder="Mot de passe actuel"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteStep(1);
                  setDeletePassword('');
                }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, styles.btnDanger]}
                onPress={confirmDelete}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {deleteStep === 1 ? 'Continuer' : 'Supprimer définitivement'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  scroll: { paddingBottom: 80 },
  loadingIndicator: { position: 'absolute', top: 12, right: 12 },

  // En-tête
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 14 },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarInitials: { color: '#fff', fontSize: 34, fontWeight: '800' },
  headerName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  headerEmail: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 8 },
  roleBadgeText: { fontSize: 13, fontWeight: '700' },
  kycBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginTop: 4 },
  kycApproved: { backgroundColor: '#D1FAE5' },
  kycBadgeText: { fontSize: 12, fontWeight: '700', color: '#374151' },

  // Notifications (switches)
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F4F6FB' },
  switchLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },

  // Déconnexion
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  logoutText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },
  version: { textAlign: 'center', fontSize: 12, color: '#D1D5DB', marginTop: 12 },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 20,
  },
  durationBtn: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  durationBtnActive: { borderColor: '#1056E0', backgroundColor: '#EFF6FF' },
  durationLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },
  durationLabelActive: { color: '#1056E0', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelText: { color: '#374151', fontWeight: '700', fontSize: 15 },
  modalConfirm: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDanger: { backgroundColor: '#EF4444' },
});
