import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { adminApi } from '../../services/api/endpoints/adminApi';
import { useAuth } from '../../hooks/useAuth';

interface Stats {
  totalUsers?: number;
  pendingProperties?: number;
  pendingKyc?: number;
  activeProperties?: number;
  totalBookings?: number;
  openDisputes?: number;
  totalRevenue?: number;
  [key: string]: any;
}

interface BookingByType {
  propertyType: string;
  count: number;
  revenue: number;
}

interface Partner {
  partnerId: string;
  partnerName: string;
  totalRevenue: number;
  bookingCount: number;
}

interface ConversionByType {
  propertyType: string;
  bookings: number;
  views: number;
  conversionRate: number;
}

interface ReferralStats {
  pending: number;
  rewarded: number;
  pendingQualifying: number;
}

interface AdvancedStats {
  bookingsByType: BookingByType[];
  topPartners: Partner[];
  conversionByType: ConversionByType[];
  referralStats: ReferralStats;
}

const TYPE_LABELS: Record<string, string> = {
  residence: 'Résidence',
  hotel: 'Hôtel',
  immobilier: 'Immobilier',
  restaurant: 'Restaurant',
  event: 'Évènement',
};

function StatCard({ label, value, icon, color, onPress }: {
  label: string; value: number | string; icon: string; color: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value ?? '—'}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />}
    </TouchableOpacity>
  );
}

function ActionCard({ label, icon, color, onPress }: { label: string; icon: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.actionCard, { backgroundColor: color + '12', borderColor: color + '30' }]} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon as any} size={26} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function AdvancedCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.advCard}>
      <Text style={styles.advCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [advanced, setAdvanced] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [advLoading, setAdvLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await adminApi.getDashboardStats();
      const d: Stats = res.data?.data ?? res.data ?? {};
      setStats(d);
    } catch {
      setStats({});
    } finally {
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }, []);

  const loadAdvanced = useCallback(async () => {
    setAdvLoading(true);
    try {
      const res = await adminApi.getAdvancedStats();
      setAdvanced(res.data?.data ?? res.data ?? null);
    } catch {
      setAdvanced(null);
    } finally {
      setAdvLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadAdvanced(); }, [load, loadAdvanced]);

  const handleRefresh = useCallback(() => {
    load(true);
    loadAdvanced();
  }, [load, loadAdvanced]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#1056E0" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : 'A';
  const maxBookingCount = advanced?.bookingsByType?.length
    ? Math.max(...advanced.bookingsByType.map((b) => b.count), 1)
    : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#1056E0']} tintColor="#1056E0" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Bonjour, {user?.firstName}</Text>
            <Text style={styles.role}>Administrateur PRIMEO</Text>
          </View>
          <TouchableOpacity onPress={() => logout().catch(() => null)} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          </TouchableOpacity>
        </View>

        {/* Stats grid */}
        <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Annonces en attente"
            value={stats?.pendingProperties ?? 0}
            icon="time-outline"
            color="#D97706"
            onPress={() => navigation.navigate('PropertiesModeration')}
          />
          <StatCard
            label="KYC en attente"
            value={stats?.pendingKyc ?? 0}
            icon="shield-outline"
            color="#7C3AED"
            onPress={() => navigation.navigate('UsersModeration')}
          />
          <StatCard
            label="Annonces actives"
            value={stats?.activeProperties ?? 0}
            icon="home-outline"
            color="#059669"
          />
          <StatCard
            label="Utilisateurs"
            value={stats?.totalUsers ?? 0}
            icon="people-outline"
            color="#1056E0"
            onPress={() => navigation.navigate('UsersModeration')}
          />
          <StatCard
            label="Réservations totales"
            value={stats?.totalBookings ?? 0}
            icon="calendar-outline"
            color="#0891B2"
          />
          <StatCard
            label="Litiges ouverts"
            value={stats?.openDisputes ?? 0}
            icon="alert-circle-outline"
            color="#DC2626"
            onPress={() => navigation.navigate('AdminDisputes')}
          />
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.actionsGrid}>
          <ActionCard
            label="Modérer les annonces"
            icon="checkmark-circle-outline"
            color="#D97706"
            onPress={() => navigation.navigate('PropertiesModeration')}
          />
          <ActionCard
            label="Valider les KYC"
            icon="shield-checkmark-outline"
            color="#7C3AED"
            onPress={() => navigation.navigate('UsersModeration')}
          />
          <ActionCard
            label="Gérer les utilisateurs"
            icon="people-outline"
            color="#1056E0"
            onPress={() => navigation.navigate('UsersModeration')}
          />
          <ActionCard
            label="Voir les réservations"
            icon="calendar-outline"
            color="#0891B2"
            onPress={() => navigation.navigate('AdminBookings')}
          />
          <ActionCard
            label="Gérer les litiges"
            icon="alert-circle-outline"
            color="#DC2626"
            onPress={() => navigation.navigate('AdminDisputes')}
          />
        </View>

        {/* Advanced analytics */}
        <Text style={styles.sectionTitle}>Analytics avancées</Text>

        {advLoading ? (
          <ActivityIndicator size="small" color="#1056E0" style={{ marginBottom: 20 }} />
        ) : advanced ? (
          <>
            {/* Bookings by property type */}
            {advanced.bookingsByType?.length > 0 && (
              <AdvancedCard title="Réservations par type d'annonce">
                {advanced.bookingsByType.map((item) => (
                  <View key={item.propertyType} style={styles.advRow}>
                    <Text style={styles.advRowLabel}>{TYPE_LABELS[item.propertyType] ?? item.propertyType}</Text>
                    <View style={styles.advBarTrack}>
                      <View
                        style={[
                          styles.advBarFill,
                          { width: `${Math.round((item.count / maxBookingCount) * 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.advRowValue}>{item.count}</Text>
                  </View>
                ))}
              </AdvancedCard>
            )}

            {/* Conversion rates */}
            {advanced.conversionByType?.length > 0 && (
              <AdvancedCard title="Taux de conversion (réservations / vues)">
                {advanced.conversionByType.map((item) => (
                  <View key={item.propertyType} style={styles.advRow}>
                    <Text style={styles.advRowLabel}>{TYPE_LABELS[item.propertyType] ?? item.propertyType}</Text>
                    <View style={styles.advBarTrack}>
                      <View
                        style={[
                          styles.advBarFill,
                          { width: `${Math.min(100, Math.round(item.conversionRate * 100))}%`, backgroundColor: '#059669' },
                        ]}
                      />
                    </View>
                    <Text style={[styles.advRowValue, { color: '#059669' }]}>
                      {(item.conversionRate * 100).toFixed(1)}%
                    </Text>
                  </View>
                ))}
              </AdvancedCard>
            )}

            {/* Top partners */}
            {advanced.topPartners?.length > 0 && (
              <AdvancedCard title="Top partenaires — CA 6 mois">
                {advanced.topPartners.slice(0, 5).map((p, idx) => (
                  <View key={p.partnerId} style={styles.partnerRow}>
                    <View style={styles.partnerRank}>
                      <Text style={styles.partnerRankText}>#{idx + 1}</Text>
                    </View>
                    <Text style={styles.partnerName} numberOfLines={1}>
                      {p.partnerName || 'Partenaire'}
                    </Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.partnerRevenue}>
                        {p.totalRevenue.toLocaleString('fr-CI')} F
                      </Text>
                      <Text style={styles.partnerBookings}>{p.bookingCount} rés.</Text>
                    </View>
                  </View>
                ))}
              </AdvancedCard>
            )}

            {/* Referral program */}
            {advanced.referralStats && (
              <AdvancedCard title="Programme de parrainage">
                <View style={styles.referralGrid}>
                  <View style={styles.referralBox}>
                    <Text style={styles.referralNum}>{advanced.referralStats.pending}</Text>
                    <Text style={styles.referralLbl}>En attente</Text>
                  </View>
                  <View style={styles.referralBox}>
                    <Text style={[styles.referralNum, { color: '#059669' }]}>{advanced.referralStats.rewarded}</Text>
                    <Text style={styles.referralLbl}>Récompensés</Text>
                  </View>
                  <View style={[styles.referralBox, { borderWidth: 1, borderColor: '#FDE68A' }]}>
                    <Text style={[styles.referralNum, { color: '#D97706' }]}>{advanced.referralStats.pendingQualifying}</Text>
                    <Text style={styles.referralLbl}>À distribuer</Text>
                  </View>
                </View>
              </AdvancedCard>
            )}
          </>
        ) : (
          <View style={styles.advEmpty}>
            <Text style={styles.advEmptyText}>Données avancées indisponibles</Text>
          </View>
        )}

        <Text style={styles.version}>PRIMEO Admin v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 16, paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1056E0', borderRadius: 16, padding: 16, marginBottom: 20,
  },
  avatar:      { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 18, fontWeight: '700', color: '#fff' },
  greeting:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  role:        { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  logoutBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginTop: 4 },

  statsGrid: { gap: 8, marginBottom: 20 },
  statCard:  {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderLeftWidth: 3,
    shadowColor: '#0F1729', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statIcon:  { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statInfo:  { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 1 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  actionCard:  {
    width: '47%', borderRadius: 14, borderWidth: 1,
    padding: 16, alignItems: 'center', gap: 8,
  },
  actionLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // Advanced analytics
  advCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#0F1729', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  advCardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 14 },

  advRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  advRowLabel: { width: 80, fontSize: 12, color: '#374151' },
  advBarTrack: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  advBarFill: { height: 8, backgroundColor: '#1056E0', borderRadius: 4 },
  advRowValue: { width: 34, fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'right' },

  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  partnerRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  partnerRankText: { fontSize: 11, fontWeight: '800', color: '#1056E0' },
  partnerName: { flex: 1, fontSize: 13, color: '#374151' },
  partnerRevenue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  partnerBookings: { fontSize: 11, color: '#9CA3AF' },

  referralGrid: { flexDirection: 'row', gap: 10 },
  referralBox: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, alignItems: 'center' },
  referralNum: { fontSize: 24, fontWeight: '800', color: '#111827' },
  referralLbl: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },

  advEmpty: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16 },
  advEmptyText: { color: '#9CA3AF', fontSize: 14 },

  version: { textAlign: 'center', fontSize: 11, color: '#CBD5E1', marginTop: 8 },
});
