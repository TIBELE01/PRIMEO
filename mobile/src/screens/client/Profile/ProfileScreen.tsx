import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Image, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClientScreenProps } from '../../../navigation/types';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme, type ThemeMode } from '../../../hooks/useTheme';
import { socketService } from '../../../services/socket/socketService';
import { STORAGE_KEYS } from '../../../constants/storageKeys';
import { useCurrencyStore } from '../../../store/currencyStore';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';

const CURRENCIES = ['FCFA', 'EUR', 'USD'];
const CURRENCY_KEY = '@primeo_currency';
const NOTIF_KEY = '@primeo_notif_prefs';

type Props = ClientScreenProps<'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const setCurrencyInStore = useCurrencyStore(s => s.setCurrency);
  const [currency, setCurrencyState] = useState('FCFA');
  const [notifBookings, setNotifBookings] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifPromos, setNotifPromos] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Load persisted preferences
  React.useEffect(() => {
    AsyncStorage.getItem(CURRENCY_KEY).then(v => { if (v) setCurrencyState(v); }).catch(() => null);
    AsyncStorage.getItem(NOTIF_KEY).then(raw => {
      if (!raw) return;
      const prefs = JSON.parse(raw);
      setNotifBookings(prefs.bookings ?? true);
      setNotifMessages(prefs.messages ?? true);
      setNotifPromos(prefs.promos ?? false);
    }).catch(() => null);
  }, []);

  const saveCurrency = async (c: string) => {
    setCurrencyState(c);
    setCurrencyInStore(c);
    await AsyncStorage.setItem(CURRENCY_KEY, c);
  };

  const saveNotifPref = async (key: string, value: boolean) => {
    const prefs = { bookings: notifBookings, messages: notifMessages, promos: notifPromos, [key]: value };
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
  };

  const handleLogout = () => setShowLogoutModal(true);

  const themes: { mode: ThemeMode; label: string; emoji: string }[] = [
    { mode: 'light', label: 'Clair', emoji: '☀️' },
    { mode: 'dark', label: 'Sombre', emoji: '🌙' },
    { mode: 'blue', label: 'Bleu', emoji: '💎' },
    { mode: 'auto', label: 'Auto', emoji: '📱' },
  ];

  const fullName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—' : '—';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';

  const Row = ({ label, value, onPress, danger }: { label: string; value?: string; onPress: () => void; danger?: boolean }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.rowLabel, danger && styles.danger]}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        <Text style={styles.rowArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          {user?.avatarUrl
            ? <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            : <View style={styles.avatarFallback}><Text style={styles.avatarInitials}>{initials}</Text></View>
          }
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Compte vérifié</Text>
            </View>
          )}
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon compte</Text>
          <Row label="Modifier mon profil" onPress={() => navigation.navigate('EditProfile')} />
          <Row label="Changer le mot de passe" onPress={() => navigation.navigate('ChangePassword')} />
          <Row
            label="Authentification 2FA"
            value={user?.twoFactorEnabled ? 'Activée' : 'Désactivée'}
            onPress={() => navigation.navigate('TwoFactorSetup')}
          />
        </View>

        {/* Reviews section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avis & évaluations</Text>
          <Row label="⭐ Mes avis publiés" onPress={() => navigation.navigate('MyReviews')} />
          <Row label="👤 Évaluations reçues" onPress={() => navigation.navigate('ReceivedRatings')} />
          <Row label="⚖️ Mes litiges" onPress={() => navigation.navigate('DisputeList')} />
          <Row label="❤️ Mes favoris" onPress={() => navigation.navigate('Favorites')} />
          <Row label="🎁 Parrainage" onPress={() => navigation.navigate('Referral')} />
        </View>

        {/* Support section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & aide</Text>
          <Row label="💬 Assistant Primeo" onPress={() => navigation.navigate('SupportChatbot')} />
          <Row label="🎫 Mes tickets de support" onPress={() => navigation.navigate('SupportTickets')} />
        </View>

        {/* Theme section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apparence</Text>
          <View style={styles.themeRow}>
            {themes.map(t => (
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

        {/* Currency section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devise d'affichage</Text>
          <View style={styles.currencyRow}>
            {CURRENCIES.map(c => (
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

        {/* Notifications section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Réservations</Text>
            <Switch
              value={notifBookings}
              onValueChange={v => { setNotifBookings(v); saveNotifPref('bookings', v); }}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={notifBookings ? '#1056E0' : '#9CA3AF'}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Messages</Text>
            <Switch
              value={notifMessages}
              onValueChange={v => { setNotifMessages(v); saveNotifPref('messages', v); }}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={notifMessages ? '#1056E0' : '#9CA3AF'}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Offres & promotions</Text>
            <Switch
              value={notifPromos}
              onValueChange={v => { setNotifPromos(v); saveNotifPref('promos', v); }}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={notifPromos ? '#1056E0' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>PRIMEO v1.0.0</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingBottom: 40 },
  avatarSection: { backgroundColor: '#fff', alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, marginBottom: 12 },
  avatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 12 },
  avatarFallback: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarInitials: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  verifiedBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  verifiedText: { color: '#065F46', fontSize: 12, fontWeight: '700' },
  section: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, marginBottom: 12, overflow: 'hidden' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F9FAFB' },
  rowLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 14, color: '#6B7280' },
  rowArrow: { fontSize: 18, color: '#D1D5DB' },
  danger: { color: '#DC2626' },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  themeChip: { flex: 1, minWidth: 70, alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 4 },
  themeChipActive: { borderColor: '#1056E0', backgroundColor: '#F0FDF4' },
  themeEmoji: { fontSize: 20 },
  themeLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  themeLabelActive: { color: '#1056E0' },
  currencyRow: { flexDirection: 'row', gap: 10, padding: 12 },
  currencyChip: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB' },
  currencyChipActive: { borderColor: '#1056E0', backgroundColor: '#F0FDF4' },
  currencyLabel: { fontSize: 14, color: '#6B7280', fontWeight: '700' },
  currencyLabelActive: { color: '#1056E0' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F9FAFB' },
  switchLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },
  logoutBtn: { margin: 12, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#FECACA' },
  logoutText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },
  version: { textAlign: 'center', fontSize: 12, color: '#D1D5DB', marginTop: 8 },
});
