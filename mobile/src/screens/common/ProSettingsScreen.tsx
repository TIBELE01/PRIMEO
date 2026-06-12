// ProSettingsScreen — profil / paramètres des comptes professionnels
// (résidences, hôtels, immobilier, restaurants). Organisé en sections accordéon
// (une seule ouverte à la fois) :
//   Informations professionnelles · Mon compte · Avis et évaluations ·
//   Soutien et aide · Notifications · Zone sensible.
// Les fonctionnalités métier (annonces, réservations, abonnement, boosts,
// exports) restent dans leurs propres onglets — elles ne sont plus dupliquées
// ici. Seul l'écran de profil est concerné.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Modal, TextInput, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useProTheme } from '../../hooks/useProTheme';
import { usersApi } from '../../services/api/endpoints/users';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socket/socketService';
import {
  ProfileAccordion,
  ProfileActionRow,
  ProfileInfoRow,
  useSingleAccordion,
} from '../../components/ui/ProfileAccordion';

const ROLE_LABELS: Record<string, string> = {
  professional_hebergement: 'Professionnel — Résidence',
  professional_hotel:       'Professionnel — Hôtel',
  professional_immobilier:  'Professionnel — Immobilier',
  restaurateur:             'Professionnel — Restaurant',
};

export default function ProSettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const theme = useProTheme();
  const accent = theme.primary;

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Accordéon : seule « Informations professionnelles » est ouverte au montage.
  const { openKey, toggle } = useSingleAccordion('infos-pro');

  // Modal de désactivation
  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
  const [deactivateDuration, setDeactivateDuration] = useState<string | null>(null);
  // Modal de suppression (mot de passe)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [actionLoading, setActionLoading] = useState(false);

  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? 'Compte professionnel';
  const pro = (user ?? {}) as typeof user & {
    businessName?: string;
    rccm?: string;
    taxId?: string;
    touristLicense?: string;
    description?: string;
  };

  // Navigation défensive : certaines routes n'existent pas pour tous les rôles
  // (ex. ReceivedReviews absent du stack restaurant). On évite ainsi un crash.
  const safeNavigate = (route: string, fallbackMsg?: string) => {
    const routeNames = (navigation.getState?.()?.routeNames as string[] | undefined) ?? [];
    if (routeNames.includes(route)) {
      navigation.navigate(route);
    } else if (fallbackMsg) {
      Alert.alert('Bientôt disponible', fallbackMsg);
    }
  };

  // Synchronisation du profil au montage (infos pro à jour)
  const loadProfile = useCallback(async () => {
    try {
      const res = await usersApi.getProfile();
      const data = res.data?.data ?? res.data;
      if (data && user) setUser({ ...user, ...data });
    } catch {
      // Profil local conservé en cas d'erreur réseau
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── Actions dangereuses ──────────────────────────────────────────────────

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

  const confirmDelete = async () => {
    if (deletePassword.length < 4) {
      Alert.alert('Mot de passe requis', 'Saisissez votre mot de passe pour confirmer.');
      return;
    }
    if (deleteStep === 1) {
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
      Alert.alert('Erreur', err.response?.data?.error ?? err.response?.data?.message ?? 'Impossible de supprimer le compte. Vérifiez qu\'aucune réservation future n\'est en cours.');
    } finally {
      setActionLoading(false);
    }
  };

  const openLegal = () => {
    const routeNames = (navigation.getState?.()?.routeNames as string[] | undefined) ?? [];
    if (routeNames.includes('LegalLinks')) {
      navigation.navigate('LegalLinks');
    } else {
      Linking.openURL('https://legal.primeo.ci/cgu/').catch(() => null);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header band */}
        <View style={[s.headerBand, { backgroundColor: accent }]}>
          <View style={s.avatar}>
            <Text style={[s.avatarInitials, { color: accent }]}>
              {user ? `${user.firstName?.[0] ?? '?'}${user.lastName?.[0] ?? ''}`.toUpperCase() : '?'}
            </Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user ? `${user.firstName} ${user.lastName}` : '—'}</Text>
            <Text style={s.profileEmail}>{user?.email}</Text>
            <View style={s.roleBadge}>
              <Text style={s.roleText}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* ── 1. Informations professionnelles (ouverte par défaut) ── */}
        <ProfileAccordion
          title="Informations professionnelles" icon="business-outline" color={accent}
          open={openKey === 'infos-pro'} onToggle={() => toggle('infos-pro')}
        >
          <ProfileInfoRow icon="storefront-outline" label="Établissement" value={pro.businessName} color={accent} />
          <ProfileInfoRow icon="mail-outline" label="Email" value={user?.email} color={accent} />
          <ProfileInfoRow icon="call-outline" label="Téléphone" value={user?.phone} color={accent} />
          <ProfileInfoRow icon="document-text-outline" label="RCCM" value={pro.rccm} color={accent} />
          <ProfileInfoRow icon="receipt-outline" label="Numéro fiscal" value={pro.taxId} color={accent} />
          <ProfileInfoRow icon="ribbon-outline" label="Licence" value={pro.touristLicense} color={accent} />
          <ProfileInfoRow icon="information-circle-outline" label="Description" value={pro.description} color={accent} />
          <ProfileActionRow icon="create-outline" label="Modifier mes informations" color={accent} last onPress={() => navigation.navigate('EditProfile')} />
        </ProfileAccordion>

        {/* ── 2. Mon compte ── */}
        <ProfileAccordion
          title="Mon compte" icon="settings-outline" color={accent}
          open={openKey === 'compte'} onToggle={() => toggle('compte')}
        >
          <ProfileActionRow icon="key-outline" label="Changer le mot de passe" color={accent} onPress={() => navigation.navigate('ChangePassword')} />
          <ProfileActionRow
            icon="shield-checkmark-outline" label="Sécurité — 2FA" color={accent}
            value={user?.twoFactorEnabled ? 'Activée' : 'Désactivée'}
            onPress={() => navigation.navigate('TwoFactorSetup')}
          />
          <ProfileActionRow
            icon="people-outline" label="Gestion des collaborateurs" color={accent}
            onPress={() => safeNavigate('CollaboratorsAccess', 'La gestion des co-gérants est réservée à la formule Entreprise.')}
          />
          <ProfileActionRow icon="pause-circle-outline" label="Désactiver mon compte" color={accent} last danger onPress={() => { setDeactivateDuration(null); setDeactivateModalVisible(true); }} />
        </ProfileAccordion>

        {/* ── 3. Avis et évaluations ── */}
        <ProfileAccordion
          title="Avis et évaluations" icon="star-outline" color={accent}
          open={openKey === 'avis'} onToggle={() => toggle('avis')}
        >
          <ProfileActionRow
            icon="star-half-outline" label="Avis reçus & réponses" color={accent} last
            onPress={() => safeNavigate('ReceivedReviews', 'Les avis reçus seront bientôt disponibles ici.')}
          />
        </ProfileAccordion>

        {/* ── 4. Soutien et aide ── */}
        <ProfileAccordion
          title="Soutien et aide" icon="help-buoy-outline" color={accent}
          open={openKey === 'support'} onToggle={() => toggle('support')}
        >
          <ProfileActionRow icon="chatbubbles-outline" label="Assistant Primeo" color={accent} onPress={() => navigation.navigate('SupportChatbot')} />
          <ProfileActionRow icon="ticket-outline" label="Mes tickets de support" color={accent} onPress={() => navigation.navigate('SupportTickets')} />
          <ProfileActionRow icon="document-text-outline" label="Documentation & infos légales" color={accent} last onPress={openLegal} />
        </ProfileAccordion>

        {/* ── 5. Notifications ── */}
        <ProfileAccordion
          title="Notifications" icon="notifications-outline" color={accent}
          open={openKey === 'notifications'} onToggle={() => toggle('notifications')}
        >
          <ProfileActionRow icon="options-outline" label="Préférences de notifications" color={accent} last onPress={() => navigation.navigate('Notifications')} />
        </ProfileAccordion>

        {/* ── 6. Zone sensible ── */}
        <ProfileAccordion
          title="Zone sensible" icon="alert-circle-outline" color={accent} danger
          open={openKey === 'sensible'} onToggle={() => toggle('sensible')}
        >
          <ProfileActionRow icon="trash-outline" label="Supprimer mon compte" color={accent} last danger onPress={() => { setDeleteStep(1); setDeletePassword(''); setDeleteModalVisible(true); }} />
        </ProfileAccordion>

        {/* Déconnexion */}
        <ProfileActionRow icon="log-out-outline" label="Se déconnecter" color={accent} danger last onPress={() => setShowLogoutModal(true)} />

        <Text style={s.version}>PRIMEO v1.0.0</Text>
      </ScrollView>

      <ConfirmModal
        visible={showLogoutModal}
        title="Déconnexion"
        message="Voulez-vous vraiment vous déconnecter ?"
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        destructive
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          socketService.disconnect();
          logout().catch(() => null);
        }}
      />

      {/* Modal désactivation */}
      <Modal visible={deactivateModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Désactiver le compte</Text>
            <Text style={s.modalSubtitle}>
              Choisissez la durée. Vos annonces ne seront plus visibles et vous ne pourrez plus recevoir de nouvelles réservations. Les réservations en cours ne sont pas affectées.
            </Text>
            {(['1_week', '1_month', 'indefinite'] as const).map((dur) => {
              const labels: Record<string, string> = { '1_week': '1 semaine', '1_month': '1 mois', indefinite: 'Indéfiniment' };
              return (
                <TouchableOpacity
                  key={dur}
                  style={[s.durationBtn, deactivateDuration === dur && s.durationBtnActive]}
                  onPress={() => setDeactivateDuration(dur)}
                >
                  <Text style={[s.durationLabel, deactivateDuration === dur && s.durationLabelActive]}>{labels[dur]}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setDeactivateModalVisible(false)}>
                <Text style={s.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirm, s.btnDanger]} onPress={confirmDeactivate} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.modalConfirmText}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal suppression */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{deleteStep === 1 ? 'Supprimer le compte' : '⚠️ Confirmation finale'}</Text>
            <Text style={s.modalSubtitle}>
              {deleteStep === 1
                ? 'Cette action est irréversible. Vos données seront supprimées conformément au RGPD. Saisissez votre mot de passe pour continuer.'
                : 'Êtes-vous vraiment sûr ? Cette suppression est définitive et ne peut pas être annulée.'}
            </Text>
            {deleteStep === 1 && (
              <TextInput
                style={s.modalInput}
                placeholder="Mot de passe actuel"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
              />
            )}
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => { setDeleteModalVisible(false); setDeleteStep(1); setDeletePassword(''); }}
              >
                <Text style={s.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirm, s.btnDanger]} onPress={confirmDelete} disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.modalConfirmText}>{deleteStep === 1 ? 'Continuer' : 'Supprimer définitivement'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingBottom: 40, paddingTop: 4 },

  headerBand: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    marginBottom: 20,
  },
  avatar:          { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarInitials:  { fontSize: 20, fontWeight: '700' },
  profileInfo:     { flex: 1 },
  profileName:     { fontSize: 16, fontWeight: '700', color: '#fff' },
  profileEmail:    { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  roleBadge:       { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)' },
  roleText:        { fontSize: 11, fontWeight: '600', color: '#fff' },

  version: { textAlign: 'center', fontSize: 11, color: '#CBD5E1', marginTop: 16, marginBottom: 8 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox:     { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  modalSubtitle:{ fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  modalInput:   { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', marginBottom: 20 },
  durationBtn:  { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 10 },
  durationBtnActive: { borderColor: '#1056E0', backgroundColor: '#EFF6FF' },
  durationLabel:{ fontSize: 15, color: '#374151', fontWeight: '500' },
  durationLabelActive: { color: '#1056E0', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel:  { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  modalCancelText: { color: '#374151', fontWeight: '700', fontSize: 15 },
  modalConfirm: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDanger:    { backgroundColor: '#EF4444' },
});
