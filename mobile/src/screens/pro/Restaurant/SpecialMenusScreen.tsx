import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';

interface SpecialMenu {
  id: string;
  name: string;
  description?: string;
  date: string; // YYYY-MM-DD
  pricePerPerson: number; // FCFA
  items?: string[];
}

function formatSpecialDate(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatPrice(n: number): string {
  return n.toLocaleString('fr-CI') + ' FCFA';
}

function isPast(ymd: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(ymd + 'T12:00:00');
  return d < today;
}

export default function SpecialMenusScreen() {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [menus, setMenus] = useState<SpecialMenu[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formMonth, setFormMonth] = useState('');
  const [formDay, setFormDay] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDishes, setFormDishes] = useState<string[]>([]);
  const [newDish, setNewDish] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const propRes = await propertiesApi.getMyListings();
      const listings: any[] = propRes.data?.data ?? propRes.data ?? [];
      const pid: string = listings[0]?.id ?? listings[0]?._id ?? '';
      setPropertyId(pid);
      if (!pid) { setLoading(false); return; }

      const res = await restaurantApi.getSpecialMenus(pid);
      const data: SpecialMenu[] = res.data?.data ?? res.data ?? [];
      // Sort by date
      data.sort((a, b) => a.date.localeCompare(b.date));
      setMenus(data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les menus spéciaux.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (menu: SpecialMenu) => {
    if (!propertyId) return;
    Alert.alert('Supprimer', `Supprimer "${menu.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          setMenus((prev: SpecialMenu[]) => prev.filter((m: SpecialMenu) => m.id !== menu.id));
          try {
            await restaurantApi.deleteSpecialMenu(propertyId, menu.id);
          } catch {
            load();
            Alert.alert('Erreur', 'Impossible de supprimer le menu.');
          }
        },
      },
    ]);
  };

  const openCreate = () => {
    const today = new Date();
    setFormName('');
    setFormYear(String(today.getFullYear()));
    setFormMonth(String(today.getMonth() + 1).padStart(2, '0'));
    setFormDay(String(today.getDate()).padStart(2, '0'));
    setFormPrice('');
    setFormDescription('');
    setFormDishes([]);
    setNewDish('');
    setModalVisible(true);
  };

  const handleAddDish = () => {
    const trimmed = newDish.trim();
    if (!trimmed || formDishes.length >= 10) return;
    setFormDishes((prev: string[]) => [...prev, trimmed]);
    setNewDish('');
  };

  const handleRemoveDish = (index: number) => {
    setFormDishes((prev: string[]) => prev.filter((_: string, i: number) => i !== index));
  };

  const handleCreate = async () => {
    if (!propertyId) return;
    if (!formName.trim()) { Alert.alert('Erreur', 'Le nom est requis.'); return; }

    const yearNum = parseInt(formYear, 10);
    const monthNum = parseInt(formMonth, 10);
    const dayNum = parseInt(formDay, 10);
    if (
      isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) ||
      monthNum < 1 || monthNum > 12 ||
      dayNum < 1 || dayNum > 31
    ) {
      Alert.alert('Erreur', 'Date invalide. Utilisez le format AAAA/MM/JJ.');
      return;
    }
    const dateStr = `${String(yearNum)}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

    const price = parseFloat(formPrice);
    if (isNaN(price) || price < 0) { Alert.alert('Erreur', 'Prix invalide.'); return; }

    setSaving(true);
    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      date: dateStr,
      pricePerPerson: price,
    };

    try {
      try {
        const res = await restaurantApi.createSpecialMenu(propertyId, payload);
        const created: SpecialMenu = res.data?.data ?? res.data;
        if (formDishes.length > 0) created.items = formDishes;
        setMenus((prev: SpecialMenu[]) => [...prev, created].sort((a: SpecialMenu, b: SpecialMenu) => a.date.localeCompare(b.date)));
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const tmp: SpecialMenu = { id: `tmp_${Date.now()}`, ...payload, items: formDishes.length > 0 ? formDishes : undefined };
          setMenus((prev: SpecialMenu[]) => [...prev, tmp].sort((a: SpecialMenu, b: SpecialMenu) => a.date.localeCompare(b.date)));
        } else {
          throw err;
        }
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de créer le menu spécial.');
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
        <Text style={styles.title}>Menus spéciaux</Text>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#2563EB" style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>
            Créez des menus pour des occasions spéciales (Noël, Saint-Valentin, événements).
            Ils apparaissent sur la fiche de votre restaurant avec un prix fixe par personne.
          </Text>
        </View>

        {menus.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucun menu spécial créé</Text>
          </View>
        )}

        {menus.map((menu: SpecialMenu) => {
          const past = isPast(menu.date);
          return (
            <View key={menu.id} style={[styles.menuCard, past && styles.menuCardPast]}>
              <View style={styles.menuCardHeader}>
                <View style={styles.menuTitleRow}>
                  <Text style={[styles.menuName, past && styles.menuNamePast]}>{menu.name}</Text>
                  {past && (
                    <View style={styles.pastBadge}>
                      <Text style={styles.pastBadgeText}>Passé</Text>
                    </View>
                  )}
                </View>
                {!past && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(menu)}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.menuDateRow}>
                <Ionicons name="calendar-outline" size={14} color={past ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.menuDate, past && styles.menuDatePast]}>
                  {formatSpecialDate(menu.date)}
                </Text>
              </View>

              <View style={styles.menuPriceRow}>
                <Ionicons name="pricetag-outline" size={14} color={past ? '#9CA3AF' : '#1056E0'} />
                <Text style={[styles.menuPrice, past && styles.menuPricePast]}>
                  {formatPrice(menu.pricePerPerson)} / personne
                </Text>
              </View>

              {menu.description ? (
                <Text style={[styles.menuDesc, past && styles.menuDescPast]}>{menu.description}</Text>
              ) : null}

              {menu.items && menu.items.length > 0 && (
                <View style={styles.dishesList}>
                  {menu.items.map((dish: string, idx: number) => (
                    <View key={idx} style={styles.dishRow}>
                      <View style={styles.dishDot} />
                      <Text style={[styles.dishName, past && styles.dishNamePast]}>{dish}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Créer un menu spécial</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Create modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Nouveau menu spécial</Text>

              <Text style={styles.fieldLabel}>Nom du menu *</Text>
              <TextInput
                style={styles.fieldInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="ex: Menu de Noël"
              />

              <Text style={styles.fieldLabel}>Date *</Text>
              <View style={styles.dateRow}>
                <View style={styles.datePartWrapper}>
                  <Text style={styles.datePart}>Année</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={formYear}
                    onChangeText={setFormYear}
                    placeholder="2025"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                <Text style={styles.dateSep}>/</Text>
                <View style={styles.datePartWrapper}>
                  <Text style={styles.datePart}>Mois</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={formMonth}
                    onChangeText={setFormMonth}
                    placeholder="12"
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <Text style={styles.dateSep}>/</Text>
                <View style={styles.datePartWrapper}>
                  <Text style={styles.datePart}>Jour</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={formDay}
                    onChangeText={setFormDay}
                    placeholder="25"
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Prix par personne (FCFA) *</Text>
              <TextInput
                style={styles.fieldInput}
                value={formPrice}
                onChangeText={setFormPrice}
                placeholder="ex: 15000"
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.fieldInput, styles.textArea]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Description optionnelle…"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.fieldLabel}>Plats du menu {formDishes.length > 0 && `(${formDishes.length}/10)`}</Text>
              {formDishes.map((dish: string, idx: number) => (
                <View key={idx} style={styles.dishInputRow}>
                  <Text style={styles.dishInputText}>{dish}</Text>
                  <TouchableOpacity onPress={() => handleRemoveDish(idx)}>
                    <Ionicons name="close-circle" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
              {formDishes.length < 10 && (
                <View style={styles.addDishRow}>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1, marginBottom: 0 }]}
                    value={newDish}
                    onChangeText={setNewDish}
                    placeholder="Ajouter un plat…"
                    onSubmitEditing={handleAddDish}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.addDishBtn} onPress={handleAddDish}>
                    <Ionicons name="add" size={22} color="#1056E0" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Créer</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 16 },

  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: '#EFF6FF', padding: 14, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  infoText: { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 19 },

  emptyState: { alignItems: 'center', paddingTop: 40, paddingBottom: 20, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },

  menuCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  menuCardPast: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', opacity: 0.7 },
  menuCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  menuTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  menuName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  menuNamePast: { color: '#9CA3AF' },
  pastBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  pastBadgeText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  deleteBtn: { padding: 4 },

  menuDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  menuDate: { fontSize: 13, color: '#6B7280', textTransform: 'capitalize' },
  menuDatePast: { color: '#9CA3AF' },
  menuPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  menuPrice: { fontSize: 14, fontWeight: '700', color: '#1056E0' },
  menuPricePast: { color: '#9CA3AF' },
  menuDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 8 },
  menuDescPast: { color: '#9CA3AF' },

  dishesList: { marginTop: 4, gap: 4 },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dishDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#1056E0' },
  dishName: { fontSize: 13, color: '#374151' },
  dishNamePast: { color: '#9CA3AF' },

  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1056E0', borderRadius: 12, paddingVertical: 16, marginTop: 8 },
  createBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: '92%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 2 },
  fieldInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827', marginBottom: 14, backgroundColor: '#F9FAFB' },
  textArea: { height: 80, textAlignVertical: 'top' },

  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 },
  datePartWrapper: { flex: 1, alignItems: 'center' },
  datePart: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  dateInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 10, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', textAlign: 'center', width: '100%' },
  dateSep: { fontSize: 20, color: '#6B7280', marginBottom: 10 },

  dishInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 6 },
  dishInputText: { fontSize: 14, color: '#374151', flex: 1 },
  addDishRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  addDishBtn: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#1056E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDF4' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#1056E0', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
