// Étape 4 bis du parcours restaurant (client) : réservation d'une table en plusieurs
// étapes, SANS PAIEMENT. 4.1 date/heure · 4.2 couverts · 4.3 options · 4.4 récap ·
// 4.5 coordonnées · 4.6 confirmation. À la confirmation : booking mode:table →
// enregistrement + notification + conversation automatique (gérés par le backend).
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ClientScreenProps } from '../../../navigation/types';
import { bookingsApi } from '../../../services/api/endpoints/bookings';
import { usersApi } from '../../../services/api/endpoints/users';

const PRIMARY = '#DC2626';
type Props = ClientScreenProps<'TableReservation'>;

const TABLE_OPTIONS = ['En salle', 'Terrasse', 'Menu spécial', 'Anniversaire', 'Coin calme'];
const STEP_TITLES = ['Date & heure', 'Couverts', 'Options', 'Récapitulatif', 'Coordonnées', 'Confirmation'];

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function nextDays(count: number) {
  const days: { iso: string; label: string }[] = [];
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const label = i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : fmt.format(d);
    days.push({ iso: toISO(d), label });
  }
  return days;
}

function timeSlots() {
  const slots: string[] = [];
  for (let h = 11; h <= 22; h++) { slots.push(`${pad(h)}:00`); if (h < 22) slots.push(`${pad(h)}:30`); }
  return slots;
}

export default function TableReservationScreen({ navigation, route }: Props) {
  const { propertyId, restaurantName } = route.params;
  const days = useMemo(() => nextDays(14), []);
  const slots = useMemo(() => timeSlots(), []);

  const [step, setStep] = useState(0);            // 0..5
  const [date, setDate] = useState<string>(days[0].iso);
  const [time, setTime] = useState<string>('');
  const [guests, setGuests] = useState(2);
  const [options, setOptions] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instructions, setInstructions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    usersApi.getProfile().then(res => {
      const u = res?.data?.user ?? res?.data?.data?.user ?? res?.data?.data ?? res?.data;
      const full = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
      if (full) setName(full);
      if (u?.phone) setPhone(String(u.phone));
      if (u?.email) setEmail(String(u.email));
    }).catch(() => {});
  }, []);

  const dateLabel = days.find(d => d.iso === date)?.label ?? date;
  const optionSummary = options.join(', ');

  const toggleOption = (o: string) =>
    setOptions(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);

  const canNext = () => {
    if (step === 0) return !!date && !!time;
    if (step === 1) return guests >= 1;
    if (step === 4) return name.trim().length > 1 && phone.replace(/[^0-9]/g, '').length >= 8;
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      // Toutes les précisions sont condensées dans reservationTime (stocké comme
      // « specialRequests » côté backend pour les restaurants).
      const reservationTime = [
        time,
        optionSummary ? `Options : ${optionSummary}` : '',
        allergies.trim() ? `Allergies : ${allergies.trim()}` : '',
        instructions.trim() ? `Note : ${instructions.trim()}` : '',
      ].filter(Boolean).join(' — ');
      const [firstName, ...rest] = name.trim().split(' ');
      await bookingsApi.create({
        propertyId,
        startDate: date,
        endDate: date,
        guests,
        paymentOption: 'zero_online',
        contactFirstName: firstName,
        contactLastName: rest.join(' ') || firstName,
        contactPhone: phone.trim(),
        contactEmail: email.trim(),
        reservationTime,
      });
      setDone(true);
    } catch (e: any) {
      Alert.alert('Réservation impossible', e?.response?.data?.message ?? 'Une erreur est survenue. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successCircle}><Ionicons name="checkmark" size={52} color="#fff" /></View>
          <Text style={styles.successTitle}>Réservation envoyée !</Text>
          <Text style={styles.successText}>
            {restaurantName ?? 'Le restaurant'} a reçu votre demande pour {guests} couvert{guests > 1 ? 's' : ''} le {dateLabel} à {time}.
            Une conversation a été ouverte pour confirmer avec le restaurant.
          </Text>
          <TouchableOpacity style={styles.successBtn} onPress={() => navigation.navigate('MyBookings')}>
            <Text style={styles.successBtnText}>Voir mes réservations</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.successLink} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.successLinkText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (step === 0 ? navigation.goBack() : setStep(s => s - 1))} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Réserver une table</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.progressRow}>
        {STEP_TITLES.map((t, i) => (
          <View key={t} style={styles.progressItem}>
            <View style={[styles.progressDot, i <= step && { backgroundColor: PRIMARY }]}>
              <Text style={[styles.progressNum, i <= step && { color: '#fff' }]}>{i + 1}</Text>
            </View>
            {i < STEP_TITLES.length - 1 && <View style={[styles.progressLine, i < step && { backgroundColor: PRIMARY }]} />}
          </View>
        ))}
      </View>
      <Text style={styles.stepTitle}>{`Étape ${step + 1}/6 · ${STEP_TITLES[step]}`}</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* 4.1 Date & heure */}
          {step === 0 && (
            <View style={styles.block}>
              <Text style={styles.label}>Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {days.map(d => {
                  const active = d.iso === date;
                  return (
                    <TouchableOpacity key={d.iso} style={[styles.dateChip, active && styles.optChipActive]} onPress={() => setDate(d.iso)}>
                      <Text style={[styles.optChipText, active && { color: '#fff' }]}>{d.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={[styles.label, { marginTop: 16 }]}>Heure</Text>
              <View style={styles.chipWrap}>
                {slots.map(s => {
                  const active = s === time;
                  return (
                    <TouchableOpacity key={s} style={[styles.optChip, active && styles.optChipActive]} onPress={() => setTime(s)}>
                      <Text style={[styles.optChipText, active && { color: '#fff' }]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 4.2 Couverts */}
          {step === 1 && (
            <View style={styles.block}>
              <Text style={styles.label}>Nombre de couverts</Text>
              <View style={styles.counter}>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setGuests(g => Math.max(1, g - 1))}>
                  <Ionicons name="remove" size={22} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{guests}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setGuests(g => Math.min(30, g + 1))}>
                  <Ionicons name="add" size={22} color={PRIMARY} />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>{guests} personne{guests > 1 ? 's' : ''}</Text>
            </View>
          )}

          {/* 4.3 Options */}
          {step === 2 && (
            <View style={styles.block}>
              <Text style={styles.label}>Préférences (facultatif)</Text>
              <View style={styles.chipWrap}>
                {TABLE_OPTIONS.map(o => {
                  const active = options.includes(o);
                  return (
                    <TouchableOpacity key={o} style={[styles.optChip, active && styles.optChipActive]} onPress={() => toggleOption(o)}>
                      <Text style={[styles.optChipText, active && { color: '#fff' }]}>{o}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 4.4 Récapitulatif */}
          {step === 3 && (
            <View style={styles.block}>
              <Text style={styles.label}>Récapitulatif</Text>
              <Recap k="Date" v={dateLabel} />
              <Recap k="Heure" v={time} />
              <Recap k="Couverts" v={`${guests}`} />
              <Recap k="Options" v={optionSummary || 'Aucune'} />
              <Text style={styles.noPayNote}>Aucun paiement — la réservation est confirmée avec le restaurant.</Text>
            </View>
          )}

          {/* 4.5 Coordonnées */}
          {step === 4 && (
            <View style={styles.block}>
              <Text style={styles.label}>Nom complet *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Votre nom" placeholderTextColor="#9CA3AF" />
              <Text style={[styles.label, { marginTop: 12 }]}>Téléphone *</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="07 00 00 00 00" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
              <Text style={[styles.label, { marginTop: 12 }]}>Allergies / régimes</Text>
              <TextInput style={[styles.input, styles.inputMulti]} value={allergies} onChangeText={setAllergies} placeholder="ex : arachides, sans gluten…" placeholderTextColor="#9CA3AF" multiline />
              <Text style={[styles.label, { marginTop: 12 }]}>Instructions spéciales</Text>
              <TextInput style={[styles.input, styles.inputMulti]} value={instructions} onChangeText={setInstructions} placeholder="ex : chaise haute, occasion spéciale…" placeholderTextColor="#9CA3AF" multiline />
            </View>
          )}

          {/* 4.6 Confirmation */}
          {step === 5 && (
            <View style={styles.block}>
              <Text style={styles.label}>Confirmez votre réservation</Text>
              <Recap k="Restaurant" v={restaurantName ?? '—'} />
              <Recap k="Date" v={dateLabel} />
              <Recap k="Heure" v={time} />
              <Recap k="Couverts" v={`${guests}`} />
              <Recap k="Options" v={optionSummary || 'Aucune'} />
              <Recap k="Contact" v={`${name.trim()} · ${phone.trim()}`} />
              {allergies.trim() ? <Recap k="Allergies" v={allergies.trim()} /> : null}
              {instructions.trim() ? <Recap k="Note" v={instructions.trim()} /> : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {step < 5 ? (
          <TouchableOpacity style={[styles.nextBtn, !canNext() && { opacity: 0.5 }]} onPress={() => canNext() && setStep(s => s + 1)} disabled={!canNext()}>
            <Text style={styles.nextBtnText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.nextBtn, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.nextBtnText}>Confirmer la réservation</Text></>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function Recap({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.recapRow}>
      <Text style={styles.recapKey}>{k}</Text>
      <Text style={styles.recapVal}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#111827' },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 14 },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  progressNum: { fontSize: 11, fontWeight: '800', color: '#6B7280' },
  progressLine: { width: 16, height: 2, backgroundColor: '#E5E7EB' },
  stepTitle: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: PRIMARY, marginTop: 8 },
  content: { padding: 16, paddingBottom: 24 },
  block: { gap: 8 },
  label: { fontSize: 14, fontWeight: '800', color: '#111827' },
  hint: { fontSize: 14, fontWeight: '700', color: PRIMARY, marginTop: 8, textAlign: 'center' },
  chipRow: { gap: 8, paddingVertical: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dateChip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  optChip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  optChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  optChipText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 8 },
  counterBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  counterValue: { fontSize: 28, fontWeight: '900', color: '#111827', minWidth: 50, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#111827', backgroundColor: '#fff' },
  inputMulti: { minHeight: 64, textAlignVertical: 'top' },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F0F0', gap: 12 },
  recapKey: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  recapVal: { fontSize: 14, color: '#111827', fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  noPayNote: { fontSize: 12, color: '#6B7280', marginTop: 10, fontStyle: 'italic' },
  footer: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', backgroundColor: '#fff' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 15 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  successCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  successText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  successBtn: { backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  successBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  successLink: { paddingVertical: 8 },
  successLinkText: { color: '#6B7280', fontSize: 14, fontWeight: '700' },
});
