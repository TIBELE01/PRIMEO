// CalendarPickerModal — popup calendrier pour sélection de dates dans la fiche détail.
// S'ouvre via Modal React Native en plein écran avec fond semi-opaque.
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  TouchableWithoutFeedback, Platform, UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatFR(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

interface Props {
  visible: boolean;
  color?: string;
  mode?: 'checkin' | 'checkout' | 'single'; // checkout requires an existing checkIn
  existingCheckIn?: string | null;
  unavailable?: string[];
  onConfirm: (date: string) => void;
  onClose: () => void;
}

export function CalendarPickerModal({
  visible, color = '#1056E0', mode = 'single',
  existingCheckIn, unavailable = [],
  onConfirm, onClose,
}: Props) {
  const today  = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const todayStr = today.toISOString().split('T')[0];

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const adjustedFirst = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isDisabled = (str: string) => {
    if (str < todayStr) return true;
    if (unavailable.includes(str)) return true;
    if (mode === 'checkout' && existingCheckIn && str <= existingCheckIn) return true;
    return false;
  };

  const handleDay = (str: string) => {
    if (isDisabled(str)) return;
    setSelected(str);
  };

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(selected);
    setSelected(null);
  };

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={s.overlay} />
      </TouchableWithoutFeedback>

      <View style={s.sheet}>
        {/* Handle */}
        <View style={s.handle} />

        {/* Title */}
        <Text style={s.sheetTitle}>
          {mode === 'checkin'  ? "Date d'arrivée"   :
           mode === 'checkout' ? 'Date de départ'   :
                                 'Choisir une date' }
        </Text>

        {/* Month nav */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
            <Text style={s.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
            <Text style={s.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={s.dayHeaders}>
          {DAYS.map(d => <Text key={d} style={s.dayHeader}>{d}</Text>)}
        </View>

        {/* Grid */}
        <View style={s.grid}>
          {Array(adjustedFirst).fill(null).map((_, i) => <View key={`e${i}`} style={s.cell} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d   = i + 1;
            const str = toDateStr(year, month, d);
            const dis = isDisabled(str);
            const sel = str === selected;

            return (
              <TouchableOpacity
                key={d}
                style={[s.cell, sel && { ...s.cellSel, backgroundColor: color }]}
                onPress={() => handleDay(str)}
                disabled={dis}
                activeOpacity={0.7}
              >
                <Text style={[s.cellText, sel && s.cellTextSel, dis && s.cellTextDis]}>
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected recap */}
        {selected && (
          <View style={[s.recap, { borderColor: color }]}>
            <Text style={s.recapLabel}>
              {mode === 'checkin' ? 'Arrivée' : mode === 'checkout' ? 'Départ' : 'Date sélectionnée'}
            </Text>
            <Text style={[s.recapDate, { color }]}>{formatFR(selected)}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
            <Text style={s.cancelText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.confirmBtn, { backgroundColor: color }, !selected && s.confirmBtnDis]}
            onPress={handleConfirm}
            disabled={!selected}
          >
            <Text style={s.confirmText}>Confirmer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const CELL = 44;

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14, shadowRadius: 20, elevation: 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 18 },

  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  navArrow: { fontSize: 22, color: '#374151', lineHeight: 28 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },

  dayHeaders: { flexDirection: 'row', marginBottom: 6 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  cell: { width: `${100/7}%` as any, height: CELL, justifyContent: 'center', alignItems: 'center' },
  cellSel: { borderRadius: CELL / 2 },
  cellText: { fontSize: 14, color: '#111827', fontWeight: '500' },
  cellTextSel: { color: '#fff', fontWeight: '700' },
  cellTextDis: { color: '#D1D5DB' },

  recap: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  recapLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  recapDate: { fontSize: 14, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  confirmBtnDis: { opacity: 0.45 },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
