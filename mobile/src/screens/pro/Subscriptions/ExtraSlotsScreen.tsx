// Publications supplémentaires — achat/résiliation de slots (500 FCFA/mois) qui
// s'ajoutent à la limite de la formule. Paiement Genius Pay (prorata du mois),
// renouvellement tacite mensuel, résiliation effective à la prochaine échéance.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
  Alert, RefreshControl, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { subscriptionsApi } from '../../../services/api/endpoints/subscriptions';

interface SlotsInfo {
  baseLimit: number;
  extraSlots: number;
  effectiveLimit: number;
  pricePerSlotFcfa: number;
  monthlySlotsCostFcfa: number;
  pendingRemoval: number;
  nextBillingDate: string;
}

const fmt = (n: number) => `${(n ?? 0).toLocaleString('fr-FR')} FCFA`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

export default function ExtraSlotsScreen() {
  const [info, setInfo] = useState<SlotsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState(1);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await subscriptionsApi.getSlots();
      setInfo(res.data?.data ?? res.data ?? null);
    } catch { /* garde l'état */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startPolling = (txId: string) => {
    setAwaitingPayment(true);
    let attempts = 0;
    const MAX = 40; // 40 × 3s = 2 min
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await subscriptionsApi.getSlotTransaction(txId);
        const status = res.data?.data?.status ?? res.data?.status;
        if (status === 'success') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setAwaitingPayment(false);
          await load(true);
          Alert.alert('Activé', 'Vos publications supplémentaires sont maintenant actives.');
          return;
        }
        if (status === 'failed' || attempts >= MAX) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setAwaitingPayment(false);
          if (status === 'failed') Alert.alert('Paiement échoué', 'Le paiement a été refusé. Réessayez.');
        }
      } catch { /* réseau — réessai prochain tick */ }
    }, 3000);
  };

  const openCheckout = (url: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url).catch(() => Alert.alert('Erreur', "Impossible d'ouvrir la page de paiement."));
    }
  };

  const handlePurchase = () => {
    Alert.alert(
      'Acheter des publications',
      `Acheter ${qty} publication(s) supplémentaire(s) à ${info?.pricePerSlotFcfa ?? 500} FCFA/mois chacune ? Le mois en cours est facturé au prorata via Genius Pay.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Payer',
          onPress: async () => {
            setBusy(true);
            try {
              const res = await subscriptionsApi.purchaseSlots(qty);
              const data = res.data?.data ?? res.data;
              if (data?.checkoutUrl) {
                openCheckout(data.checkoutUrl);
                startPolling(data.transactionId);
                Alert.alert('Paiement en cours', 'Finalisez le paiement Genius Pay. Vos publications seront activées automatiquement dès validation.');
              } else {
                await load(true);
                Alert.alert('Succès', 'Publications activées.');
              }
            } catch (e: any) {
              Alert.alert('Erreur', e?.response?.data?.error ?? 'Achat impossible. Réessayez.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Résilier des publications',
      `Résilier ${qty} publication(s) supplémentaire(s) ? Effet à la prochaine échéance (${fmtDate(info?.nextBillingDate)}) — elles restent utilisables d'ici là.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await subscriptionsApi.cancelSlots(qty);
              Alert.alert('Programmé', 'La résiliation prendra effet à la prochaine échéance.');
              await load(true);
            } catch (e: any) {
              Alert.alert('Erreur', e?.response?.data?.error ?? 'Résiliation impossible.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color="#1056E0" /></View></SafeAreaView>;
  }

  if (awaitingPayment) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1056E0" />
          <Text style={s.awaitingText}>En attente de confirmation Genius Pay…</Text>
          <Text style={s.awaitingNote}>Revenez ici une fois le paiement finalisé.</Text>
          <TouchableOpacity style={s.awaitingCancel} onPress={() => { if (pollRef.current) clearInterval(pollRef.current); setAwaitingPayment(false); }}>
            <Text style={s.awaitingCancelText}>Annuler la vérification</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#1056E0" />}>
        <Text style={s.title}>Publications supplémentaires</Text>
        <Text style={s.subtitle}>Dépassez la limite de votre formule — 500 FCFA / publication / mois</Text>

        {/* Synthèse */}
        <View style={s.card}>
          <View style={s.statRow}>
            <View style={s.stat}><Text style={s.statValue}>{info?.baseLimit ?? 0}</Text><Text style={s.statLabel}>Limite formule</Text></View>
            <View style={s.stat}><Text style={[s.statValue, { color: '#16A34A' }]}>+{info?.extraSlots ?? 0}</Text><Text style={s.statLabel}>Supplémentaires</Text></View>
            <View style={s.stat}><Text style={[s.statValue, { color: '#1056E0' }]}>{info?.effectiveLimit ?? 0}</Text><Text style={s.statLabel}>Limite totale</Text></View>
          </View>
          <View style={s.costRow}>
            <Ionicons name="card-outline" size={16} color="#6B7280" />
            <Text style={s.costText}>Coût mensuel actuel : <Text style={s.costStrong}>{fmt(info?.monthlySlotsCostFcfa ?? 0)}</Text></Text>
          </View>
          {!!info?.pendingRemoval && (
            <Text style={s.pending}>⏳ {info.pendingRemoval} publication(s) seront retirées le {fmtDate(info.nextBillingDate)}.</Text>
          )}
        </View>

        {/* Sélecteur de quantité */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Quantité</Text>
          <View style={s.stepper}>
            <TouchableOpacity style={s.stepBtn} onPress={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>
              <Ionicons name="remove" size={22} color={qty <= 1 ? '#CBD5E1' : '#1056E0'} />
            </TouchableOpacity>
            <Text style={s.qty}>{qty}</Text>
            <TouchableOpacity style={s.stepBtn} onPress={() => setQty(q => Math.min(100, q + 1))}>
              <Ionicons name="add" size={22} color="#1056E0" />
            </TouchableOpacity>
            <Text style={s.qtyCost}>= {fmt(qty * (info?.pricePerSlotFcfa ?? 500))}/mois</Text>
          </View>

          <TouchableOpacity style={[s.buyBtn, busy && s.btnDisabled]} onPress={handlePurchase} disabled={busy} activeOpacity={0.85}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.buyBtnText}>Acheter {qty} publication(s)</Text>}
          </TouchableOpacity>

          {!!info?.extraSlots && (
            <TouchableOpacity style={[s.cancelBtn, busy && s.btnDisabled]} onPress={handleCancel} disabled={busy} activeOpacity={0.85}>
              <Text style={s.cancelBtnText}>Résilier {qty} publication(s)</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={s.note}>
          Le mois en cours est facturé au prorata via Genius Pay. Les publications se renouvellent
          tacitement chaque mois ; toute résiliation prend effet à la prochaine échéance.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2, marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  costText: { fontSize: 13, color: '#6B7280' },
  costStrong: { fontWeight: '700', color: '#111827' },
  pending: { fontSize: 12, color: '#B45309', marginTop: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  stepBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 22, fontWeight: '800', color: '#111827', minWidth: 32, textAlign: 'center' },
  qtyCost: { fontSize: 13, color: '#6B7280', marginLeft: 'auto', fontWeight: '600' },
  buyBtn: { backgroundColor: '#1056E0', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { marginTop: 10, borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  cancelBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  note: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, paddingHorizontal: 4 },
  awaitingText: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 20, textAlign: 'center' },
  awaitingNote: { fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
  awaitingCancel: { marginTop: 28, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB' },
  awaitingCancelText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
});
