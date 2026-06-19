import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, TextInput, Share, type DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { availabilitiesApi } from '../../../services/api/endpoints/availabilities';

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAY_SHORT = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

type DayStatus = 'available' | 'blocked' | 'booked' | 'past' | 'selected';

interface DayData {
  status: DayStatus;
  price?: number;
  bookingId?: string;
}

export default function PropertyCalendarScreen({ route, navigation }: any) {
  const { propertyId } = route.params ?? {};
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [calData, setCalData] = useState<Record<string, DayData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [seasonalPrice, setSeasonalPrice] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  const toStr = (y: number, m: number, d: number) =>
    `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const todayStr = toStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const loadCalendar = useCallback(async () => {
    if (!propertyId) return;
    setIsLoading(true);
    try {
      const res = await availabilitiesApi.getCalendar(propertyId, viewDate.getFullYear(), viewDate.getMonth() + 1);
      const raw = res.data?.data ?? res.data ?? {};
      // raw.days: { "2024-01-15": { status, price, bookingId } }
      const days: Record<string, DayData> = raw.days ?? {};
      setCalData(days);
    } catch {
      // silently fail — show empty calendar
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, viewDate]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const getDayInfo = (dateStr: string): DayData => {
    if (dateStr < todayStr) return { status: 'past' };
    return calData[dateStr] ?? { status: 'available' };
  };

  const handleDayPress = (dateStr: string) => {
    const info = getDayInfo(dateStr);
    if (info.status === 'past' || info.status === 'booked') return;

    if (!rangeStart) {
      setRangeStart(dateStr);
      setSelectedDates([dateStr]);
    } else {
      const [start, end] = dateStr >= rangeStart ? [rangeStart, dateStr] : [dateStr, rangeStart];
      // fill all dates in range
      const dates: string[] = [];
      const cur = new Date(start);
      const endD = new Date(end);
      while (cur <= endD) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
      setSelectedDates(dates);
      setRangeStart(null);
    }
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setRangeStart(null);
  };

  const handleBlock = async () => {
    if (selectedDates.length === 0) return;
    const start = selectedDates[0];
    const end = selectedDates[selectedDates.length - 1];
    setIsBlocking(true);
    try {
      await availabilitiesApi.blockDates(propertyId, start, end, blockReason || undefined);
      const updated: Record<string, DayData> = { ...calData };
      selectedDates.forEach(d => { updated[d] = { status: 'blocked' }; });
      setCalData(updated);
      clearSelection();
      setShowBlockModal(false);
      setBlockReason('');
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de bloquer ces dates.');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleSetPrice = async () => {
    if (selectedDates.length === 0 || !seasonalPrice) return;
    const start = selectedDates[0];
    const end = selectedDates[selectedDates.length - 1];
    const price = Number(seasonalPrice);
    if (!price || price <= 0) return;
    setIsBlocking(true);
    try {
      await availabilitiesApi.setAvailability(propertyId, { startDate: start, endDate: end, isAvailable: true, price });
      const updated: Record<string, DayData> = { ...calData };
      selectedDates.forEach(d => { updated[d] = { status: 'available', price }; });
      setCalData(updated);
      clearSelection();
      setShowPriceModal(false);
      setSeasonalPrice('');
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de mettre à jour le tarif.');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblock = async () => {
    if (selectedDates.length === 0) return;
    const start = selectedDates[0];
    const end = selectedDates[selectedDates.length - 1];
    setIsBlocking(true);
    try {
      await availabilitiesApi.setAvailability(propertyId, { startDate: start, endDate: end, isAvailable: true });
      const updated: Record<string, DayData> = { ...calData };
      selectedDates.forEach(d => { updated[d] = { status: 'available' }; });
      setCalData(updated);
      clearSelection();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de débloquer ces dates.');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleExportIcal = async () => {
    try {
      const res = await availabilitiesApi.exportIcal(propertyId);
      await Share.share({ message: res.data, title: 'Calendrier iCal' });
    } catch {
      Alert.alert('Export iCal', 'L\'export iCal n\'est pas disponible pour le moment.');
    }
  };

  // ── Month view ──
  const renderMonthView = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const cells = [...Array(firstDow).fill(null), ...Array(daysInMonth).fill(0).map((_,i)=>i+1)];

    const STATUS_COLORS: Record<DayStatus, { bg: string; text: string; border?: string }> = {
      available: { bg: '#F0FDF4', text: '#111827' },
      blocked:   { bg: '#FEE2E2', text: '#DC2626' },
      booked:    { bg: '#DBEAFE', text: '#1D4ED8' },
      past:      { bg: '#F3F4F6', text: '#9CA3AF' },
      selected:  { bg: '#1056E0', text: '#fff' },
    };

    return (
      <View style={styles.monthGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={styles.cell} />;
          const ds = toStr(year, month, day);
          const info = getDayInfo(ds);
          const isSelected = selectedDates.includes(ds);
          const isRangeStart = rangeStart === ds;
          const colors = isSelected || isRangeStart ? STATUS_COLORS.selected : STATUS_COLORS[info.status];
          return (
            <TouchableOpacity
              key={i}
              style={[styles.cell, { backgroundColor: colors.bg }]}
              onPress={() => handleDayPress(ds)}
              activeOpacity={info.status === 'past' ? 1 : 0.7}
            >
              <Text style={[styles.cellDay, { color: colors.text }]}>{day}</Text>
              {info.price && info.status !== 'past' && (
                <Text style={[styles.cellPrice, { color: isSelected ? '#A7F3D0' : '#6B7280' }]}>
                  {(info.price/1000).toFixed(0)}k
                </Text>
              )}
              {info.status === 'booked' && <View style={styles.bookedDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ── Week view ──
  const renderWeekView = () => {
    const start = new Date(viewDate);
    start.setDate(start.getDate() - start.getDay());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
    return (
      <ScrollView>
        {days.map((d, i) => {
          const ds = d.toISOString().split('T')[0];
          const info = getDayInfo(ds);
          const isSelected = selectedDates.includes(ds);
          const isRangeStart = rangeStart === ds;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.weekRow, isSelected && styles.weekRowSelected, isRangeStart && styles.weekRowSelected]}
              onPress={() => handleDayPress(ds)}
            >
              <View style={styles.weekDateCol}>
                <Text style={styles.weekDayName}>{DAY_SHORT[d.getDay()]}</Text>
                <Text style={styles.weekDayNum}>{d.getDate()}</Text>
              </View>
              <View style={styles.weekStatusCol}>
                <View style={[styles.weekStatusBadge, { backgroundColor: info.status === 'available' ? '#D1FAE5' : info.status === 'blocked' ? '#FEE2E2' : info.status === 'booked' ? '#DBEAFE' : '#F3F4F6' }]}>
                  <Text style={[styles.weekStatusText, { color: info.status === 'available' ? '#059669' : info.status === 'blocked' ? '#DC2626' : info.status === 'booked' ? '#1D4ED8' : '#9CA3AF' }]}>
                    {info.status === 'available' ? 'Disponible' : info.status === 'blocked' ? 'Bloqué' : info.status === 'booked' ? 'Réservé' : 'Passé'}
                  </Text>
                </View>
                {info.price && <Text style={styles.weekPrice}>{info.price.toLocaleString('fr-CI')} FCFA</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const prevPeriod = () => {
    if (viewMode === 'month') setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    else setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - 7));
  };
  const nextPeriod = () => {
    if (viewMode === 'month') setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    else setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + 7));
  };

  const selectedHasBlocked = selectedDates.some(d => calData[d]?.status === 'blocked');

  return (
    <SafeAreaView style={styles.safe}>
      {/* iCal actions */}
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('IcalFeeds', { propertyId })} style={styles.icalBtn}>
            <Text style={styles.icalBtnText}>Import iCal</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportIcal} style={styles.icalBtn}>
            <Text style={styles.icalBtnText}>Export iCal</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* View mode toggle */}
      <View style={styles.viewToggleRow}>
        <TouchableOpacity style={[styles.toggleBtn, viewMode === 'month' && styles.toggleBtnActive]} onPress={() => setViewMode('month')}>
          <Text style={[styles.toggleBtnText, viewMode === 'month' && styles.toggleBtnTextActive]}>Mois</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, viewMode === 'week' && styles.toggleBtnActive]} onPress={() => setViewMode('week')}>
          <Text style={[styles.toggleBtnText, viewMode === 'week' && styles.toggleBtnTextActive]}>Semaine</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={prevPeriod}><Text style={styles.navArrow}>‹</Text></TouchableOpacity>
        <Text style={styles.navTitle}>{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
        <TouchableOpacity onPress={nextPeriod}><Text style={styles.navArrow}>›</Text></TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        {[{color:'#D1FAE5',text:'Disponible'},{color:'#FEE2E2',text:'Bloqué'},{color:'#DBEAFE',text:'Réservé'}].map(l => (
          <View key={l.text} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={styles.legendText}>{l.text}</Text>
          </View>
        ))}
      </View>

      {/* Day labels (month view only) */}
      {viewMode === 'month' && (
        <View style={styles.dayLabels}>
          {DAY_SHORT.map(d => <Text key={d} style={styles.dayLabelText}>{d}</Text>)}
        </View>
      )}

      {/* Calendar */}
      {isLoading
        ? <View style={styles.centered}><ActivityIndicator size="large" color="#1056E0" /></View>
        : <View style={styles.calBody}>{viewMode === 'month' ? renderMonthView() : renderWeekView()}</View>
      }

      {/* Selection actions */}
      {selectedDates.length > 0 && (
        <View style={styles.actionBar}>
          <Text style={styles.actionBarLabel}>{selectedDates.length} jour{selectedDates.length > 1 ? 's' : ''} sélectionné{selectedDates.length > 1 ? 's' : ''}</Text>
          <View style={styles.actionBtns}>
            {selectedHasBlocked
              ? <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={handleUnblock}>
                  <Text style={styles.actionBtnText}>Débloquer</Text>
                </TouchableOpacity>
              : <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRed]} onPress={() => setShowBlockModal(true)}>
                  <Text style={styles.actionBtnText}>Bloquer</Text>
                </TouchableOpacity>
            }
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnBlue]} onPress={() => setShowPriceModal(true)}>
              <Text style={styles.actionBtnText}>Tarif</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearBtn} onPress={clearSelection}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Block Modal */}
      <Modal visible={showBlockModal} transparent animationType="slide" onRequestClose={() => setShowBlockModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Bloquer {selectedDates.length} jour{selectedDates.length > 1 ? 's' : ''}</Text>
            <Text style={styles.modalSub}>{selectedDates[0]} → {selectedDates[selectedDates.length - 1]}</Text>
            <TextInput style={styles.modalInput} placeholder="Raison (optionnel)" value={blockReason} onChangeText={setBlockReason} placeholderTextColor="#9CA3AF" />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowBlockModal(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, isBlocking && { opacity: 0.6 }]} onPress={handleBlock} disabled={isBlocking}>
                {isBlocking ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Seasonal Price Modal */}
      <Modal visible={showPriceModal} transparent animationType="slide" onRequestClose={() => setShowPriceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Tarif saisonnier</Text>
            <Text style={styles.modalSub}>{selectedDates[0]} → {selectedDates[selectedDates.length - 1]}</Text>
            <TextInput style={styles.modalInput} placeholder="Prix par nuit (FCFA)" value={seasonalPrice} onChangeText={setSeasonalPrice} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPriceModal(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, isBlocking && { opacity: 0.6 }]} onPress={handleSetPrice} disabled={isBlocking}>
                {isBlocking ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Appliquer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CELL_SIZE = `${Math.floor(100/7)}%`;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerActions: { flexDirection: 'row', gap: 8 },
  icalBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  icalBtnText: { fontSize: 12, color: '#1D4ED8', fontWeight: '700' },
  viewToggleRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center' },
  toggleBtnActive: { borderColor: '#1056E0', backgroundColor: '#F0FDF4' },
  toggleBtnText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  toggleBtnTextActive: { color: '#1056E0' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff' },
  navArrow: { fontSize: 28, color: '#1056E0', fontWeight: '300', padding: 4 },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  legendRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 11, color: '#6B7280' },
  dayLabels: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 6 },
  dayLabelText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  calBody: { flex: 1 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL_SIZE as DimensionValue, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#E5E7EB' },
  cellDay: { fontSize: 14, fontWeight: '500' },
  cellPrice: { fontSize: 8, marginTop: 1 },
  bookedDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1D4ED8', marginTop: 2 },
  weekRow: { flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff', alignItems: 'center' },
  weekRowSelected: { backgroundColor: '#F0FDF4' },
  weekDateCol: { width: 48, alignItems: 'center' },
  weekDayName: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  weekDayNum: { fontSize: 22, fontWeight: '800', color: '#111827' },
  weekStatusCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  weekStatusText: { fontSize: 12, fontWeight: '700' },
  weekPrice: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  actionBar: { backgroundColor: '#1056E0', padding: 12, paddingHorizontal: 16 },
  actionBarLabel: { color: '#A7F3D0', fontSize: 12, marginBottom: 8 },
  actionBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  actionBtnRed: { backgroundColor: '#DC2626' },
  actionBtnGreen: { backgroundColor: '#059669' },
  actionBtnBlue: { backgroundColor: '#1D4ED8' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  clearBtn: { marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  clearBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  modalInput: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#374151', fontWeight: '700' },
  modalConfirm: { flex: 2, backgroundColor: '#1056E0', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
