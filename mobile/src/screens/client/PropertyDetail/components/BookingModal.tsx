import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import type { Property } from '@/types/property';
import { PaymentOptionsSelector } from '../../Booking/PaymentOptionsSelector';
import { todayStr, addDaysStr, countNights, formatShortDateFR } from '../../../../utils/dates';

interface Props {
  visible: boolean;
  property: Property;
  onClose: () => void;
  onConfirm: (checkIn: string, checkOut: string, guests: number) => void;
}

// Dates manipulées via les utilitaires sûrs (YYYY-MM-DD) : addDaysStr/countNights
// ne jettent jamais (pas de RangeError "Invalid time value" qui crashait l'app).
const addDays = (d: string, n: number) => addDaysStr(d, n) ?? d;
const nightsBetween = (a: string, b: string) => countNights(a, b);
const fmtDate = (d: string) => formatShortDateFR(d);
const fmt = (n: number) => n.toLocaleString('fr-CI');

export function BookingModal({ visible, property, onClose, onConfirm }: Props) {
  const [checkIn, setCheckIn] = useState(todayStr());
  const [checkOut, setCheckOut] = useState(addDays(todayStr(), 3));
  const [guests, setGuests] = useState(1);
  const [paymentOption, setPaymentOption] = useState<'full_online' | 'ten_percent_online' | 'zero_online'>('ten_percent_online');

  const nights = nightsBetween(checkIn, checkOut);
  const totalAmount = (property.pricePerNight ?? 0) * Math.max(1, nights);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Fermer</Text></TouchableOpacity>
          <Text style={styles.title}>Réserver</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ gap: 20, paddingBottom: 40 }}>
          {/* Property summary */}
          <View style={styles.propertySummary}>
            <Text style={styles.propertyName} numberOfLines={2}>{property.name}</Text>
            <Text style={styles.propertyCity}>📍 {property.city}</Text>
          </View>

          {/* Date selectors (simplified — increment by tapping +/-) */}
          <View style={styles.dateBlock}>
            <Text style={styles.label}>Dates</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Arrivée</Text>
                <View style={styles.dateControls}>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => { const d = addDays(checkIn, -1); if (d >= todayStr()) setCheckIn(d); }}>
                    <Text style={styles.dateBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.dateValue}>{fmtDate(checkIn)}</Text>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => {
                      // L'arrivée ne doit jamais dépasser le départ : si elle le
                      // rejoint, on décale le départ pour garder au moins 1 nuit.
                      const d = addDays(checkIn, 1);
                      setCheckIn(d);
                      if (d >= checkOut) setCheckOut(addDays(d, 1));
                    }}
                  >
                    <Text style={styles.dateBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.dateSep}>→</Text>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Départ</Text>
                <View style={styles.dateControls}>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => { const d = addDays(checkOut, -1); if (d > checkIn) setCheckOut(d); }}>
                    <Text style={styles.dateBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.dateValue}>{fmtDate(checkOut)}</Text>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => setCheckOut(addDays(checkOut, 1))}>
                    <Text style={styles.dateBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <Text style={styles.nightCount}>{nights} nuit{nights > 1 ? 's' : ''}</Text>
          </View>

          {/* Guests */}
          <View>
            <Text style={styles.label}>Voyageurs</Text>
            <View style={styles.guestsRow}>
              <TouchableOpacity style={styles.cBtn} onPress={() => setGuests(g => Math.max(1, g - 1))}>
                <Text style={styles.cBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.guestsNum}>{guests} voyageur{guests > 1 ? 's' : ''}</Text>
              <TouchableOpacity style={styles.cBtn} onPress={() => setGuests(g => Math.min(property.maxGuests || 10, g + 1))}>
                <Text style={styles.cBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Price breakdown */}
          <View style={styles.priceBreakdown}>
            <Text style={styles.label}>Récapitulatif</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceDesc}>{fmt(property.pricePerNight ?? 0)} FCFA × {nights} nuit{nights > 1 ? 's' : ''}</Text>
              <Text style={styles.priceAmt}>{fmt(totalAmount)} FCFA</Text>
            </View>
          </View>

          {/* Payment options — 10% is highlighted as "recommended" */}
          <PaymentOptionsSelector
            totalAmount={totalAmount}
            selected={paymentOption}
            onSelect={setPaymentOption}
          />
        </ScrollView>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerTotal}>{fmt(totalAmount)} FCFA</Text>
            <Text style={styles.footerNights}>pour {nights} nuit{nights > 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => onConfirm(checkIn, checkOut, guests)}
          >
            <Text style={styles.confirmBtnText}>Confirmer la réservation</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  cancel: { fontSize: 15, color: '#6B7280', width: 60 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  body: { flex: 1, padding: 20 },
  propertySummary: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14 },
  propertyName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  propertyCity: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  label: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  dateBlock: { gap: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateItem: { flex: 1 },
  dateLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  dateControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 8 },
  dateBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  dateBtnText: { fontSize: 18, color: '#1056E0', fontWeight: '600', lineHeight: 20 },
  dateValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  dateSep: { fontSize: 18, color: '#9CA3AF' },
  nightCount: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  guestsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#1056E0', justifyContent: 'center', alignItems: 'center' },
  cBtnText: { fontSize: 20, color: '#1056E0', fontWeight: '600', lineHeight: 22 },
  guestsNum: { fontSize: 15, fontWeight: '600', color: '#111827' },
  priceBreakdown: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceDesc: { fontSize: 14, color: '#374151' },
  priceAmt: { fontSize: 14, fontWeight: '700', color: '#111827' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', gap: 12 },
  footerTotal: { fontSize: 17, fontWeight: '800', color: '#1056E0' },
  footerNights: { fontSize: 12, color: '#9CA3AF' },
  confirmBtn: { flex: 1, backgroundColor: '#1056E0', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
