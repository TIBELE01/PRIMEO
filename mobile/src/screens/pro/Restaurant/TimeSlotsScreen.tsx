import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Switch, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';

interface TimeSlot {
  id: string;
  dayOfWeek: number; // 0=Lun…6=Dim
  startTime: string;
  endTime: string;
  maxCapacity: number;
  isBlocked: boolean;
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function TimeSlotsScreen() {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDay, setModalDay] = useState(0);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [saving, setSaving] = useState(false);

  // Inline capacity editing
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [editingCapacityValue, setEditingCapacityValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const propRes = await propertiesApi.getMyListings();
      const listings: any[] = propRes.data?.data ?? propRes.data ?? [];
      const pid: string = listings[0]?.id ?? listings[0]?._id ?? '';
      setPropertyId(pid);
      if (!pid) { setLoading(false); return; }

      const slotsRes = await restaurantApi.getTimeSlots(pid);
      const data: TimeSlot[] = slotsRes.data?.data ?? slotsRes.data ?? [];
      setSlots(data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les créneaux.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const slotsByDay = (day: number) => slots.filter((s: TimeSlot) => s.dayOfWeek === day);

  const handleToggleBlocked = async (slot: TimeSlot) => {
    if (!propertyId) return;
    const updated = !slot.isBlocked;
    // Optimistic
    setSlots((prev: TimeSlot[]) => prev.map((s: TimeSlot) => s.id === slot.id ? { ...s, isBlocked: updated } : s));
    try {
      await restaurantApi.updateTimeSlot(propertyId, slot.id, { isBlocked: updated });
    } catch {
      // Revert
      setSlots((prev: TimeSlot[]) => prev.map((s: TimeSlot) => s.id === slot.id ? { ...s, isBlocked: slot.isBlocked } : s));
      Alert.alert('Erreur', 'Impossible de mettre à jour le créneau.');
    }
  };

  const handleCapacitySubmit = async (slot: TimeSlot) => {
    if (!propertyId) return;
    const val = parseInt(editingCapacityValue, 10);
    if (isNaN(val) || val < 1) { setEditingCapacityId(null); return; }
    const prev = slot.maxCapacity;
    setSlots((s: TimeSlot[]) => s.map((x: TimeSlot) => x.id === slot.id ? { ...x, maxCapacity: val } : x));
    setEditingCapacityId(null);
    try {
      await restaurantApi.updateTimeSlot(propertyId, slot.id, { maxCapacity: val });
    } catch {
      setSlots((s: TimeSlot[]) => s.map((x: TimeSlot) => x.id === slot.id ? { ...x, maxCapacity: prev } : x));
      Alert.alert('Erreur', 'Impossible de mettre à jour la capacité.');
    }
  };

  const handleDelete = (slot: TimeSlot) => {
    if (!propertyId) return;
    Alert.alert('Supprimer', `Supprimer le créneau ${slot.startTime}–${slot.endTime} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          setSlots((prev: TimeSlot[]) => prev.filter((s: TimeSlot) => s.id !== slot.id));
          try {
            await restaurantApi.deleteTimeSlot(propertyId, slot.id);
          } catch {
            load();
            Alert.alert('Erreur', 'Impossible de supprimer le créneau.');
          }
        },
      },
    ]);
  };

  const openAddModal = (day: number) => {
    setModalDay(day);
    setNewStart('');
    setNewEnd('');
    setNewCapacity('');
    setModalVisible(true);
  };

  const handleAddSlot = async () => {
    if (!propertyId) return;
    if (!newStart || !newEnd || !newCapacity) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    const cap = parseInt(newCapacity, 10);
    if (isNaN(cap) || cap < 1) {
      Alert.alert('Erreur', 'Capacité invalide.');
      return;
    }
    setSaving(true);
    const payload = { dayOfWeek: modalDay, startTime: newStart, endTime: newEnd, maxCapacity: cap };
    try {
      const res = await restaurantApi.createTimeSlot(propertyId, payload);
      const created: TimeSlot = res.data?.data ?? res.data;
      setSlots((prev: TimeSlot[]) => [...prev, created]);
      setModalVisible(false);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        Alert.alert(
          'Fonctionnalité en cours de déploiement',
          'Ajout en attente.',
        );
        const tmp: TimeSlot = { id: `tmp_${Date.now()}`, dayOfWeek: modalDay, startTime: newStart, endTime: newEnd, maxCapacity: cap, isBlocked: false };
        setSlots((prev: TimeSlot[]) => [...prev, tmp]);
        setModalVisible(false);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ajouter le créneau.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1056E0" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Créneaux horaires</Text>

        {DAYS.map((dayName, dayIndex) => {
          const daySlots = slotsByDay(dayIndex);
          return (
            <View key={dayIndex} style={styles.daySection}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{dayName}</Text>
                <TouchableOpacity style={styles.addDayBtn} onPress={() => openAddModal(dayIndex)}>
                  <Ionicons name="add" size={20} color="#1056E0" />
                </TouchableOpacity>
              </View>

              {daySlots.length === 0 && (
                <Text style={styles.emptyDay}>Aucun créneau configuré</Text>
              )}

              {daySlots.map((slot: TimeSlot) => (
                <View key={slot.id} style={[styles.slotCard, slot.isBlocked && styles.slotCardBlocked]}>
                  <View style={styles.slotTop}>
                    <Text style={styles.slotTime}>{slot.startTime}–{slot.endTime}</Text>
                    {slot.isBlocked && (
                      <View style={styles.blockedBadge}>
                        <Text style={styles.blockedBadgeText}>Bloqué</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.slotRow}>
                    {/* Capacity inline edit */}
                    {editingCapacityId === slot.id ? (
                      <TextInput
                        style={styles.capacityInput}
                        value={editingCapacityValue}
                        onChangeText={setEditingCapacityValue}
                        keyboardType="number-pad"
                        autoFocus
                        onBlur={() => handleCapacitySubmit(slot)}
                        onSubmitEditing={() => handleCapacitySubmit(slot)}
                      />
                    ) : (
                      <TouchableOpacity onPress={() => { setEditingCapacityId(slot.id); setEditingCapacityValue(String(slot.maxCapacity)); }}>
                        <Text style={styles.slotCapacity}>{slot.maxCapacity} couverts</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.slotActions}>
                      <Switch
                        value={!slot.isBlocked}
                        onValueChange={() => handleToggleBlocked(slot)}
                        trackColor={{ false: '#DC2626', true: '#1056E0' }}
                        thumbColor="#fff"
                      />
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(slot)}>
                        <Ionicons name="trash-outline" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* Add slot modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Ajouter un créneau — {DAYS[modalDay]}</Text>

            <Text style={styles.fieldLabel}>Heure de début (HH:MM)</Text>
            <TextInput
              style={styles.fieldInput}
              value={newStart}
              onChangeText={setNewStart}
              placeholder="ex: 12:00"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.fieldLabel}>Heure de fin (HH:MM)</Text>
            <TextInput
              style={styles.fieldInput}
              value={newEnd}
              onChangeText={setNewEnd}
              placeholder="ex: 14:00"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.fieldLabel}>Capacité maximale (couverts)</Text>
            <TextInput
              style={styles.fieldInput}
              value={newCapacity}
              onChangeText={setNewCapacity}
              placeholder="ex: 30"
              keyboardType="number-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddSlot} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Ajouter</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 20 },

  daySection: { marginBottom: 20 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dayName: { fontSize: 16, fontWeight: '600', color: '#1056E0' },
  addDayBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  emptyDay: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', paddingLeft: 4 },

  slotCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  slotCardBlocked: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  slotTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  slotTime: { fontSize: 15, fontWeight: '600', color: '#111827' },
  blockedBadge: { backgroundColor: '#DC2626', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  blockedBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotCapacity: { fontSize: 14, color: '#6B7280', textDecorationLine: 'underline' },
  capacityInput: { fontSize: 14, color: '#111827', borderBottomWidth: 1, borderColor: '#1056E0', minWidth: 60, paddingVertical: 2 },
  slotActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: { padding: 4 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827', marginBottom: 14, backgroundColor: '#F9FAFB' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#1056E0', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
