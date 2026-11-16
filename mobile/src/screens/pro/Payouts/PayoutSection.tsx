// PayoutSection — coordonnées de versement et demandes de versement du professionnel.
// Le portefeuille Primeo est virtuel : il ne détient pas de fonds. Le professionnel renseigne
// où recevoir son dû (Mobile Money ou banque), puis demande le versement de son solde.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { walletApi } from '../../../services/api/endpoints/wallet';

type Account = { method: string; holderName: string; accountNumber: string; bankName?: string | null };
type Withdrawal = { id: string; amount: number; status: string; method: string; createdAt: string; reference?: string | null; rejectionReason?: string | null };

const METHODS: { key: string; label: string }[] = [
  { key: 'orange_money', label: 'Orange Money' },
  { key: 'mtn_money', label: 'MTN Money' },
  { key: 'wave', label: 'Wave' },
  { key: 'moov_money', label: 'Moov Money' },
  { key: 'bank', label: 'Compte bancaire' },
];
const methodLabel = (k: string) => METHODS.find((m) => m.key === k)?.label ?? k;
const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'En attente', color: '#D97706', bg: '#FEF3C7' },
  paid:      { label: 'Versé',      color: '#059669', bg: '#D1FAE5' },
  rejected:  { label: 'Refusé',     color: '#DC2626', bg: '#FEE2E2' },
  cancelled: { label: 'Annulé',     color: '#6B7280', bg: '#F3F4F6' },
};
const fmt = (n: number) => `${(n ?? 0).toLocaleString('fr-FR')} FCFA`;
const errMsg = (e: any, fallback: string) => e?.response?.data?.error ?? e?.response?.data?.message ?? fallback;
const MIN = 1000;

export default function PayoutSection({ balance, onChanged }: { balance: number; onChanged: () => void }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [requests, setRequests] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState('wave');
  const [holder, setHolder] = useState('');
  const [number, setNumber] = useState('');
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState('');

  const load = useCallback(async () => {
    try {
      const [a, w] = await Promise.all([walletApi.getPayoutAccount(), walletApi.listWithdrawals()]);
      setAccount((a.data?.data ?? null) as Account | null);
      setRequests((w.data?.data ?? []) as Withdrawal[]);
    } catch { /* garde l'état précédent */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const openEdit = () => {
    setMethod(account?.method ?? 'wave'); setHolder(account?.holderName ?? '');
    setNumber(account?.accountNumber ?? ''); setBank(account?.bankName ?? '');
    setEditOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await walletApi.savePayoutAccount({
        method, holderName: holder.trim(), accountNumber: number.trim(),
        ...(method === 'bank' ? { bankName: bank.trim() } : {}),
      });
      setAccount(res.data?.data as Account);
      setEditOpen(false);
    } catch (e) { Alert.alert('Coordonnées invalides', errMsg(e, 'Impossible d’enregistrer vos coordonnées.')); }
    finally { setBusy(false); }
  };

  const submitRequest = async () => {
    const value = amount.trim() ? Number(amount.replace(/\s/g, '')) : undefined;
    if (value !== undefined && (!Number.isInteger(value) || value < MIN)) {
      Alert.alert('Montant invalide', `Le montant minimum d’un versement est de ${MIN.toLocaleString('fr-FR')} FCFA.`);
      return;
    }
    setBusy(true);
    try {
      await walletApi.requestWithdrawal(value);
      setReqOpen(false); setAmount('');
      Alert.alert('Demande envoyée', 'Votre demande de versement est enregistrée. Primeo effectue le virement sur vos coordonnées et vous serez notifié.');
      await load(); onChanged();
    } catch (e) { Alert.alert('Erreur', errMsg(e, 'Impossible d’envoyer la demande.')); }
    finally { setBusy(false); }
  };

  const cancel = (id: string) => {
    Alert.alert('Annuler la demande ?', 'Le montant sera remis sur votre solde.', [
      { text: 'Non', style: 'cancel' },
      { text: 'Annuler la demande', style: 'destructive', onPress: async () => {
        try { await walletApi.cancelWithdrawal(id); await load(); onChanged(); }
        catch (e) { Alert.alert('Erreur', errMsg(e, 'Impossible d’annuler.')); }
      } },
    ]);
  };

  if (loading) return <ActivityIndicator style={{ margin: 16 }} color="#1056E0" />;
  const canRequest = !!account && balance >= MIN;

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <Text style={s.title}>Recevoir mon dû</Text>
        <Text style={s.note}>
          Le portefeuille Primeo est <Text style={s.bold}>virtuel</Text> : il ne détient pas d’argent. Indiquez où vous
          souhaitez être payé ; Primeo vous vire le montant demandé sur ces coordonnées.
        </Text>
        {account ? (
          <View style={s.accountBox}>
            <Text style={s.accountMethod}>{methodLabel(account.method)}{account.bankName ? ` · ${account.bankName}` : ''}</Text>
            <Text style={s.accountLine}>{account.holderName}</Text>
            <Text style={s.accountLine}>{account.accountNumber}</Text>
          </View>
        ) : (
          <Text style={s.warn}>Aucune coordonnée de versement enregistrée.</Text>
        )}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.btnOutline} onPress={openEdit} accessibilityRole="button">
            <Text style={s.btnOutlineText}>{account ? 'Modifier mes coordonnées' : 'Renseigner mes coordonnées'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, !canRequest && s.btnDisabled]} disabled={!canRequest}
            onPress={() => { setAmount(''); setReqOpen(true); }} accessibilityRole="button"
          >
            <Text style={s.btnText}>Demander un versement</Text>
          </TouchableOpacity>
        </View>
        {account && balance < MIN && <Text style={s.hint}>Minimum de versement : {MIN.toLocaleString('fr-FR')} FCFA.</Text>}
      </View>

      {requests.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={s.listHeader}>Mes demandes de versement</Text>
          {requests.map((r) => {
            const st = STATUS[r.status] ?? STATUS['pending']!;
            return (
              <View key={r.id} style={s.reqRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.reqAmount}>{fmt(r.amount)}</Text>
                  <Text style={s.reqSub}>{methodLabel(r.method)} · {new Date(r.createdAt).toLocaleDateString('fr-FR')}</Text>
                  {r.status === 'paid' && !!r.reference && <Text style={s.reqSub}>Réf. {r.reference}</Text>}
                  {r.status === 'rejected' && !!r.rejectionReason && <Text style={[s.reqSub, { color: '#DC2626' }]}>{r.rejectionReason}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[s.badge, { backgroundColor: st.bg }]}><Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text></View>
                  {r.status === 'pending' && (
                    <TouchableOpacity onPress={() => cancel(r.id)}><Text style={s.cancel}>Annuler</Text></TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.sheetTitle}>Coordonnées de versement</Text>
              <Text style={s.label}>Moyen de réception</Text>
              <View style={s.chips}>
                {METHODS.map((m) => (
                  <TouchableOpacity key={m.key} style={[s.chip, method === m.key && s.chipActive]} onPress={() => setMethod(m.key)}>
                    <Text style={[s.chipText, method === m.key && s.chipTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {method === 'bank' && (<>
                <Text style={s.label}>Nom de la banque</Text>
                <TextInput style={s.input} value={bank} onChangeText={setBank} placeholder="Ex : SIB, Ecobank…" placeholderTextColor="#9CA3AF" />
              </>)}
              <Text style={s.label}>Nom du titulaire</Text>
              <TextInput style={s.input} value={holder} onChangeText={setHolder} placeholder="Nom tel qu’il apparaît sur le compte" placeholderTextColor="#9CA3AF" />
              <Text style={s.label}>{method === 'bank' ? 'IBAN / RIB' : 'Numéro Mobile Money'}</Text>
              <TextInput
                style={s.input} value={number} onChangeText={setNumber}
                keyboardType={method === 'bank' ? 'default' : 'phone-pad'} autoCapitalize="characters"
                placeholder={method === 'bank' ? 'CI93 …' : '07 XX XX XX XX'} placeholderTextColor="#9CA3AF"
              />
              <View style={s.btnRow}>
                <TouchableOpacity style={s.btnOutline} onPress={() => setEditOpen(false)}><Text style={s.btnOutlineText}>Annuler</Text></TouchableOpacity>
                <TouchableOpacity style={s.btn} onPress={save} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Enregistrer</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={reqOpen} animationType="slide" transparent onRequestClose={() => setReqOpen(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Demander un versement</Text>
            <Text style={s.note}>Solde disponible : <Text style={s.bold}>{fmt(balance)}</Text></Text>
            <Text style={s.label}>Montant (FCFA) — laissez vide pour tout verser</Text>
            <TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder={String(balance)} placeholderTextColor="#9CA3AF" />
            {!!account && <Text style={s.hint}>Versement sur : {methodLabel(account.method)} — {account.accountNumber}</Text>}
            <View style={s.btnRow}>
              <TouchableOpacity style={s.btnOutline} onPress={() => setReqOpen(false)}><Text style={s.btnOutlineText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={s.btn} onPress={submitRequest} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Envoyer la demande</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  note: { fontSize: 13, color: '#4B5563', lineHeight: 19 },
  bold: { fontWeight: '800', color: '#111827' },
  warn: { fontSize: 13, color: '#D97706', fontWeight: '600' },
  hint: { fontSize: 12, color: '#6B7280' },
  accountBox: { backgroundColor: '#F4F6FB', borderRadius: 12, padding: 12, gap: 2 },
  accountMethod: { fontSize: 13, fontWeight: '800', color: '#1056E0' },
  accountLine: { fontSize: 14, color: '#111827' },
  btnRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 6 },
  btn: { flexGrow: 1, minWidth: 140, backgroundColor: '#1056E0', borderRadius: 12, paddingVertical: 12, alignItems: 'center', paddingHorizontal: 14 },
  btnDisabled: { backgroundColor: '#9CA3AF' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnOutline: { flexGrow: 1, minWidth: 140, borderWidth: 1.5, borderColor: '#1056E0', borderRadius: 12, paddingVertical: 11, alignItems: 'center', paddingHorizontal: 14 },
  btnOutlineText: { color: '#1056E0', fontWeight: '800', fontSize: 14 },
  listHeader: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  reqRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, gap: 10 },
  reqAmount: { fontSize: 15, fontWeight: '800', color: '#111827' },
  reqSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  cancel: { fontSize: 12, color: '#DC2626', fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '88%' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { borderColor: '#1056E0', backgroundColor: '#EAF1FF' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#1056E0', fontWeight: '800' },
});
