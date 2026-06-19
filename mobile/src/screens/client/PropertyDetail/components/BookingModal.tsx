import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Property } from '@/types/property';
import { PaymentOptionsSelector } from '../../Booking/PaymentOptionsSelector';
import { todayStr, addDaysStr, countNights, formatShortDateFR } from '../../../../utils/dates';
import { DarkCalendarModal } from '../../../../components/common/DarkCalendarModal';

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
  const [showCheckinCal, setShowCheckinCal] = useState(false);
  const [showCheckoutCal, setShowCheckoutCal] = useState(false);

  const nights = nightsBetween(checkIn, checkOut);
  const totalAmount = (property.pricePerNight ?? 0) * Math.max(1, nights);

  return (
    <>
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

          {/* Date selectors — ouvrent un calendrier sombre */}
          <View style={styles.dateBlock}>
            <Text style={styles.label}>Dates</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateItem}
                onPress={() => setShowCheckinCal(true)}
                accessibilityRole="button"
                accessibilityLabel={`Date d'arrivée : ${fmtDate(checkIn)}`}
              >
                <Text style={styles.dateLabel}>Arrivée</Text>
                <View style={styles.datePicker}>
                  <Text style={styles.dateValue}>{fmtDate(checkIn)}</Text>
                  <Text style={styles.datePickerIcon}>📅</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.dateSep}>→</Text>
              <TouchableOpacity
                style={styles.dateItem}
                onPress={() => setShowCheckoutCal(true)}
                accessibilityRole="button"
                accessibilityLabel={`Date de départ : ${fmtDate(checkOut)}`}
              >
                <Text style={styles.dateLabel}>Départ</Text>
                <View style={styles.datePicker}>
                  <Text style={styles.dateValue}>{fmtDate(checkOut)}</Text>
                  <Text style={styles.datePickerIcon}>📅</Text>
                </View>
              </TouchableOpacity>
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

    <DarkCalendarModal
      visible={showCheckinCal}
      mode="checkin"
      onClose={() => setShowCheckinCal(false)}
      onConfirm={(d) => {
        setCheckIn(d);
        if (d >= checkOut) setCheckOut(addDays(d, 1));
      }}
    />
    <DarkCalendarModal
      visible={showCheckoutCal}
      mode="checkout"
      existingCheckIn={checkIn}
      onClose={() => setShowCheckoutCal(false)}
      onConfirm={(d) => setCheckOut(d)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 16, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  cancel: { fontSize: 15, color: '#6B7280', width: 60 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  body: { flex: 1, padding: 20 },
  propertySummary: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  propertyName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  propertyCity: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  label: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  dateBlock: { gap: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateItem: { flex: 1 },
  dateLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  datePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  datePickerIcon: { fontSize: 16 },
  dateValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  dateSep: { fontSize: 18, color: '#9CA3AF' },
  nightCount: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  guestsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#1056E0', justifyContent: 'center', alignItems: 'center' },
  cBtnText: { fontSize: 20, color: '#1056E0', fontWeight: '600', lineHeight: 22 },
  guestsNum: { fontSize: 15, fontWeight: '600', color: '#111827' },
  priceBreakdown: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceDesc: { fontSize: 14, color: '#374151' },
  priceAmt: { fontSize: 14, fontWeight: '700', color: '#111827' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', gap: 12 },
  footerTotal: { fontSize: 17, fontWeight: '800', color: '#1056E0' },
  footerNights: { fontSize: 12, color: '#9CA3AF' },
  confirmBtn: { flex: 1, backgroundColor: '#1056E0', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
