import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useProTheme } from '../../hooks/useProTheme';

const ROLE_LABELS: Record<string, string> = {
  professional_hebergement: 'Professionnel — Résidence',
  professional_hotel:       'Professionnel — Hôtel',
  professional_immobilier:  'Professionnel — Immobilier',
  restaurateur:             'Professionnel — Restaurant',
};

type Row = { label: string; icon: string; onPress: () => void; danger?: boolean };

function SettingsRow({ label, icon, onPress, danger, accentColor }: Row & { accentColor: string }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.iconBox, { backgroundColor: danger ? '#FEF2F2' : accentColor + '18' }]}>
        <Ionicons name={icon as any} size={18} color={danger ? '#DC2626' : accentColor} />
      </View>
      <Text style={[s.rowLabel, danger && s.rowDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function ProSettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const theme = useProTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? 'Compte professionnel';

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
        </View>

        {/* Compte */}
        <Text style={s.sectionTitle}>Mon compte</Text>
        <View style={s.section}>
          <SettingsRow accentColor={theme.primary}
            label="Sécurité — 2FA" icon="shield-checkmark-outline"
            onPress={() =>
              Alert.alert('2FA', "La gestion de l'authentification à deux facteurs est disponible dans votre espace web.")
            }
          />
          <View style={s.divider} />
          <SettingsRow accentColor={theme.primary}
            label="Informations légales" icon="document-text-outline"
            onPress={() => {
              const { Linking } = require('react-native');
              Linking.openURL('https://primeo-vitrine.onrender.com/legal/cgu.html').catch(() => null);
            }}
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
          logout().catch(() => null);
        }}
      />
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
  rowDanger:    { color: '#DC2626' },

  version: { textAlign: 'center', fontSize: 11, color: '#CBD5E1', marginTop: 16, marginBottom: 8 },
});
