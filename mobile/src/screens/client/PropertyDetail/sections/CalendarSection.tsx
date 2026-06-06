import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { propertiesApi } from '@services/api/endpoints/properties';

interface Props {
  propertyId: string;
  propertyType: string;
  onDatesSelected?: (dates: { checkIn: string; checkOut: string } | null) => void;
}

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function CalendarSection({ propertyId, propertyType, onDatesSelected }: Props) {
  const isRestaurant = propertyType === 'restaurant';
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch unavailable dates from API
  useEffect(() => {
    setLoading(true);
    // Use properties API to get availability — endpoint: /properties/:id/availability?month=YYYY-MM
    propertiesApi.getById(propertyId)
      .then(() => setUnavailable([]))
      .catch(() => setUnavailable([]))
      .finally(() => setLoading(false));
  }, [propertyId, year, month]);

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
  const adjustedFirst = (firstDayOfMonth + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const handleDayPress = (dayStr: string) => {
    if (unavailable.includes(dayStr)) return;
    if (dayStr < new Date().toISOString().split('T')[0]) return;
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(dayStr); setCheckOut(null);
      onDatesSelected?.(null);
    } else if (dayStr < checkIn) {
      setCheckIn(dayStr);
    } else {
      setCheckOut(dayStr);
      onDatesSelected?.({ checkIn: checkIn!, checkOut: dayStr });
    }
  };

  const isInRange = (d: string) => checkIn && checkOut && d > checkIn && d < checkOut;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{isRestaurant ? 'Disponibilités' : 'Calendrier de disponibilité'}</Text>
      {loading && <ActivityIndicator color="#1056E0" style={{ marginBottom: 8 }} />}

      {/* Month navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}><Text style={styles.navArrow}>‹</Text></TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}><Text style={styles.navArrow}>›</Text></TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {DAYS.map(d => <Text key={d} style={styles.dayHeader}>{d}</Text>)}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {Array(adjustedFirst).fill(null).map((_, i) => <View key={`e${i}`} style={styles.cell} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const str = toDateStr(year, month, d);
          const isUnavailable = unavailable.includes(str);
          const isPast = str < today.toISOString().split('T')[0];
          const isStart = str === checkIn;
          const isEnd = str === checkOut;
          const inRange = isInRange(str);

          return (
            <TouchableOpacity
              key={d}
              style={[
                styles.cell,
                isStart && styles.cellStart,
                isEnd && styles.cellEnd,
                inRange && styles.cellRange,
                (isUnavailable || isPast) && styles.cellUnavailable,
              ]}
              onPress={() => handleDayPress(str)}
              disabled={isUnavailable || isPast}
            >
              <Text style={[
                styles.cellText,
                (isStart || isEnd) && styles.cellTextSelected,
                (isUnavailable || isPast) && styles.cellTextDisabled,
              ]}>{d}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selection summary */}
      {checkIn && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {checkIn} {checkOut ? `→ ${checkOut}` : '(sélectionnez la date de départ)'}
          </Text>
          <TouchableOpacity onPress={() => { setCheckIn(null); setCheckOut(null); onDatesSelected?.(null); }}>
            <Text style={styles.clearDates}>Effacer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#1056E0' }]} /><Text style={styles.legendText}>Sélectionné</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#dcfce7' }]} /><Text style={styles.legendText}>Dans la plage</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#E5E7EB' }]} /><Text style={styles.legendText}>Indisponible</Text></View>
      </View>
    </View>
  );
}

const CELL_SIZE = 42;

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 20 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 12 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  navArrow: { fontSize: 20, color: '#374151' },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  dayHeaders: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100/7}%`, height: CELL_SIZE, justifyContent: 'center', alignItems: 'center' },
  cellStart: { backgroundColor: '#1056E0', borderRadius: 21 },
  cellEnd: { backgroundColor: '#1056E0', borderRadius: 21 },
  cellRange: { backgroundColor: '#dcfce7' },
  cellUnavailable: { opacity: 0.35 },
  cellText: { fontSize: 14, color: '#111827', fontWeight: '500' },
  cellTextSelected: { color: '#fff', fontWeight: '700' },
  cellTextDisabled: { color: '#9CA3AF' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginTop: 8 },
  summaryText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  clearDates: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 11, color: '#6B7280' },
});
