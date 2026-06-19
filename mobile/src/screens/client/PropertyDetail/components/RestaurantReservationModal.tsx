// Modale de réservation de table (restaurants) — date, créneau horaire, couverts.
// Sans paiement : la réservation de table est gratuite et confirmée immédiatement.
import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Property } from '@/types/property';

interface Props {
  visible: boolean;
  property: Property;
  color?: string;
  onClose: () => void;
  // date au format YYYY-MM-DD, heure « HH:MM », nombre de couverts, note optionnelle
  onConfirm: (date: string, time: string, guests: number, note?: string) => void;
}

const today = () => new Date().toISOString().split('T')[0];
const addDays = (d: string, n: number) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split('T')[0];
};
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-CI', { weekday: 'short', day: 'numeric', month: 'short' });

// Créneaux par défaut (déjeuner + dîner) si la propriété n'expose pas d'horaires détaillés
const DEFAULT_SLOTS = ['12:00', '12:30', '13:00', '13:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

export function RestaurantReservationModal({ visible, property, color = '#DC2626', onClose, onConfirm }: Props) {
  const [date, setDate] = useState(today());
  const [time, setTime] = useState<string>('19:30');
  const [guests, setGuests] = useState(2);
  const [note, setNote] = useState('');

  const maxGuests = property.capacity || property.maxGuests || 20;
  const slots = useMemo(() => DEFAULT_SLOTS, []);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Fermer</Text></TouchableOpacity>
          <Text style={styles.title}>Réserver une table</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ gap: 22, paddingBottom: 40 }}>
          {/* Résumé restaurant */}
          <View style={styles.summary}>
            <Text style={styles.summaryName} numberOfLines={2}>{property.name}</Text>
            <Text style={styles.summaryCity}>📍 {property.city}</Text>
            {property.cuisineType ? <Text style={styles.summaryCity}>🍲 {property.cuisineType}</Text> : null}
          </View>

          {/* Date */}
          <View>
            <Text style={styles.label}>Jour</Text>
            <View style={styles.dateControls}>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => { const d = addDays(date, -1); if (d >= today()) setDate(d); }}
              >
                <Text style={[styles.dateBtnText, { color }]}>−</Text>
              </TouchableOpacity>
              <Text style={styles.dateValue}>{fmtDate(date)}</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setDate(addDays(date, 1))}>
                <Text style={[styles.dateBtnText, { color }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Créneau horaire */}
          <View>
            <Text style={styles.label}>Heure d'arrivée</Text>
            <View style={styles.slots}>
              {slots.map((s) => {
                const active = s === time;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.slot, active && { backgroundColor: color, borderColor: color }]}
                    onPress={() => setTime(s)}
                  >
                    <Text style={[styles.slotText, active && styles.slotTextActive]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Couverts */}
          <View>
            <Text style={styles.label}>Nombre de couverts</Text>
            <View style={styles.guestsRow}>
              <TouchableOpacity style={[styles.cBtn, { borderColor: color }]} onPress={() => setGuests(g => Math.max(1, g - 1))}>
                <Text style={[styles.cBtnText, { color }]}>−</Text>
              </TouchableOpacity>
              <Text style={styles.guestsNum}>{guests} couvert{guests > 1 ? 's' : ''}</Text>
              <TouchableOpacity style={[styles.cBtn, { borderColor: color }]} onPress={() => setGuests(g => Math.min(maxGuests, g + 1))}>
                <Text style={[styles.cBtnText, { color }]}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.maxNote}>Jusqu'à {maxGuests} couverts</Text>
          </View>

          {/* Demande spéciale */}
          <View>
            <Text style={styles.label}>Demande spéciale (optionnel)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Ex : table en terrasse, anniversaire…"
              placeholderTextColor="#9CA3AF"
              value={note}
              onChangeText={setNote}
              multiline
            />
          </View>

          <View style={styles.freeNote}>
            <Text style={styles.freeNoteText}>
              ✅ La réservation de table est gratuite et sans prépaiement. Vous recevrez une confirmation immédiate.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: color }]}
            onPress={() => onConfirm(date, time, guests, note.trim() || undefined)}
          >
            <Text style={styles.confirmBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 16, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  cancel: { fontSize: 15, color: '#6B7280', width: 60 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  body: { flex: 1, padding: 20 },
  summary: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, gap: 4 },
  summaryName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  summaryCity: { fontSize: 13, color: '#6B7280' },
  label: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  dateControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  dateBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  dateBtnText: { fontSize: 20, fontWeight: '700', lineHeight: 22 },
  dateValue: { fontSize: 15, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  slotText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  slotTextActive: { color: '#fff' },
  guestsRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  cBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  cBtnText: { fontSize: 20, fontWeight: '600', lineHeight: 22 },
  guestsNum: { fontSize: 15, fontWeight: '700', color: '#111827' },
  maxNote: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  noteInput: { minHeight: 64, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#FAFAFA', textAlignVertical: 'top' },
  freeNote: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  freeNoteText: { fontSize: 13, color: '#166534', lineHeight: 19 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  confirmBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
