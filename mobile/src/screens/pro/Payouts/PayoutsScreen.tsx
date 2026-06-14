// PayoutsScreen — portefeuille virtuel professionnel : solde, reversements,
// récompenses de parrainage et autres crédits.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { walletApi } from '../../../services/api/endpoints/wallet';

type TxType = 'payout_to_professional' | 'referral_reward' | 'refund';

interface WalletTx {
  id: string;
  type: TxType;
  amount: number;
  fee: number;
  notes: string | null;
  date: string | null;
  booking: {
    id: string;
    startDate: string;
    endDate: string;
    propertyTitle: string | null;
  } | null;
}

interface WalletData {
  balance: number;
  currency: string;
  transactions: WalletTx[];
}

const fmt = (n: number) => `${(n ?? 0).toLocaleString('fr-FR')} FCFA`;
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

function txLabel(type: TxType): string {
  if (type === 'payout_to_professional') return 'Reversement réservation';
  if (type === 'referral_reward') return 'Récompense parrainage';
  if (type === 'refund') return 'Remboursement';
  return 'Crédit';
}

function txIcon(type: TxType): string {
  if (type === 'payout_to_professional') return 'arrow-down-circle';
  if (type === 'referral_reward') return 'gift';
  if (type === 'refund') return 'refresh-circle';
  return 'cash';
}

function txColor(type: TxType): string {
  if (type === 'referral_reward') return '#7C3AED';
  if (type === 'refund') return '#D97706';
  return '#16A34A';
}

export default function PayoutsScreen() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await walletApi.getMyWallet();
      const data: WalletData = res.data?.data ?? res.data ?? null;
      setWallet(data);
    } catch { /* garde l'état précédent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#1056E0" /></View>
      </SafeAreaView>
    );
  }

  const payouts = wallet?.transactions.filter(t => t.type === 'payout_to_professional') ?? [];
  const referrals = wallet?.transactions.filter(t => t.type === 'referral_reward') ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Portefeuille</Text>
        <Text style={s.subtitle}>Solde, reversements et crédits de parrainage</Text>
      </View>

      {/* Balance card */}
      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>Solde disponible</Text>
        <Text style={s.balanceValue}>{fmt(wallet?.balance ?? 0)}</Text>
        <View style={s.balanceStatsRow}>
          <View style={s.balanceStat}>
            <Ionicons name="arrow-down-circle" size={14} color="#16A34A" />
            <Text style={s.balanceStatText}>
              {payouts.length} reversement{payouts.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={[s.balanceStat, { marginLeft: 16 }]}>
            <Ionicons name="gift" size={14} color="#7C3AED" />
            <Text style={s.balanceStatText}>
              {referrals.length} parrainage{referrals.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={wallet?.transactions ?? []}
        keyExtractor={(it) => it.id}
        contentContainerStyle={(wallet?.transactions.length ?? 0) === 0 ? s.emptyWrap : { padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor="#1056E0"
          />
        }
        ListHeaderComponent={
          (wallet?.transactions.length ?? 0) > 0
            ? <Text style={s.listHeader}>Historique des transactions</Text>
            : null
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="wallet-outline" size={44} color="#9CA3AF" />
            <Text style={s.emptyTitle}>Aucune transaction pour le moment</Text>
            <Text style={s.emptyMsg}>
              Les reversements de réservations et les récompenses de parrainage apparaîtront ici.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = txColor(item.type);
          const icon = txIcon(item.type);
          const label = item.booking?.propertyTitle
            ? `${item.booking.propertyTitle}`
            : txLabel(item.type);
          const sub = item.booking
            ? `${fmtDate(item.booking.startDate)}${item.fee > 0 ? ` · frais ${fmt(item.fee)}` : ''}`
            : fmtDate(item.date);
          return (
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: `${color}18` }]}>
                <Ionicons name={icon as any} size={20} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle} numberOfLines={1}>{label}</Text>
                <Text style={s.rowType}>{txLabel(item.type)}</Text>
                {!!sub && <Text style={s.rowSub}>{sub}</Text>}
              </View>
              <Text style={[s.rowNet, { color }]}>+{fmt(item.amount)}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  balanceCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#1056E0', borderRadius: 18,
    padding: 20,
    shadowColor: '#1056E0', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 6 },
  balanceValue: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  balanceStatsRow: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  balanceStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  balanceStatText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  listHeader: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  rowType: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  rowSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  rowNet: { fontSize: 15, fontWeight: '800' },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyMsg: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 19 },
});
