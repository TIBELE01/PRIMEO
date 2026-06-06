// Calendrier visuel pour sélectionner une plage de dates (arrivée → départ).
// Affiche le prix par nuit dans chaque cellule si pricePerNight est fourni.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const DAYS_SHORT = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

interface Props {
  checkIn: string;
  checkOut: string;
  onChangeCheckIn: (d: string) => void;
  onChangeCheckOut: (d: string) => void;
  pricePerNight?: number | null;
  color?: string;
}

function toStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function parseLocal(s: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(s + 'T00:00:00');
}
function fmtFr(s: string): string {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
function nightCount(ci: string, co: string): number {
  const a = parseLocal(ci), b = parseLocal(co);
  if (!a || !b || b <= a) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function MiniCalendar({
  checkIn, checkOut, onChangeCheckIn, onChangeCheckOut,
  pricePerNight, color = '#1056E0',
}: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  // phase : 'ci' = sélection arrivée, 'co' = sélection départ
  const [phase, setPhase] = useState<'ci' | 'co'>('ci');

  const ciDate = parseLocal(checkIn);
  const coDate = parseLocal(checkOut);
  const todayStr = toStr(today.getFullYear(), today.getMonth(), today.getDate());
  const nights = nightCount(checkIn, checkOut);
  const totalPrice = pricePerNight != null && nights > 0
    ? pricePerNight * nights
    : null;

  const firstWeekDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const handleDay = (day: number) => {
    const str = toStr(year, month, day);
    if (phase === 'ci') {
      onChangeCheckIn(str);
      onChangeCheckOut('');
      setPhase('co');
    } else {
      const selected = parseLocal(str);
      if (ciDate && selected && selected <= ciDate) {
        // La date cliquée est avant ou égale à l'arrivée → reset arrivée
        onChangeCheckIn(str);
        onChangeCheckOut('');
      } else {
        onChangeCheckOut(str);
        setPhase('ci');
      }
    }
  };

  // Cellules vides + jours du mois
  const cells: (number | null)[] = [...Array(firstWeekDay).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <View style={mc.wrap}>
      {/* Navigation mois */}
      <View style={mc.navRow}>
        <TouchableOpacity style={mc.navBtn} onPress={prevMonth} hitSlop={8}>
          <Text style={mc.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={mc.monthTitle}>{MONTHS_FR[month]} {year}</Text>
        <TouchableOpacity style={mc.navBtn} onPress={nextMonth} hitSlop={8}>
          <Text style={mc.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Chips arrivée / départ */}
      <View style={mc.phaseRow}>
        <TouchableOpacity
          style={[mc.phaseChip, phase === 'ci' && { borderColor: color, borderWidth: 2 }]}
          onPress={() => setPhase('ci')}
        >
          <Text style={mc.phaseLabel}>Arrivée</Text>
          <Text style={[mc.phaseValue, !checkIn && mc.phaseValueEmpty]}>
            {checkIn ? fmtFr(checkIn) : 'Choisir'}
          </Text>
        </TouchableOpacity>

        <Text style={mc.arrow}>→</Text>

        <TouchableOpacity
          style={[mc.phaseChip, phase === 'co' && { borderColor: color, borderWidth: 2 }]}
          onPress={() => checkIn && setPhase('co')}
        >
          <Text style={mc.phaseLabel}>Départ</Text>
          <Text style={[mc.phaseValue, !checkOut && mc.phaseValueEmpty]}>
            {checkOut ? fmtFr(checkOut) : 'Choisir'}
          </Text>
        </TouchableOpacity>

        {totalPrice != null && (
          <View style={[mc.priceTag, { backgroundColor: color }]}>
            <Text style={mc.priceTagNights}>{nights} nuit{nights > 1 ? 's' : ''}</Text>
            <Text style={mc.priceTagTotal}>{totalPrice.toLocaleString('fr-FR')} F</Text>
          </View>
        )}
      </View>

      {/* En-têtes jours */}
      <View style={mc.grid}>
        {DAYS_SHORT.map(d => (
          <Text key={d} style={mc.dayHeader}>{d}</Text>
        ))}

        {cells.map((day, idx) => {
          if (day === null) return <View key={`e-${idx}`} style={mc.cell} />;
          const str = toStr(year, month, day);
          const isPast = str < todayStr;
          const isCI = str === checkIn;
          const isCO = str === checkOut;
          const inRange = ciDate && coDate
            ? new Date(str + 'T00:00:00') > ciDate && new Date(str + 'T00:00:00') < coDate
            : false;

          return (
            <TouchableOpacity
              key={`d-${idx}`}
              style={[
                mc.cell,
                inRange && [mc.cellRange, { backgroundColor: color + '20' }],
                (isCI || isCO) && [mc.cellSelected, { backgroundColor: color }],
              ]}
              onPress={() => !isPast && handleDay(day)}
              disabled={isPast}
              activeOpacity={0.7}
            >
              <Text style={[
                mc.dayNum,
                isPast && mc.dayPast,
                str === todayStr && mc.dayToday,
                (isCI || isCO) && mc.dayNumSelected,
              ]}>
                {day}
              </Text>
              {pricePerNight != null && !isPast && (
                <Text style={[mc.dayPrice, (isCI || isCO) && mc.dayPriceSelected]}>
                  {(pricePerNight / 1000).toFixed(0)}k
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Effacer les dates */}
      {(checkIn || checkOut) && (
        <TouchableOpacity
          style={mc.clearWrap}
          onPress={() => { onChangeCheckIn(''); onChangeCheckOut(''); setPhase('ci'); }}
        >
          <Text style={mc.clearText}>✕ Effacer les dates</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const mc = StyleSheet.create({
  wrap: {},
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  navBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  navArrow: { fontSize: 22, color: '#374151', lineHeight: 26 },
  monthTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  phaseChip: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8,
  },
  phaseLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  phaseValue: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 2 },
  phaseValueEmpty: { color: '#C4C9D4', fontWeight: '400' },
  arrow: { fontSize: 16, color: '#9CA3AF' },
  priceTag: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  priceTagNights: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  priceTagTotal: { fontSize: 13, color: '#fff', fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayHeader: {
    width: '14.28%', textAlign: 'center',
    fontSize: 11, color: '#9CA3AF', fontWeight: '600',
    paddingBottom: 8,
  },
  cell: {
    width: '14.28%', aspectRatio: 1,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 8,
  },
  cellRange: {},
  cellSelected: { borderRadius: 8 },
  dayNum: { fontSize: 13, fontWeight: '500', color: '#111827' },
  dayPast: { color: '#D1D5DB' },
  dayToday: { fontWeight: '800', color: '#1056E0' },
  dayNumSelected: { color: '#fff', fontWeight: '700' },
  dayPrice: { fontSize: 8, color: '#9CA3AF', marginTop: 1 },
  dayPriceSelected: { color: 'rgba(255,255,255,0.75)' },
  clearWrap: { alignSelf: 'center', marginTop: 10 },
  clearText: { fontSize: 12, color: '#6B7280', textDecorationLine: 'underline' },
});
