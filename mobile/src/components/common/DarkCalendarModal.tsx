import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  TouchableWithoutFeedback, Platform, UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

const ACCENT        = '#1056E0';
const BG            = '#1A1A1A';
const SURFACE       = '#252525';
const BORDER        = '#333333';
const TEXT          = '#FFFFFF';
const TEXT_MUTED    = '#9CA3AF';
const TEXT_DISABLED = '#4A4A4A';
const RANGE_HL      = 'rgba(16, 86, 224, 0.20)';
const CELL          = 44;

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatFR(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

interface BaseProps {
  visible: boolean;
  unavailable?: string[];
  onClose: () => void;
}

interface SingleModeProps extends BaseProps {
  mode: 'single' | 'checkin' | 'checkout';
  existingCheckIn?: string | null;
  onConfirm: (date: string) => void;
}

interface RangeModeProps extends BaseProps {
  mode: 'range';
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
  onConfirm: (checkIn: string, checkOut: string) => void;
}

export type DarkCalendarProps = SingleModeProps | RangeModeProps;

export function DarkCalendarModal(props: DarkCalendarProps) {
  const { visible, unavailable = [], onClose } = props;

  const today    = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [year,       setYear]       = useState(today.getFullYear());
  const [month,      setMonth]      = useState(today.getMonth());
  const [selected,   setSelected]   = useState<string | null>(null);
  const [rangeCI,    setRangeCI]    = useState<string | null>(null);
  const [rangeCO,    setRangeCO]    = useState<string | null>(null);
  const [rangePhase, setRangePhase] = useState<'checkin' | 'checkout'>('checkin');

  useEffect(() => {
    if (!visible) return;
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    if (props.mode === 'range') {
      const ci = props.initialCheckIn ?? null;
      const co = props.initialCheckOut ?? null;
      setRangeCI(ci);
      setRangeCO(co);
      setRangePhase(ci ? 'checkout' : 'checkin');
    } else {
      setSelected(null);
    }
  }, [visible]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const adjustedFirst = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth   = new Date(year, month + 1, 0).getDate();

  const isDisabled = (str: string): boolean => {
    if (str < todayStr) return true;
    if (unavailable.includes(str)) return true;
    if (props.mode === 'checkout' && props.existingCheckIn && str <= props.existingCheckIn) return true;
    if (props.mode === 'range' && rangePhase === 'checkout' && rangeCI && str <= rangeCI) return true;
    return false;
  };

  const handleDay = (str: string) => {
    if (isDisabled(str)) return;
    if (props.mode === 'range') {
      if (rangePhase === 'checkin' || (rangeCI && str <= rangeCI)) {
        setRangeCI(str);
        setRangeCO(null);
        setRangePhase('checkout');
      } else {
        setRangeCO(str);
      }
    } else {
      setSelected(str);
    }
  };

  const doClose = () => {
    setSelected(null);
    setRangeCI(null);
    setRangeCO(null);
    setRangePhase('checkin');
    onClose();
  };

  const handleConfirm = () => {
    if (props.mode === 'range') {
      if (rangeCI && rangeCO) { props.onConfirm(rangeCI, rangeCO); doClose(); }
    } else {
      if (selected) { props.onConfirm(selected); doClose(); }
    }
  };

  const getTitle = (): string => {
    if (props.mode === 'checkin') return "Date d'arrivée";
    if (props.mode === 'checkout') return 'Date de départ';
    if (props.mode === 'range') return rangePhase === 'checkin' ? "Choisissez l'arrivée" : 'Choisissez le départ';
    return 'Choisir une date';
  };

  const canConfirm = props.mode === 'range'
    ? (rangeCI != null && rangeCO != null)
    : selected != null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={doClose}>
      <TouchableWithoutFeedback onPress={doClose}>
        <View style={s.overlay} />
      </TouchableWithoutFeedback>

      <View style={s.sheet}>
        <View style={s.handle} />
        <Text style={s.sheetTitle}>{getTitle()}</Text>

        {/* Range phase selector */}
        {props.mode === 'range' && (
          <View style={s.phaseRow}>
            <TouchableOpacity
              style={[s.phaseChip, rangePhase === 'checkin' && s.phaseChipActive]}
              onPress={() => { setRangeCO(null); setRangePhase('checkin'); }}
              accessibilityRole="button"
              accessibilityLabel="Modifier la date d'arrivée"
            >
              <Text style={s.phaseLabel}>Arrivée</Text>
              <Text style={[s.phaseValue, !rangeCI && s.phaseValueEmpty]}>
                {rangeCI ? formatFR(rangeCI) : 'Choisir'}
              </Text>
            </TouchableOpacity>
            <Text style={s.phaseSep}>→</Text>
            <View style={[s.phaseChip, rangePhase === 'checkout' && s.phaseChipActive]}>
              <Text style={s.phaseLabel}>Départ</Text>
              <Text style={[s.phaseValue, !rangeCO && s.phaseValueEmpty]}>
                {rangeCO ? formatFR(rangeCO) : 'Choisir'}
              </Text>
            </View>
          </View>
        )}

        {/* Month navigation */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn} accessibilityRole="button" accessibilityLabel="Mois précédent">
            <Text style={s.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.navBtn} accessibilityRole="button" accessibilityLabel="Mois suivant">
            <Text style={s.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={s.dayHeaders}>
          {DAYS.map(d => <Text key={d} style={s.dayHeader}>{d}</Text>)}
        </View>

        {/* Calendar grid */}
        <View style={s.grid}>
          {Array(adjustedFirst).fill(null).map((_, i) => <View key={`e${i}`} style={s.cell} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d      = i + 1;
            const str    = toDateStr(year, month, d);
            const dis    = isDisabled(str);
            const sel    = str === selected;
            const isStart  = props.mode === 'range' && str === rangeCI;
            const isEnd    = props.mode === 'range' && str === rangeCO;
            const inRange  = props.mode === 'range' && rangeCI != null && rangeCO != null
                             && str > rangeCI && str < rangeCO;
            const highlighted = sel || isStart || isEnd;

            return (
              <TouchableOpacity
                key={d}
                style={[s.cell, inRange && s.cellInRange]}
                onPress={() => handleDay(str)}
                disabled={dis}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${d} ${MONTHS[month]} ${year}`}
                accessibilityState={{ selected: highlighted }}
              >
                <View style={highlighted ? s.cellCircle : undefined}>
                  <Text style={[
                    s.cellText,
                    highlighted && s.cellTextHL,
                    dis        && s.cellTextDis,
                    inRange    && s.cellTextRange,
                  ]}>
                    {d}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected date recap (single modes) */}
        {props.mode !== 'range' && selected && (
          <View style={s.recap}>
            <Text style={s.recapLabel}>
              {props.mode === 'checkin' ? 'Arrivée' : props.mode === 'checkout' ? 'Départ' : 'Date sélectionnée'}
            </Text>
            <Text style={s.recapDate}>{formatFR(selected)}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={s.cancelBtn} onPress={doClose} accessibilityRole="button" accessibilityLabel="Annuler">
            <Text style={s.cancelText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.confirmBtn, !canConfirm && s.confirmBtnDis]}
            onPress={handleConfirm}
            disabled={!canConfirm}
            accessibilityRole="button"
            accessibilityLabel="Confirmer"
          >
            <Text style={s.confirmText}>Confirmer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 16 },

  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  phaseChip: { flex: 1, backgroundColor: SURFACE, borderRadius: 12, padding: 10, borderWidth: 1.5, borderColor: BORDER },
  phaseChipActive: { borderColor: ACCENT },
  phaseLabel: { fontSize: 10, color: TEXT_MUTED, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  phaseValue: { fontSize: 13, fontWeight: '700', color: TEXT },
  phaseValueEmpty: { color: TEXT_MUTED, fontWeight: '400' },
  phaseSep: { fontSize: 18, color: TEXT_MUTED },

  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: SURFACE, justifyContent: 'center', alignItems: 'center' },
  navArrow: { fontSize: 22, color: TEXT, lineHeight: 28 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: TEXT },

  dayHeaders: { flexDirection: 'row', marginBottom: 6 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, color: TEXT_MUTED, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  cell: { width: `${100 / 7}%` as any, height: CELL, justifyContent: 'center', alignItems: 'center' },
  cellInRange: { backgroundColor: RANGE_HL },
  cellCircle: {
    width: CELL - 6, height: CELL - 6,
    borderRadius: (CELL - 6) / 2,
    backgroundColor: ACCENT,
    justifyContent: 'center', alignItems: 'center',
  },
  cellText:      { fontSize: 14, color: TEXT, fontWeight: '500' },
  cellTextHL:    { color: '#fff', fontWeight: '700' },
  cellTextDis:   { color: TEXT_DISABLED },
  cellTextRange: { color: TEXT, fontWeight: '600' },

  recap: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: SURFACE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16, borderWidth: 1.5, borderColor: ACCENT,
  },
  recapLabel: { fontSize: 13, color: TEXT_MUTED, fontWeight: '500' },
  recapDate:  { fontSize: 14, fontWeight: '700', color: ACCENT },

  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER, alignItems: 'center',
  },
  cancelText:   { fontSize: 15, fontWeight: '600', color: TEXT_MUTED },
  confirmBtn:   { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: ACCENT, alignItems: 'center' },
  confirmBtnDis: { opacity: 0.4 },
  confirmText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
});
