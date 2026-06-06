// ProfileScreen — écran principal du profil utilisateur client
// Regroupe : infos perso/pro, préférences (thème, devise, notifications),
// raccourcis (favoris, avis, litiges, parrainage, support) et gestion du
// compte (modifier, mot de passe, 2FA, désactivation, suppression).
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClientScreenProps } from '../../../navigation/types';
import { usersApi } from '../../../services/api/endpoints/users';
import { useAuthStore } from '../../../store/authStore';
import { useTheme, type ThemeMode } from '../../../hooks/useTheme';
import { useCurrencyStore } from '../../../store/currencyStore';
import { socketService } from '../../../services/socket/socketService';

// ── Constantes ──────────────────────────────────────────────────────────────

const CURRENCIES = ['FCFA', 'EUR', 'USD'];
const CURRENCY_KEY = '@primeo_currency';
const NOTIF_KEY = '@primeo_notif_prefs';

type Props = ClientScreenProps<'Profile'>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Retourne un libellé lisible selon le rôle */
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

/** Retourne la couleur du badge rôle */
function roleBadgeColor(role: string): string {
  if (role === 'client') return '#1056E0';
  if (role === 'admin') return '#7C3AED';
  return '#0D9488';
}

/** Vérifie si le rôle est un compte professionnel */
function isPro(role: string): boolean {
  return role !== 'client' && role !== 'admin';
}

// ── Composants internes ───────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  value,
  onPress,
  danger = false,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionLabel, danger && styles.textDanger]}>{label}</Text>
      {value ? <Text style={styles.actionValue}>{value}</Text> : null}
      <Text style={styles.actionArrow}>›</Text>
    </TouchableOpacity>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

export function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const { themeMode, setThemeMode } = useTheme();
  const setCurrencyInStore = useCurrencyStore((s) => s.setCurrency);

  const [loading, setLoading] = useState(false);

  // Préférences locales
  const [currency, setCurrencyState] = useState('FCFA');
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
    AsyncStorage.getItem(CURRENCY_KEY).then((v) => { if (v) setCurrencyState(v); }).catch(() => null);
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

  const saveCurrency = async (c: string) => {
    setCurrencyState(c);
    setCurrencyInStore(c);
    await AsyncStorage.setItem(CURRENCY_KEY, c).catch(() => null);
  };

  const saveNotifPref = async (key: string, value: boolean) => {
    const prefs = { bookings: notifBookings, messages: notifMessages, promos: notifPromos, [key]: value };
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(prefs)).catch(() => null);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color="#1056E0" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—';
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const isProfessional = isPro(user.role);
  const proUser = user as typeof user & {
    businessName?: string;
    rccm?: string;
    taxId?: string;
    description?: string;
    dateOfBirth?: string;
    birthDate?: string;
    gender?: string;
  };

  const themes: { mode: ThemeMode; label: string; emoji: string }[] = [
    { mode: 'light', label: 'Clair', emoji: '☀️' },
    { mode: 'dark', label: 'Sombre', emoji: '🌙' },
    { mode: 'blue', label: 'Bleu', emoji: '💎' },
    { mode: 'auto', label: 'Auto', emoji: '📱' },
  ];

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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FB" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* En-tête : avatar + nom + badge rôle */}
        <View style={styles.header}>
          {loading && <ActivityIndicator color="#1056E0" style={styles.loadingIndicator} />}
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
          {/* Statut KYC pour les professionnels */}
          {isProfessional && user.kycStatus && (
            <View style={[styles.kycBadge, user.kycStatus === 'approved' ? styles.kycApproved : user.kycStatus === 'rejected' ? styles.kycRejected : styles.kycPending]}>
              <Text style={styles.kycBadgeText}>
                KYC :{' '}
                {user.kycStatus === 'approved' ? '✓ Vérifié' : user.kycStatus === 'rejected' ? '✗ Rejeté' : '⏳ En attente'}
              </Text>
            </View>
          )}
          {!isProfessional && user.isVerified && (
            <View style={[styles.kycBadge, styles.kycApproved]}>
              <Text style={styles.kycBadgeText}>✓ Compte vérifié</Text>
            </View>
          )}
        </View>

        {/* Section informations personnelles */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          <InfoRow icon="✉️" label="Email" value={user.email} />
          <InfoRow icon="📞" label="Téléphone" value={user.phone} />
          {(proUser.birthDate || proUser.dateOfBirth) && (
            <InfoRow icon="🎂" label="Date de naissance" value={proUser.birthDate ?? proUser.dateOfBirth} />
          )}
          {proUser.gender && (
            <InfoRow
              icon="👤"
              label="Genre"
              value={
                proUser.gender === 'male' ? 'Homme'
                : proUser.gender === 'female' ? 'Femme'
                : proUser.gender === 'other' ? 'Autre'
                : 'Non précisé'
              }
            />
          )}
        </View>

        {/* Section informations professionnelles (si pro) */}
        {isProfessional && (proUser.businessName || proUser.rccm || proUser.taxId || proUser.description) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Informations professionnelles</Text>
            <InfoRow icon="🏢" label="Nom de l'établissement" value={proUser.businessName} />
            <InfoRow icon="📋" label="RCCM" value={proUser.rccm} />
            <InfoRow icon="🔢" label="Numéro fiscal" value={proUser.taxId} />
            <InfoRow icon="📝" label="Description" value={proUser.description} />
          </View>
        )}

        {/* Mon compte */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mon compte</Text>
          <ActionRow icon="✏️" label="Modifier mon profil" onPress={() => navigation.navigate('EditProfile')} />
          <ActionRow icon="🔑" label="Changer de mot de passe" onPress={() => navigation.navigate('ChangePassword')} />
          <ActionRow
            icon="🔒"
            label="Authentification 2FA"
            value={user.twoFactorEnabled ? 'Activée' : 'Désactivée'}
            onPress={() => navigation.navigate('TwoFactorSetup')}
          />
        </View>

        {/* Avis & évaluations */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Avis & évaluations</Text>
          <ActionRow icon="⭐" label="Mes avis publiés" onPress={() => navigation.navigate('MyReviews')} />
          <ActionRow icon="👤" label="Évaluations reçues" onPress={() => navigation.navigate('ReceivedRatings')} />
          <ActionRow icon="⚖️" label="Mes litiges" onPress={() => navigation.navigate('DisputeList')} />
          <ActionRow icon="❤️" label="Mes favoris" onPress={() => navigation.navigate('Favorites')} />
          <ActionRow icon="🎁" label="Parrainage" onPress={() => navigation.navigate('Referral')} />
        </View>

        {/* Support & aide */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Support & aide</Text>
          <ActionRow icon="💬" label="Assistant Primeo" onPress={() => navigation.navigate('SupportChatbot')} />
          <ActionRow icon="🎫" label="Mes tickets de support" onPress={() => navigation.navigate('SupportTickets')} />
          <ActionRow icon="📄" label="Informations légales" onPress={() => navigation.navigate('LegalLinks')} />
        </View>

        {/* Apparence */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Apparence</Text>
          <View style={styles.themeRow}>
            {themes.map((t) => (
              <TouchableOpacity
                key={t.mode}
                style={[styles.themeChip, themeMode === t.mode && styles.themeChipActive]}
                onPress={() => setThemeMode(t.mode)}
              >
                <Text style={styles.themeEmoji}>{t.emoji}</Text>
                <Text style={[styles.themeLabel, themeMode === t.mode && styles.themeLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Devise d'affichage */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Devise d'affichage</Text>
          <View style={styles.currencyRow}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.currencyChip, currency === c && styles.currencyChipActive]}
                onPress={() => saveCurrency(c)}
              >
                <Text style={[styles.currencyLabel, currency === c && styles.currencyLabelActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Réservations</Text>
            <Switch
              value={notifBookings}
              onValueChange={(v) => { setNotifBookings(v); saveNotifPref('bookings', v); }}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={notifBookings ? '#1056E0' : '#9CA3AF'}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Messages</Text>
            <Switch
              value={notifMessages}
              onValueChange={(v) => { setNotifMessages(v); saveNotifPref('messages', v); }}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={notifMessages ? '#1056E0' : '#9CA3AF'}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Offres & promotions</Text>
            <Switch
              value={notifPromos}
              onValueChange={(v) => { setNotifPromos(v); saveNotifPref('promos', v); }}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={notifPromos ? '#1056E0' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Zone sensible */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={[styles.sectionTitle, styles.textDanger]}>Zone sensible</Text>
          <ActionRow icon="⏸️" label="Désactiver mon compte" onPress={handleDeactivate} danger />
          <ActionRow icon="🗑️" label="Supprimer mon compte" onPress={handleDeleteAccount} danger />
        </View>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
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
                >
                  <Text style={[styles.durationLabel, deactivateDuration === dur && styles.durationLabelActive]}>
                    {labels[dur]}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDeactivateModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, styles.btnDanger]}
                onPress={confirmDeactivate}
                disabled={actionLoading}
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
  scroll: { paddingBottom: 48 },
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
  kycRejected: { backgroundColor: '#FEE2E2' },
  kycPending: { backgroundColor: '#FEF3C7' },
  kycBadgeText: { fontSize: 12, fontWeight: '700', color: '#374151' },

  // Cartes
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingTop: 4,
    paddingBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  dangerCard: { borderWidth: 1, borderColor: '#FEE2E2' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Ligne info (lecture seule)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F4F6FB',
  },
  infoIcon: { fontSize: 18, marginRight: 12, marginTop: 1 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '500' },

  // Ligne action
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F4F6FB',
  },
  actionIcon: { fontSize: 18, marginRight: 12 },
  actionLabel: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  actionValue: { fontSize: 14, color: '#6B7280', marginRight: 6 },
  actionArrow: { fontSize: 20, color: '#D1D5DB' },
  textDanger: { color: '#EF4444' },

  // Apparence (thème)
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  themeChip: { flex: 1, minWidth: 70, alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 4 },
  themeChipActive: { borderColor: '#1056E0', backgroundColor: '#EFF6FF' },
  themeEmoji: { fontSize: 20 },
  themeLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  themeLabelActive: { color: '#1056E0' },

  // Devise
  currencyRow: { flexDirection: 'row', gap: 10, padding: 12 },
  currencyChip: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB' },
  currencyChipActive: { borderColor: '#1056E0', backgroundColor: '#EFF6FF' },
  currencyLabel: { fontSize: 14, color: '#6B7280', fontWeight: '700' },
  currencyLabelActive: { color: '#1056E0' },

  // Notifications
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
