import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Switch, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';

interface MenuItem {
  id: string;
  section: string;
  name: string;
  description?: string;
  price: number;
  allergens: string[];
  isAvailable: boolean;
  sortOrder: number;
}

const SECTIONS = ['Entrées', 'Plats', 'Desserts', 'Boissons'];
const ALLERGEN_LIST = ['Gluten', 'Lactose', 'Arachides', 'Œufs', 'Poisson', 'Soja', 'Noix'];

function formatPrice(n: number): string {
  return n.toLocaleString('fr-CI') + ' FCFA';
}

export default function MenuManagementScreen() {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('Tout');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formSection, setFormSection] = useState(SECTIONS[0]);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formAllergens, setFormAllergens] = useState<string[]>([]);
  const [formAvailable, setFormAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const propRes = await propertiesApi.getMyListings();
      const listings: any[] = propRes.data?.data ?? propRes.data ?? [];
      const pid: string = listings[0]?.id ?? listings[0]?._id ?? '';
      setPropertyId(pid);
      if (!pid) { setLoading(false); return; }

      const menuRes = await restaurantApi.getMenuItems(pid);
      const data: MenuItem[] = menuRes.data?.data ?? menuRes.data ?? [];
      setItems(data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger le menu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleItems = activeSection === 'Tout'
    ? items
    : items.filter((i: MenuItem) => i.section === activeSection);

  const handleToggleAvailable = async (item: MenuItem) => {
    if (!propertyId) return;
    const updated = !item.isAvailable;
    setItems((prev: MenuItem[]) => prev.map((i: MenuItem) => i.id === item.id ? { ...i, isAvailable: updated } : i));
    try {
      await restaurantApi.updateMenuItem(propertyId, item.id, { isAvailable: updated });
    } catch {
      setItems((prev: MenuItem[]) => prev.map((i: MenuItem) => i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i));
      Alert.alert('Erreur', 'Impossible de mettre à jour la disponibilité.');
    }
  };

  const handleDelete = (item: MenuItem) => {
    if (!propertyId) return;
    Alert.alert('Supprimer', `Supprimer "${item.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          setItems((prev: MenuItem[]) => prev.filter((i: MenuItem) => i.id !== item.id));
          try {
            await restaurantApi.deleteMenuItem(propertyId, item.id);
          } catch {
            load();
            Alert.alert('Erreur', 'Impossible de supprimer l\'article.');
          }
        },
      },
    ]);
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormSection(SECTIONS[0]);
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormAllergens([]);
    setFormAvailable(true);
    setModalVisible(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormSection(item.section);
    setFormName(item.name);
    setFormDescription(item.description ?? '');
    setFormPrice(String(item.price));
    setFormAllergens(item.allergens ?? []);
    setFormAvailable(item.isAvailable);
    setModalVisible(true);
  };

  const toggleAllergen = (allergen: string) => {
    setFormAllergens((prev: string[]) =>
      prev.includes(allergen) ? prev.filter((a: string) => a !== allergen) : [...prev, allergen]
    );
  };

  const handleSave = async () => {
    if (!propertyId) return;
    if (!formName.trim()) { Alert.alert('Erreur', 'Le nom est requis.'); return; }
    const price = parseFloat(formPrice);
    if (isNaN(price) || price < 0) { Alert.alert('Erreur', 'Prix invalide.'); return; }

    setSaving(true);
    try {
      if (editingItem) {
        const data = { name: formName.trim(), description: formDescription.trim(), price, allergens: formAllergens, isAvailable: formAvailable };
        try {
          const res = await restaurantApi.updateMenuItem(propertyId, editingItem.id, data);
          const updated: MenuItem = res.data?.data ?? res.data ?? { ...editingItem, ...data };
          setItems((prev: MenuItem[]) => prev.map((i: MenuItem) => i.id === editingItem.id ? updated : i));
        } catch (err: any) {
          if (err?.response?.status === 404) {
            setItems((prev: MenuItem[]) => prev.map((i: MenuItem) => i.id === editingItem.id ? { ...i, ...data } : i));
          } else {
            throw err;
          }
        }
      } else {
        const payload = { section: formSection, name: formName.trim(), description: formDescription.trim() || undefined, price, allergens: formAllergens, isAvailable: formAvailable };
        try {
          const res = await restaurantApi.createMenuItem(propertyId, payload);
          const created: MenuItem = res.data?.data ?? res.data;
          setItems((prev: MenuItem[]) => [...prev, created]);
        } catch (err: any) {
          if (err?.response?.status === 404) {
            const tmp: MenuItem = { id: `tmp_${Date.now()}`, ...payload, description: formDescription.trim() || undefined, allergens: formAllergens, sortOrder: 0 };
            setItems((prev: MenuItem[]) => [...prev, tmp]);
          } else {
            throw err;
          }
        }
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'article.');
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Section tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {['Tout', ...SECTIONS].map(sec => (
          <TouchableOpacity
            key={sec}
            style={[styles.tabPill, activeSection === sec && styles.tabPillActive]}
            onPress={() => setActiveSection(sec)}
          >
            <Text style={[styles.tabPillText, activeSection === sec && styles.tabPillTextActive]}>{sec}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items list */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {visibleItems.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucun article dans cette section</Text>
          </View>
        )}

        {visibleItems.map((item: MenuItem) => (
          <View key={item.id} style={[styles.itemCard, !item.isAvailable && styles.itemCardUnavailable]}>
            <View style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
                </View>
              </View>
              <View style={styles.itemControls}>
                <Switch
                  value={item.isAvailable}
                  onValueChange={() => handleToggleAvailable(item)}
                  trackColor={{ false: '#D1D5DB', true: '#1056E0' }}
                  thumbColor="#fff"
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
                <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
                  <Ionicons name="pencil-outline" size={17} color="#2563EB" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={17} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>

            {item.description ? (
              <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
            ) : null}

            {item.allergens && item.allergens.length > 0 && (
              <View style={styles.allergensRow}>
                {item.allergens.map((a: string) => (
                  <View key={a} style={styles.allergenChip}>
                    <Text style={styles.allergenChipText}>{a}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Add / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editingItem ? 'Modifier l\'article' : 'Nouvel article'}</Text>

              {/* Section selector */}
              {!editingItem && (
                <>
                  <Text style={styles.fieldLabel}>Section</Text>
                  <View style={styles.sectionSelector}>
                    {SECTIONS.map(sec => (
                      <TouchableOpacity
                        key={sec}
                        style={[styles.sectionBtn, formSection === sec && styles.sectionBtnActive]}
                        onPress={() => setFormSection(sec)}
                      >
                        <Text style={[styles.sectionBtnText, formSection === sec && styles.sectionBtnTextActive]}>{sec}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.fieldLabel}>Nom *</Text>
              <TextInput style={styles.fieldInput} value={formName} onChangeText={setFormName} placeholder="ex: Thiéboudiène" />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.fieldInput, styles.textArea]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Description optionnelle…"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.fieldLabel}>Prix (FCFA) *</Text>
              <TextInput style={styles.fieldInput} value={formPrice} onChangeText={setFormPrice} placeholder="ex: 2500" keyboardType="number-pad" />

              <Text style={styles.fieldLabel}>Allergènes</Text>
              <View style={styles.allergensSelector}>
                {ALLERGEN_LIST.map(a => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.allergenToggle, formAllergens.includes(a) && styles.allergenToggleActive]}
                    onPress={() => toggleAllergen(a)}
                  >
                    <Text style={[styles.allergenToggleText, formAllergens.includes(a) && styles.allergenToggleTextActive]}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.availableRow}>
                <Text style={styles.fieldLabel}>Disponible</Text>
                <Switch
                  value={formAvailable}
                  onValueChange={setFormAvailable}
                  trackColor={{ false: '#D1D5DB', true: '#1056E0' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1056E0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  tabsScroll: { maxHeight: 50, flexGrow: 0 },
  tabsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tabPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  tabPillActive: { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  tabPillText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabPillTextActive: { color: '#fff', fontWeight: '700' },

  content: { padding: 16, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },

  itemCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  itemCardUnavailable: { opacity: 0.6 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  priceBadge: { alignSelf: 'flex-start', backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  priceText: { fontSize: 13, color: '#1056E0', fontWeight: '700' },
  itemControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 6 },
  itemDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 6 },
  allergensRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allergenChip: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  allergenChipText: { fontSize: 11, color: '#92400E', fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827', marginBottom: 14, backgroundColor: '#F9FAFB' },
  textArea: { height: 80, textAlignVertical: 'top' },

  sectionSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sectionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  sectionBtnActive: { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  sectionBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  sectionBtnTextActive: { color: '#fff', fontWeight: '700' },

  allergensSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  allergenToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  allergenToggleActive: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  allergenToggleText: { fontSize: 12, color: '#6B7280' },
  allergenToggleTextActive: { color: '#92400E', fontWeight: '600' },

  availableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#1056E0', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
