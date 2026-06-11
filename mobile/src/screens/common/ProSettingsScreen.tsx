import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Modal, TextInput, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useProTheme } from '../../hooks/useProTheme';
import { usersApi } from '../../services/api/endpoints/users';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socket/socketService';

const ROLE_LABELS: Record<string, string> = {
  professional_hebergement: 'Professionnel — Résidence',
  professional_hotel:       'Professionnel — Hôtel',
  professional_immobilier:  'Professionnel — Immobilier',
  restaurateur:             'Professionnel — Restaurant',
};

type Row = { label: string; icon: string; onPress: () => void; danger?: boolean; value?: string };

function SettingsRow({ label, icon, onPress, danger, value, accentColor }: Row & { accentColor: string }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.iconBox, { backgroundColor: danger ? '#FEF2F2' : accentColor + '18' }]}>
        <Ionicons name={icon as any} size={18} color={danger ? '#DC2626' : accentColor} />
      </View>
      <Text style={[s.rowLabel, danger && s.rowDanger]}>{label}</Text>
      {value ? <Text style={s.rowValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function ProSettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const theme = useProTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Modal de désactivation
  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
  const [deactivateDuration, setDeactivateDuration] = useState<string | null>(null);
  // Modal de suppression (mot de passe)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [actionLoading, setActionLoading] = useState(false);

  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? 'Compte professionnel';

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

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header band */}
        <View style={[s.headerBand, { backgroundColor: theme.primary }]}>
          <View style={s.avatar}>
            <Text style={[s.avatarInitials, { color: theme.primary }]}>
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

        {/* Mon profil */}
        <Text style={s.sectionTitle}>Mon profil</Text>
        <View style={s.section}>
          <SettingsRow accentColor={theme.primary}
            label="Modifier mes informations" icon="person-outline"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <View style={s.divider} />
          <SettingsRow accentColor={theme.primary}
            label="Changer le mot de passe" icon="key-outline"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <View style={s.divider} />
          <SettingsRow accentColor={theme.primary}
            label="Sécurité — 2FA" icon="shield-checkmark-outline"
            value={user?.twoFactorEnabled ? 'Activée' : 'Désactivée'}
            onPress={() => navigation.navigate('TwoFactorSetup')}
          />
        </View>

        {/* Mon espace */}
        <Text style={s.sectionTitle}>Mon espace</Text>
        <View style={s.section}>
          <SettingsRow accentColor={theme.primary}
            label="Mes annonces" icon="business-outline"
            onPress={() => navigation.navigate('PropertiesList')}
          />
          <View style={s.divider} />
          <SettingsRow accentColor={theme.primary}
            label="Réservations" icon="calendar-outline"
            onPress={() => navigation.navigate('Bookings')}
          />
          <View style={s.divider} />
          <SettingsRow accentColor={theme.primary}
            label="Abonnement & facturation" icon="card-outline"
            onPress={() => navigation.navigate('Subscriptions')}
          />
          <View style={s.divider} />
          <SettingsRow accentColor={theme.primary}
            label="Boosts & visibilité" icon="rocket-outline"
            onPress={() => navigation.navigate('Boosts')}
          />
          <View style={s.divider} />
          <SettingsRow accentColor={theme.primary}
            label="Exporter mes données" icon="download-outline"
            onPress={() => navigation.navigate('DataExports')}
          />
          <View style={s.divider} />
          <SettingsRow accentColor={theme.primary}
            label="Notifications" icon="notifications-outline"
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>

        {/* Équipe */}
        <Text style={s.sectionTitle}>Équipe</Text>
        <View style={s.section}>
          <SettingsRow accentColor={theme.primary}
            label="Co-gérants" icon="people-outline"
            onPress={() => navigation.navigate('CollaboratorsAccess')}
          />
        </View>

        {/* Avis */}
        <Text style={s.sectionTitle}>Réputation</Text>
        <View style={s.section}>
          <SettingsRow accentColor={theme.primary}
            label="Avis reçus" icon="star-outline"
            onPress={() => navigation.navigate('ReceivedReviews')}
          />
        </View>

        {/* Support & aide */}
        <Text style={s.sectionTitle}>Support & aide</Text>
        <View style={s.section}>
          <SettingsRow accentColor={theme.primary}
            label="Assistant Primeo" icon="chatbubbles-outline"
            onPress={() => navigation.navigate('SupportChatbot')}
          />
          <View style={s.divider} />
          <SettingsRow accentColor={theme.primary}
            label="Mes tickets de support" icon="ticket-outline"
            onPress={() => navigation.navigate('SupportTickets')}
          />
          <View style={s.divider} />
          <SettingsRow accentColor={theme.primary}
            label="Informations légales" icon="document-text-outline"
            onPress={() => {
              if (navigation.getState().routeNames?.includes('LegalLinks')) {
                navigation.navigate('LegalLinks');
              } else {
                Linking.openURL('https://legal.primeo.ci/cgu/').catch(() => null);
              }
            }}
          />
        </View>

        {/* Zone sensible */}
        <Text style={[s.sectionTitle, { color: '#DC2626' }]}>Zone sensible</Text>
        <View style={s.section}>
          <SettingsRow accentColor={theme.primary}
            label="Désactiver mon compte" icon="pause-circle-outline"
            onPress={() => { setDeactivateDuration(null); setDeactivateModalVisible(true); }}
            danger
          />
          <View style={s.divider} />
          <SettingsRow accentColor={theme.primary}
            label="Supprimer mon compte" icon="trash-outline"
            onPress={() => { setDeleteStep(1); setDeletePassword(''); setDeleteModalVisible(true); }}
            danger
          />
        </View>

        {/* Déconnexion */}
        <View style={[s.section, { marginTop: 8 }]}>
          <SettingsRow accentColor={theme.primary}
            label="Se déconnecter" icon="log-out-outline"
            onPress={() => setShowLogoutModal(true)}
            danger
          />
        </View>

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
  scroll: { paddingBottom: 40 },

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

  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 20 },
  section:      {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', marginHorizontal: 16,
    shadowColor: '#0F1729', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  divider:      { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 14 },

  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  iconBox:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel:     { flex: 1, fontSize: 14, fontWeight: '500', color: '#0F1729' },
  rowValue:     { fontSize: 13, color: '#94A3B8', marginRight: 4 },
  rowDanger:    { color: '#DC2626' },

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
