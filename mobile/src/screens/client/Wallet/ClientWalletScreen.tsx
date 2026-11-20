// Portefeuille du client : gains de parrainage et remboursements, avec retrait.
// Le portefeuille Primeo est virtuel : le client demande un retrait vers son Mobile Money
// ou son compte bancaire, l'administration effectue le dépôt puis valide la demande.
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PageHeader } from '../../../components/layout/PageHeader';
import { walletApi } from '../../../services/api/endpoints/wallet';
import PayoutSection from '../../pro/Payouts/PayoutSection';

type Tx = { id: string; type: string; amount: number; notes?: string | null; date?: string | null };
type WalletData = { balance: number; currency: string; transactions: Tx[] };

const fmt = (n: number) => `${(n ?? 0).toLocaleString('fr-FR')} FCFA`;
const TX_LABEL: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  referral_reward: { label: 'Récompense de parrainage', icon: 'gift', color: '#7C3AED' },
  refund:          { label: 'Remboursement',            icon: 'refresh-circle', color: '#D97706' },
};

export function ClientWalletScreen() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sectionKey, setSectionKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await walletApi.getMyWallet();
      setWallet((res.data?.data ?? res.data ?? null) as WalletData | null);
    } catch { /* garde l'état précédent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Solde toujours à jour en revenant sur l'écran (récompense créditée, retrait traité…)
  useFocusEffect(useCallback(() => { void load(); setSectionKey((k) => k + 1); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <PageHeader title="Mon portefeuille" />
        <View style={s.center}><ActivityIndicator size="large" color="#1056E0" /></View>
      </SafeAreaView>
    );
  }

  const txs = wallet?.transactions ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PageHeader title="Mon portefeuille" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); setSectionKey((k) => k + 1); }} />}
      >
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Solde disponible</Text>
          <Text style={s.balanceValue}>{fmt(wallet?.balance ?? 0)}</Text>
          <Text style={s.balanceHint}>
            Gains de parrainage et remboursements. Retrait possible dès 1 000 FCFA vers Mobile Money ou compte bancaire.
          </Text>
        </View>

        <PayoutSection key={sectionKey} variant="client" balance={wallet?.balance ?? 0} onChanged={() => void load()} />

        <Text style={s.listHeader}>Historique des gains</Text>
        {txs.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>Aucun gain pour le moment. Parrainez vos proches pour gagner des FCFA !</Text></View>
        ) : txs.map((t) => {
          const meta = TX_LABEL[t.type] ?? { label: 'Crédit', icon: 'add-circle' as const, color: '#16A34A' };
          return (
            <View key={t.id} style={s.txRow}>
              <Ionicons name={meta.icon} size={22} color={meta.color} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.txLabel}>{meta.label}</Text>
                {!!t.date && <Text style={s.txSub}>{new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>}
              </View>
              <Text style={[s.txAmount, { color: meta.color }]}>+{fmt(t.amount)}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  balanceCard: { backgroundColor: '#1056E0', borderRadius: 18, padding: 20, marginBottom: 14 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  balanceValue: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 4 },
  balanceHint: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8, lineHeight: 17 },
  listHeader: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 },
  empty: { backgroundColor: '#fff', borderRadius: 14, padding: 18 },
  emptyText: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8 },
  txLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  txSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800' },
});
