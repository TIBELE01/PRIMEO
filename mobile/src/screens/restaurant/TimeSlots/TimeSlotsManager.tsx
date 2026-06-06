import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';

const DAYS: Record<number, string> = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
};

interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  isBlocked: boolean;
}

interface Props {
  route: { params: { propertyId: string } };
  navigation: any;
}

export default function TimeSlotsManager({ route, navigation }: Props) {
  const { propertyId } = route.params;

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dayOfWeek: 1,
    startTime: '',
    endTime: '',
    maxCapacity: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<TimeSlot | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSlots = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await restaurantApi.getTimeSlots(propertyId);
      setSlots((res as any)?.data ?? res ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors du chargement des créneaux');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const openAddModal = () => {
    setForm({ dayOfWeek: 1, startTime: '', endTime: '', maxCapacity: '' });
    setFormError(null);
    setModalVisible(true);
  };

  const validateForm = () => {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!form.startTime.trim() || !timeRegex.test(form.startTime.trim())) {
      return 'Heure de début invalide (format HH:MM requis)';
    }
    if (!form.endTime.trim() || !timeRegex.test(form.endTime.trim())) {
      return 'Heure de fin invalide (format HH:MM requis)';
    }
    if (!form.maxCapacity.trim() || isNaN(parseInt(form.maxCapacity, 10)) || parseInt(form.maxCapacity, 10) <= 0) {
      return 'Capacité maximale invalide';
    }
    return null;
  };

  const handleSave = async () => {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setSaving(true);
    try {
      await restaurantApi.createTimeSlot(propertyId, {
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime.trim(),
        endTime: form.endTime.trim(),
        maxCapacity: parseInt(form.maxCapacity, 10),
      });
      setModalVisible(false);
      fetchSlots();
    } catch (e: any) {
      setFormError(e?.message ?? 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlock = async (slot: TimeSlot) => {
    try {
      await restaurantApi.updateTimeSlot(propertyId, slot.id, { isBlocked: !slot.isBlocked });
      setSlots(prev =>
        prev.map(s => s.id === slot.id ? { ...s, isBlocked: !slot.isBlocked } : s)
      );
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de modifier le créneau');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await restaurantApi.deleteTimeSlot(propertyId, deleteTarget.id);
      setSlots(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer le créneau');
    } finally {
      setDeleting(false);
    }
  };

  // Group slots by day of week
  const grouped: Record<number, TimeSlot[]> = {};
  slots.forEach(slot => {
    if (!grouped[slot.dayOfWeek]) grouped[slot.dayOfWeek] = [];
    grouped[slot.dayOfWeek].push(slot);
  });
  const orderedDays = [1, 2, 3, 4, 5, 6, 0].filter(d => grouped[d]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1056E0" />
          <Text style={s.loadingText}>Chargement des créneaux…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchSlots()}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Créneaux horaires</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchSlots(true)} tintColor="#1056E0" />
        }
      >
        {slots.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyIcon}>🕐</Text>
            <Text style={s.emptyTitle}>Aucun créneau configuré</Text>
            <Text style={s.emptySubtitle}>
              Ajoutez vos premiers créneaux horaires pour commencer à recevoir des réservations.
            </Text>
          </View>
        ) : (
          orderedDays.map(day => (
            <View key={day} style={s.dayGroup}>
              <Text style={s.dayLabel}>{DAYS[day]}</Text>
              {grouped[day].map(slot => (
                <View key={slot.id} style={s.slotCard}>
                  <View style={s.slotLeft}>
                    <Text style={s.slotTime}>{slot.startTime} – {slot.endTime}</Text>
                    <Text style={s.slotCapacity}>{slot.maxCapacity} couverts max.</Text>
                    {slot.isBlocked && (
                      <View style={s.blockedBadge}>
                        <Text style={s.blockedBadgeText}>Bloqué</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.slotActions}>
                    <TouchableOpacity
                      style={[s.actionBtn, slot.isBlocked ? s.actionUnblock : s.actionBlock]}
                      onPress={() => handleToggleBlock(slot)}
                    >
                      <Text style={[s.actionBtnText, slot.isBlocked ? s.unblockText : s.blockText]}>
                        {slot.isBlocked ? 'Débloquer' : 'Bloquer'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, s.actionDelete]}
                      onPress={() => setDeleteTarget(slot)}
                    >
                      <Text style={s.deleteText}>Suppr.</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating add button */}
      <TouchableOpacity style={s.fab} onPress={openAddModal} activeOpacity={0.85}>
        <Text style={s.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add Slot Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Nouveau créneau</Text>

            {/* Day picker */}
            <Text style={s.fieldLabel}>Jour de la semaine</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.dayPicker}
              contentContainerStyle={s.dayPickerContent}
            >
              {[1, 2, 3, 4, 5, 6, 0].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[s.dayChip, form.dayOfWeek === d && s.dayChipActive]}
                  onPress={() => setForm(f => ({ ...f, dayOfWeek: d }))}
                >
                  <Text style={[s.dayChipText, form.dayOfWeek === d && s.dayChipTextActive]}>
                    {DAYS[d].slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Time inputs */}
            <View style={s.timeRow}>
              <View style={s.timeField}>
                <Text style={s.fieldLabel}>Début</Text>
                <TextInput
                  style={s.timeInput}
                  value={form.startTime}
                  onChangeText={v => setForm(f => ({ ...f, startTime: v }))}
                  placeholder="08:00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={s.timeSeparator}>
                <Text style={s.timeSepText}>—</Text>
              </View>
              <View style={s.timeField}>
                <Text style={s.fieldLabel}>Fin</Text>
                <TextInput
                  style={s.timeInput}
                  value={form.endTime}
                  onChangeText={v => setForm(f => ({ ...f, endTime: v }))}
                  placeholder="10:00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            {/* Capacity */}
            <Text style={s.fieldLabel}>Capacité maximale</Text>
            <TextInput
              style={s.textInput}
              value={form.maxCapacity}
              onChangeText={v => setForm(f => ({ ...f, maxCapacity: v }))}
              placeholder="ex : 30"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />

            {formError ? <Text style={s.formError}>{formError}</Text> : null}

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={s.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSaveBtn, saving && s.disabledBtn]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalSaveText}>Créer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={[s.modalCard, s.modalCardCenter]}>
            <Text style={s.modalTitle}>Supprimer ce créneau ?</Text>
            {deleteTarget ? (
              <Text style={s.confirmText}>
                {DAYS[deleteTarget.dayOfWeek]} • {deleteTarget.startTime} – {deleteTarget.endTime}
              </Text>
            ) : null}
            <Text style={s.confirmSubText}>Cette action est irréversible.</Text>
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <Text style={s.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalDeleteBtn, deleting && s.disabledBtn]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalDeleteText}>Supprimer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  errorText: { color: '#DC2626', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#1056E0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#1056E0', fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 96 },

  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  dayGroup: { marginBottom: 20 },
  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1056E0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  slotCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  slotLeft: { flex: 1 },
  slotTime: { fontSize: 15, fontWeight: '700', color: '#111827' },
  slotCapacity: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  blockedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  blockedBadgeText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },

  slotActions: { flexDirection: 'row', gap: 8, marginLeft: 12 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBlock: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' },
  actionUnblock: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  actionDelete: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  blockText: { color: '#EA580C' },
  unblockText: { color: '#16A34A' },
  deleteText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1056E0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1056E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalCardCenter: {
    borderRadius: 20,
    marginHorizontal: 24,
    marginBottom: 'auto' as any,
    marginTop: 'auto' as any,
    paddingBottom: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20, textAlign: 'center' },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8, letterSpacing: 0.3 },
  dayPicker: { marginBottom: 20 },
  dayPickerContent: { gap: 8, paddingRight: 4 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  dayChipActive: { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  dayChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  dayChipTextActive: { color: '#fff' },

  timeRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20, gap: 8 },
  timeField: { flex: 1 },
  timeSeparator: { paddingBottom: 12, paddingHorizontal: 4 },
  timeSepText: { fontSize: 16, color: '#94A3B8', fontWeight: '700' },
  timeInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F1729',
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: 1,
  },

  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F1729',
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
  },

  formError: { fontSize: 13, color: '#DC2626', marginBottom: 16, textAlign: 'center', fontWeight: '500' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#1056E0',
  },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  modalDeleteText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  disabledBtn: { opacity: 0.5 },

  confirmText: { fontSize: 15, fontWeight: '600', color: '#374151', textAlign: 'center', marginBottom: 4 },
  confirmSubText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 4 },
});
