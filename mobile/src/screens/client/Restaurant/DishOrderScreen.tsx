// Étape 4 du parcours restaurant (client) : commande d'un plat en plusieurs étapes,
// SANS PAIEMENT. 4.1 quantité · 4.2 options · 4.3 récapitulatif · 4.4 coordonnées ·
// 4.5 confirmation. À la confirmation : enregistrement + notification + conversation
// automatique (gérés côté backend par foodOrdersApi.create).
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ClientScreenProps } from '../../../navigation/types';
import { foodOrdersApi, type FoodOrderDeliveryType } from '../../../services/api/endpoints/foodOrdersApi';
import { usersApi } from '../../../services/api/endpoints/users';
import { useCurrency } from '../../../hooks/useCurrency';

const PRIMARY = '#DC2626';
type Props = ClientScreenProps<'DishOrder'>;

const QUICK_OPTIONS = ['Sauce piquante', 'Sans piment', 'Bien cuit', 'À point', 'Avec frites', 'Sans oignon'];
const DELIVERY_TYPES: { key: FoodOrderDeliveryType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'dine_in', label: 'Sur place', icon: 'restaurant-outline' },
  { key: 'takeaway', label: 'À emporter', icon: 'bag-handle-outline' },
  { key: 'delivery', label: 'Livraison', icon: 'bicycle-outline' },
];
const STEP_TITLES = ['Quantité', 'Options', 'Récapitulatif', 'Coordonnées', 'Confirmation'];

export default function DishOrderScreen({ navigation, route }: Props) {
  const { formatPrice } = useCurrency();
  const { dish, propertyId, restaurantName } = route.params;

  const [step, setStep] = useState(0);            // 0..4
  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState<string[]>([]);
  const [extraNote, setExtraNote] = useState('');
  const [deliveryType, setDeliveryType] = useState<FoodOrderDeliveryType>('dine_in');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const total = dish.price * quantity;

  useEffect(() => {
    usersApi.getProfile().then(res => {
      const u = res?.data?.user ?? res?.data?.data?.user ?? res?.data?.data ?? res?.data;
      const full = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
      if (full) setName(full);
      if (u?.phone) setPhone(String(u.phone));
    }).catch(() => {});
  }, []);

  const toggleOption = (o: string) =>
    setOptions(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);

  const optionSummary = [...options, extraNote.trim()].filter(Boolean).join(' · ');

  const canNext = () => {
    if (step === 0) return quantity >= 1;
    if (step === 3) return name.trim().length > 1 && phone.replace(/[^0-9]/g, '').length >= 8
      && (deliveryType !== 'delivery' || address.trim().length > 3);
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const itemNotes = optionSummary || undefined;
      const specialInstructions = [
        `Contact : ${name.trim()} · ${phone.trim()}`,
        instructions.trim() ? `Instructions : ${instructions.trim()}` : '',
      ].filter(Boolean).join(' — ');
      await foodOrdersApi.create({
        propertyId,
        items: [{ menuItemId: dish.id, quantity, notes: itemNotes }],
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? address.trim() : undefined,
        specialInstructions,
      });
      setDone(true);
    } catch (e: any) {
      Alert.alert('Commande impossible', e?.response?.data?.message ?? 'Une erreur est survenue. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Écran de succès ───────────────────────────────────────────────
  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successCircle}><Ionicons name="checkmark" size={52} color="#fff" /></View>
          <Text style={styles.successTitle}>Commande envoyée !</Text>
          <Text style={styles.successText}>
            {restaurantName ?? 'Le restaurant'} a reçu votre commande de {quantity}× {dish.name}.
            Une conversation a été ouverte pour suivre votre commande.
          </Text>
          <TouchableOpacity style={styles.successBtn} onPress={() => navigation.navigate('MyRestaurantOrders')}>
            <Text style={styles.successBtnText}>Voir mes commandes</Text>
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
        <Text style={styles.headerTitle}>Commander</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Barre de progression */}
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
      <Text style={styles.stepTitle}>{`Étape ${step + 1}/5 · ${STEP_TITLES[step]}`}</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Plat (rappel) */}
          <View style={styles.dishRow}>
            {dish.photoUrl ? <Image source={{ uri: dish.photoUrl }} style={styles.dishImg} /> : <View style={[styles.dishImg, styles.dishImgFallback]}><Text>🍽️</Text></View>}
            <View style={{ flex: 1 }}>
              <Text style={styles.dishName} numberOfLines={1}>{dish.name}</Text>
              <Text style={styles.dishPrice}>{formatPrice(dish.price)}</Text>
            </View>
          </View>

          {/* 4.1 Quantité */}
          {step === 0 && (
            <View style={styles.block}>
              <Text style={styles.label}>Nombre de portions</Text>
              <View style={styles.counter}>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
                  <Ionicons name="remove" size={22} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{quantity}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setQuantity(q => Math.min(50, q + 1))}>
                  <Ionicons name="add" size={22} color={PRIMARY} />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>Total : {formatPrice(total)}</Text>
            </View>
          )}

          {/* 4.2 Options / variantes */}
          {step === 1 && (
            <View style={styles.block}>
              <Text style={styles.label}>Options (facultatif)</Text>
              <View style={styles.chipWrap}>
                {QUICK_OPTIONS.map(o => {
                  const active = options.includes(o);
                  return (
                    <TouchableOpacity key={o} style={[styles.optChip, active && styles.optChipActive]} onPress={() => toggleOption(o)}>
                      <Text style={[styles.optChipText, active && { color: '#fff' }]}>{o}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.label, { marginTop: 16 }]}>Précisions</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={extraNote}
                onChangeText={setExtraNote}
                placeholder="ex : cuisson, accompagnement particulier…"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>
          )}

          {/* 4.3 Récapitulatif */}
          {step === 2 && (
            <View style={styles.block}>
              <Text style={styles.label}>Récapitulatif</Text>
              <Recap k="Plat" v={dish.name} />
              <Recap k="Quantité" v={`${quantity}`} />
              <Recap k="Options" v={optionSummary || 'Aucune'} />
              <View style={styles.totalRow}>
                <Text style={styles.totalKey}>Total</Text>
                <Text style={styles.totalVal}>{formatPrice(total)}</Text>
              </View>
              <Text style={styles.noPayNote}>Aucun paiement en ligne — vous réglez auprès du restaurant.</Text>
            </View>
          )}

          {/* 4.4 Coordonnées */}
          {step === 3 && (
            <View style={styles.block}>
              <Text style={styles.label}>Type de commande</Text>
              <View style={styles.chipWrap}>
                {DELIVERY_TYPES.map(d => {
                  const active = deliveryType === d.key;
                  return (
                    <TouchableOpacity key={d.key} style={[styles.dtChip, active && styles.optChipActive]} onPress={() => setDeliveryType(d.key)}>
                      <Ionicons name={d.icon} size={16} color={active ? '#fff' : PRIMARY} />
                      <Text style={[styles.optChipText, active && { color: '#fff' }]}>{d.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Nom complet *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Votre nom" placeholderTextColor="#9CA3AF" />

              <Text style={[styles.label, { marginTop: 12 }]}>Téléphone *</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="07 00 00 00 00" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />

              {deliveryType === 'delivery' && (
                <>
                  <Text style={[styles.label, { marginTop: 12 }]}>Adresse de livraison *</Text>
                  <TextInput style={[styles.input, styles.inputMulti]} value={address} onChangeText={setAddress} placeholder="Quartier, rue, points de repère…" placeholderTextColor="#9CA3AF" multiline />
                </>
              )}

              <Text style={[styles.label, { marginTop: 12 }]}>Instructions spéciales</Text>
              <TextInput style={[styles.input, styles.inputMulti]} value={instructions} onChangeText={setInstructions} placeholder="ex : sonner à l'interphone, allergie…" placeholderTextColor="#9CA3AF" multiline />
            </View>
          )}

          {/* 4.5 Confirmation */}
          {step === 4 && (
            <View style={styles.block}>
              <Text style={styles.label}>Confirmez votre commande</Text>
              <Recap k="Plat" v={`${quantity}× ${dish.name}`} />
              <Recap k="Options" v={optionSummary || 'Aucune'} />
              <Recap k="Type" v={DELIVERY_TYPES.find(d => d.key === deliveryType)?.label ?? ''} />
              {deliveryType === 'delivery' ? <Recap k="Adresse" v={address.trim()} /> : null}
              <Recap k="Contact" v={`${name.trim()} · ${phone.trim()}`} />
              {instructions.trim() ? <Recap k="Instructions" v={instructions.trim()} /> : null}
              <View style={styles.totalRow}>
                <Text style={styles.totalKey}>Total à régler sur place</Text>
                <Text style={styles.totalVal}>{formatPrice(total)}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pied : navigation entre étapes */}
      <View style={styles.footer}>
        {step < 4 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canNext() && { opacity: 0.5 }]}
            onPress={() => canNext() && setStep(s => s + 1)}
            disabled={!canNext()}
          >
            <Text style={styles.nextBtnText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.nextBtn, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.nextBtnText}>Confirmer la commande</Text></>}
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
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 14 },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  progressNum: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
  progressLine: { width: 22, height: 2, backgroundColor: '#E5E7EB' },
  stepTitle: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: PRIMARY, marginTop: 8 },
  content: { padding: 16, paddingBottom: 24 },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, marginBottom: 16 },
  dishImg: { width: 52, height: 52, borderRadius: 10 },
  dishImgFallback: { backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  dishName: { fontSize: 15, fontWeight: '800', color: '#111827' },
  dishPrice: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  block: { gap: 8 },
  label: { fontSize: 14, fontWeight: '800', color: '#111827' },
  hint: { fontSize: 14, fontWeight: '700', color: PRIMARY, marginTop: 8 },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 8 },
  counterBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  counterValue: { fontSize: 28, fontWeight: '900', color: '#111827', minWidth: 50, textAlign: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  optChip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  optChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  optChipText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  dtChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#111827', backgroundColor: '#fff' },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F0F0', gap: 12 },
  recapKey: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  recapVal: { fontSize: 14, color: '#111827', fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalKey: { fontSize: 15, fontWeight: '800', color: '#111827', flexShrink: 1 },
  totalVal: { fontSize: 18, fontWeight: '900', color: PRIMARY },
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
