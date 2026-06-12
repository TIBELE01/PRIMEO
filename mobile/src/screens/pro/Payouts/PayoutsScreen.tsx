// PayoutsScreen — historique des reversements (wallet pro). Crédit automatique
// du net (après frais Genius Pay) des réservations confirmées payées en ligne.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { payoutsApi } from '../../../services/api/endpoints/payouts';

interface PayoutItem {
  id: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  feePercent: string | number;
  status: string;
  createdAt: string;
  booking?: { id: string; startDate: string; endDate: string; property?: { title?: string } };
}

interface Summary {
  totalPaidOut: number;
  payoutsCount: number;
  pendingNet: number;
  pendingCount: number;
  feePercent: number;
}

const fmt = (n: number) => `${(n ?? 0).toLocaleString('fr-FR')} FCFA`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function PayoutsScreen() {
  const [items, setItems] = useState<PayoutItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.allSettled([payoutsApi.list(1, 50), payoutsApi.getSummary()]);
      if (listRes.status === 'fulfilled') {
        const d = listRes.value.data?.data ?? listRes.value.data;
        setItems(Array.isArray(d) ? d : []);
      }
      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value.data?.data ?? sumRes.value.data ?? null);
      }
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

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Mes reversements</Text>
        <Text style={s.subtitle}>Crédités automatiquement sur votre portefeuille</Text>
      </View>

      {summary && (
        <View style={s.summaryRow}>
          <View style={[s.card, { marginRight: 6 }]}>
            <Text style={s.cardLabel}>Total reversé</Text>
            <Text style={s.cardValue}>{fmt(summary.totalPaidOut)}</Text>
            <Text style={s.cardHint}>{summary.payoutsCount} opération{summary.payoutsCount > 1 ? 's' : ''}</Text>
          </View>
          <View style={[s.card, { marginLeft: 6 }]}>
            <Text style={s.cardLabel}>En attente</Text>
            <Text style={[s.cardValue, { color: '#D97706' }]}>{fmt(summary.pendingNet)}</Text>
            <Text style={s.cardHint}>{summary.pendingCount} réservation{summary.pendingCount > 1 ? 's' : ''}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={items.length === 0 ? s.emptyWrap : { padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#1056E0" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cash-outline" size={44} color="#9CA3AF" />
            <Text style={s.emptyTitle}>Aucun reversement pour le moment</Text>
            <Text style={s.emptyMsg}>
              Les paiements en ligne de vos réservations confirmées sont reversés automatiquement chaque jour.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={s.rowIcon}><Ionicons name="arrow-down-circle" size={22} color="#16A34A" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle} numberOfLines={1}>{item.booking?.property?.title ?? 'Réservation'}</Text>
              <Text style={s.rowSub}>{fmtDate(item.createdAt)} · brut {fmt(item.grossAmount)}{item.feeAmount > 0 ? ` · frais ${fmt(item.feeAmount)}` : ''}</Text>
            </View>
            <Text style={s.rowNet}>+{fmt(item.netAmount)}</Text>
          </View>
        )}
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
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cardLabel: { fontSize: 12, color: '#6B7280' },
  cardValue: { fontSize: 18, fontWeight: '800', color: '#16A34A', marginTop: 4 },
  cardHint: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  rowSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  rowNet: { fontSize: 15, fontWeight: '800', color: '#16A34A' },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyMsg: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 19 },
});
