// BookingFilterCard — carte de réservation en tête de fiche détail.
// Remplace le carousel d'images. Adapte son contenu selon le type de bien :
//   hébergement / hôtel  → arrivée + départ + voyageurs
//   restaurant           → date + heure + couverts
//   immobilier           → message d'intérêt (pas de dates)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { CalendarPickerModal } from './CalendarPickerModal';

type Kind = 'hebergement' | 'hotel' | 'real_estate' | 'restaurant';

const MONTHS_SHORT = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];

function fmtDate(str: string | null) {
  if (!str) return null;
  const [, m, d] = str.split('-');
  return `${parseInt(d, 10)} ${MONTHS_SHORT[parseInt(m, 10) - 1]}`;
}

const TIMES = [
  '11:00','11:30','12:00','12:30','13:00','13:30',
  '19:00','19:30','20:00','20:30','21:00','21:30',
];

interface Props {
  kind: Kind;
  color?: string;
  checkIn:   string | null;
  checkOut:  string | null;
  guests:    number;
  restoTime: string;
  onCheckInChange:   (d: string) => void;
  onCheckOutChange:  (d: string) => void;
  onGuestsChange:    (n: number) => void;
  onRestoTimeChange: (t: string) => void;
}

export function BookingFilterCard({
  kind, color = '#1056E0',
  checkIn, checkOut, guests, restoTime,
  onCheckInChange, onCheckOutChange, onGuestsChange, onRestoTimeChange,
}: Props) {
  const [calMode, setCalMode] = useState<'checkin'|'checkout'|null>(null);
  const [showTimes, setShowTimes] = useState(false);

  const openCheckIn  = () => setCalMode('checkin');
  const openCheckOut = () => setCalMode('checkout');

  const handleCalConfirm = (date: string) => {
    if (calMode === 'checkin')  onCheckInChange(date);
    if (calMode === 'checkout') onCheckOutChange(date);
    setCalMode(null);
  };

  /* ── Real estate : bloc simplifié ── */
  if (kind === 'real_estate') {
    return (
      <View style={[s.card, s.shadow]}>
        <Text style={s.reLead}>Vous êtes intéressé(e) ?</Text>
        <Text style={s.reSub}>Exprimez votre intérêt sans engagement. Le responsable vous contactera sous 24 h.</Text>
      </View>
    );
  }

  /* ── Restaurant : date + heure + couverts ── */
  if (kind === 'restaurant') {
    return (
      <>
        <View style={[s.card, s.shadow]}>
          <Text style={s.cardTitle}>Réserver une table</Text>
          <View style={s.row}>
            {/* Date */}
            <TouchableOpacity style={[s.field, s.fieldLeft]} onPress={openCheckIn} activeOpacity={0.7}>
              <Text style={s.fieldLabel}>Date</Text>
              <Text style={checkIn ? s.fieldValue : s.fieldPlaceholder}>
                {fmtDate(checkIn) ?? 'Choisir'}
              </Text>
            </TouchableOpacity>

            {/* Heure */}
            <TouchableOpacity style={[s.field, s.fieldRight]} onPress={() => setShowTimes(v => !v)} activeOpacity={0.7}>
              <Text style={s.fieldLabel}>Heure</Text>
              <Text style={restoTime ? s.fieldValue : s.fieldPlaceholder}>
                {restoTime || 'Choisir'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time picker inline */}
          {showTimes && (
            <View style={s.timePicker}>
              {TIMES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.timeChip, restoTime === t && { backgroundColor: color }]}
                  onPress={() => { onRestoTimeChange(t); setShowTimes(false); }}
                >
                  <Text style={[s.timeChipText, restoTime === t && { color: '#fff' }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Couverts */}
          <View style={s.guestsRow}>
            <Text style={s.guestsLabel}>Couverts</Text>
            <View style={s.stepper}>
              <TouchableOpacity
                style={s.stepBtn}
                onPress={() => onGuestsChange(Math.max(1, guests - 1))}
              >
                <Text style={s.stepTxt}>−</Text>
              </TouchableOpacity>
              <Text style={s.stepCount}>{guests}</Text>
              <TouchableOpacity
                style={[s.stepBtn, { backgroundColor: color }]}
                onPress={() => onGuestsChange(guests + 1)}
              >
                <Text style={[s.stepTxt, { color: '#fff' }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <CalendarPickerModal
          visible={calMode !== null}
          color={color}
          mode={calMode === 'checkin' ? 'single' : 'single'}
          onConfirm={handleCalConfirm}
          onClose={() => setCalMode(null)}
        />
      </>
    );
  }

  /* ── Hébergement / Hôtel : arrivée + départ + voyageurs ── */
  return (
    <>
      <View style={[s.card, s.shadow]}>
        <Text style={s.cardTitle}>Choisissez vos dates</Text>
        <View style={s.row}>
          {/* Arrivée */}
          <TouchableOpacity style={[s.field, s.fieldLeft]} onPress={openCheckIn} activeOpacity={0.7}>
            <Text style={s.fieldLabel}>Arrivée</Text>
            <Text style={checkIn ? s.fieldValue : s.fieldPlaceholder}>
              {fmtDate(checkIn) ?? 'Ajouter'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.fieldDivider} />

          {/* Départ */}
          <TouchableOpacity style={[s.field, s.fieldRight]} onPress={openCheckOut} activeOpacity={0.7}>
            <Text style={s.fieldLabel}>Départ</Text>
            <Text style={checkOut ? s.fieldValue : s.fieldPlaceholder}>
              {fmtDate(checkOut) ?? 'Ajouter'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Voyageurs */}
        <View style={s.guestsRow}>
          <Text style={s.guestsLabel}>Voyageurs</Text>
          <View style={s.stepper}>
            <TouchableOpacity
              style={s.stepBtn}
              onPress={() => onGuestsChange(Math.max(1, guests - 1))}
            >
              <Text style={s.stepTxt}>−</Text>
            </TouchableOpacity>
            <Text style={s.stepCount}>{guests}</Text>
            <TouchableOpacity
              style={[s.stepBtn, { backgroundColor: color }]}
              onPress={() => onGuestsChange(guests + 1)}
            >
              <Text style={[s.stepTxt, { color: '#fff' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recap nuits */}
        {checkIn && checkOut && (
          <View style={[s.recap, { borderColor: color + '40' }]}>
            <Text style={[s.recapText, { color }]}>
              {Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000))} nuit(s) sélectionnée(s)
            </Text>
            <TouchableOpacity onPress={() => { onCheckInChange(''); onCheckOutChange(''); }}>
              <Text style={s.clearBtn}>Effacer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Calendrier arrivée */}
      <CalendarPickerModal
        visible={calMode === 'checkin'}
        color={color}
        mode="checkin"
        onConfirm={handleCalConfirm}
        onClose={() => setCalMode(null)}
      />

      {/* Calendrier départ */}
      <CalendarPickerModal
        visible={calMode === 'checkout'}
        color={color}
        mode="checkout"
        existingCheckIn={checkIn}
        onConfirm={handleCalConfirm}
        onClose={() => setCalMode(null)}
      />
    </>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: '#fff', borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 14 },

  /* Date fields */
  row: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden', marginBottom: 14 },
  field: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
  fieldLeft: { borderRightWidth: 0 },
  fieldRight: {},
  fieldDivider: { width: 1, backgroundColor: '#E5E7EB' },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  fieldPlaceholder: { fontSize: 14, color: '#D1D5DB', fontWeight: '500' },

  /* Time picker */
  timePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  timeChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  /* Guests */
  guestsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  guestsLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  stepTxt: { fontSize: 18, color: '#374151', lineHeight: 22 },
  stepCount: { fontSize: 16, fontWeight: '700', color: '#111827', minWidth: 28, textAlign: 'center' },

  /* Recap */
  recap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  recapText: { fontSize: 13, fontWeight: '600' },
  clearBtn: { fontSize: 13, color: '#DC2626', fontWeight: '600' },

  /* Real estate */
  reLead: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  reSub: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
});
