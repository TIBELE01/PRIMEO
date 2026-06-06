import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Switch, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';

// Couleur principale restaurant
const PRIMARY  = '#DC2626';
const PRIMARY2 = '#991B1B';

interface MenuItem {
  id: string;
  section: string;
  name: string;
  description?: string;
  price: number;
  allergens: string[];
  isAvailable: boolean;
  sortOrder: number;
  photoUrl?: string;
}

const SECTIONS = ['Entrées', 'Plats', 'Desserts', 'Boissons'];
const SECTION_ICONS: Record<string, string> = {
  Entrées:  '🥗',
  Plats:    '🍽️',
  Desserts: '🍰',
  Boissons: '🥤',
};
const ALLERGEN_LIST = ['Gluten', 'Lactose', 'Arachides', 'Œufs', 'Poisson', 'Soja', 'Noix', 'Sésame'];

function formatPrice(n: number): string {
  return n.toLocaleString('fr-CI') + ' FCFA';
}

// ── Composants internes ────────────────────────────────────────────────────────

function SectionBadge({ section }: { section: string }) {
  return (
    <View style={styles.sectionBadge}>
      <Text style={styles.sectionBadgeText}>{SECTION_ICONS[section] ?? '🍴'} {section}</Text>
    </View>
  );
}

function MenuItemCard({
  item,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: MenuItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.itemCard, !item.isAvailable && styles.itemCardOff]}>
      {/* Photo si disponible */}
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.itemPhoto} />
      ) : null}

      <View style={styles.itemBody}>
        <View style={styles.itemTopRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.itemName, !item.isAvailable && { color: '#9CA3AF' }]}>
              {item.name}
            </Text>
            {item.description ? (
              <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
            ) : null}
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
              <Ionicons name="pencil" size={15} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
              <Ionicons name="trash" size={15} color={PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemBottomRow}>
          <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
          {item.allergens?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 26 }}>
              {item.allergens.map(a => (
                <View key={a} style={styles.allergenPill}>
                  <Text style={styles.allergenPillText}>{a}</Text>
                </View>
              ))}
            </ScrollView>
          )}
          <Switch
            value={item.isAvailable}
            onValueChange={onToggle}
            trackColor={{ false: '#E5E7EB', true: PRIMARY + '66' }}
            thumbColor={item.isAvailable ? PRIMARY : '#9CA3AF'}
            style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
          />
        </View>
      </View>
    </View>
  );
}

// ── Écran principal ────────────────────────────────────────────────────────────

export default function MenuManagementScreen() {
  const navigation = useNavigation<any>();
  const [propertyId,  setPropertyId]  = useState<string | null>(null);
  const [noProperty,  setNoProperty]  = useState(false);
  const [items,       setItems]       = useState<MenuItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeSection, setActiveSection] = useState<string>('Tout');

  // Formulaire modal
  const [modalVisible,  setModalVisible]  = useState(false);
  const [editingItem,   setEditingItem]   = useState<MenuItem | null>(null);
  const [formSection,   setFormSection]   = useState(SECTIONS[0]);
  const [formName,      setFormName]      = useState('');
  const [formDesc,      setFormDesc]      = useState('');
  const [formPrice,     setFormPrice]     = useState('');
  const [formAllergens, setFormAllergens] = useState<string[]>([]);
  const [formAvailable, setFormAvailable] = useState(true);
  const [formPhoto,     setFormPhoto]     = useState('');
  const [saving,        setSaving]        = useState(false);

  // ── Chargement ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const propRes   = await propertiesApi.getMyListings();
      const listings: any[] = propRes.data?.data ?? propRes.data ?? [];
      const pid: string = listings[0]?.id ?? '';
      setPropertyId(pid || null);
      if (!pid) { setNoProperty(true); setLoading(false); return; }

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

  // ── Filtrage ──────────────────────────────────────────────────────────────────

  const visibleItems = activeSection === 'Tout'
    ? items
    : items.filter(i => i.section === activeSection);

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleToggle = async (item: MenuItem) => {
    if (!propertyId) return;
    const next = !item.isAvailable;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: next } : i));
    try {
      await restaurantApi.updateMenuItem(propertyId, item.id, { isAvailable: next });
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i));
      Alert.alert('Erreur', 'Impossible de modifier la disponibilité.');
    }
  };

  const handleDelete = (item: MenuItem) => {
    if (!propertyId) return;
    Alert.alert('Supprimer', `Supprimer "${item.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          setItems(prev => prev.filter(i => i.id !== item.id));
          try {
            await restaurantApi.deleteMenuItem(propertyId, item.id);
          } catch {
            load();
            Alert.alert('Erreur', "Impossible de supprimer l'article.");
          }
        },
      },
    ]);
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormSection(SECTIONS[0]);
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormAllergens([]);
    setFormAvailable(true);
    setFormPhoto('');
    setModalVisible(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormSection(item.section);
    setFormName(item.name);
    setFormDesc(item.description ?? '');
    setFormPrice(String(item.price));
    setFormAllergens(item.allergens ?? []);
    setFormAvailable(item.isAvailable);
    setFormPhoto(item.photoUrl ?? '');
    setModalVisible(true);
  };

  const toggleAllergen = (a: string) =>
    setFormAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const handleSave = async () => {
    if (!propertyId) {
      Alert.alert('Erreur', 'Aucun établissement trouvé.');
      return;
    }
    const trimName = formName.trim();
    if (!trimName) { Alert.alert('Erreur', 'Le nom de l\'article est requis.'); return; }
    const price = parseFloat(formPrice.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(price) || price < 0) { Alert.alert('Erreur', 'Veuillez saisir un prix valide (≥ 0).'); return; }

    setSaving(true);
    try {
      if (editingItem) {
        const data = {
          name: trimName,
          description: formDesc.trim() || undefined,
          price: Math.round(price),
          allergens: formAllergens,
          isAvailable: formAvailable,
          ...(formPhoto.trim() ? { photoUrl: formPhoto.trim() } : {}),
        };
        const res = await restaurantApi.updateMenuItem(propertyId, editingItem.id, data);
        const updated: MenuItem = res.data?.data ?? res.data ?? { ...editingItem, ...data };
        setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
      } else {
        const payload = {
          section: formSection,
          name: trimName,
          description: formDesc.trim() || undefined,
          price: Math.round(price),
          allergens: formAllergens,
          isAvailable: formAvailable,
          ...(formPhoto.trim() ? { photoUrl: formPhoto.trim() } : {}),
        };
        const res = await restaurantApi.createMenuItem(propertyId, payload);
        const created: MenuItem = res.data?.data ?? res.data;
        if (created) {
          setItems(prev => [...prev, created]);
        }
      }
      setModalVisible(false);
    } catch (err: any) {
      // Afficher le vrai message d'erreur du serveur
      const msg = err?.response?.data?.message
        ?? err?.response?.data?.error
        ?? err?.message
        ?? "Impossible d'enregistrer l'article.";
      Alert.alert('Erreur', msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Écran onboarding ──────────────────────────────────────────────────────────

  if (!loading && noProperty) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.onboardingWrap}>
          <View style={[styles.onboardingIcon, { backgroundColor: PRIMARY + '18' }]}>
            <Ionicons name="restaurant" size={56} color={PRIMARY} />
          </View>
          <Text style={styles.onboardingTitle}>Créez votre restaurant</Text>
          <Text style={styles.onboardingDesc}>
            Ajoutez d'abord votre fiche restaurant pour pouvoir gérer votre menu.
          </Text>
          <TouchableOpacity
            style={[styles.onboardingBtn, { backgroundColor: PRIMARY }]}
            onPress={() => navigation.navigate('AddProperty', { initialType: 'restaurant' })}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.onboardingBtnText}>Créer mon restaurant</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={PRIMARY} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  // ── Vue principale ────────────────────────────────────────────────────────────

  const totalItems     = items.length;
  const availableCount = items.filter(i => i.isAvailable).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Menu</Text>
          <Text style={styles.headerSub}>{totalItems} article{totalItems !== 1 ? 's' : ''} · {availableCount} disponible{availableCount !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: PRIMARY }]} onPress={openCreate}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Onglets section */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={styles.tabsContent}>
        {['Tout', ...SECTIONS].map(sec => (
          <TouchableOpacity
            key={sec}
            style={[styles.tab, activeSection === sec && { backgroundColor: PRIMARY, borderColor: PRIMARY }]}
            onPress={() => setActiveSection(sec)}
          >
            {sec !== 'Tout' && <Text style={styles.tabIcon}>{SECTION_ICONS[sec]}</Text>}
            <Text style={[styles.tabText, activeSection === sec && styles.tabTextActive]}>{sec}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste des articles */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {visibleItems.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucun article dans cette section</Text>
            <TouchableOpacity style={[styles.emptyBtn, { borderColor: PRIMARY }]} onPress={openCreate}>
              <Text style={[styles.emptyBtnText, { color: PRIMARY }]}>Ajouter un article</Text>
            </TouchableOpacity>
          </View>
        ) : (
          visibleItems.map(item => (
            <View key={item.id}>
              {activeSection === 'Tout' && (
                <SectionBadge section={item.section} />
              )}
              <MenuItemCard
                item={item}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item)}
                onToggle={() => handleToggle(item)}
              />
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal création/édition */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Poignée */}
              <View style={styles.handle} />

              <Text style={styles.sheetTitle}>
                {editingItem ? 'Modifier l\'article' : 'Nouvel article'}
              </Text>

              {/* Section — uniquement à la création */}
              {!editingItem && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Section *</Text>
                  <View style={styles.chipRow}>
                    {SECTIONS.map(sec => (
                      <TouchableOpacity
                        key={sec}
                        style={[styles.chip, formSection === sec && { backgroundColor: PRIMARY, borderColor: PRIMARY }]}
                        onPress={() => setFormSection(sec)}
                      >
                        <Text style={styles.chipIcon}>{SECTION_ICONS[sec]}</Text>
                        <Text style={[styles.chipText, formSection === sec && styles.chipTextActive]}>{sec}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Nom */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nom de l'article *</Text>
                <TextInput
                  style={styles.input}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="ex : Thiéboudiène royal"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </View>

              {/* Description */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Description <Text style={styles.optional}>(optionnel)</Text></Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={formDesc}
                  onChangeText={setFormDesc}
                  placeholder="Ingrédients, préparation, accompagnement…"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Prix */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Prix (FCFA) *</Text>
                <View style={styles.priceWrap}>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={formPrice}
                    onChangeText={setFormPrice}
                    placeholder="ex : 3 500"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                  />
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyText}>FCFA</Text>
                  </View>
                </View>
              </View>

              {/* Photo URL */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Photo <Text style={styles.optional}>(URL optionnelle)</Text></Text>
                <TextInput
                  style={styles.input}
                  value={formPhoto}
                  onChangeText={setFormPhoto}
                  placeholder="https://…"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Allergènes */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Allergènes <Text style={styles.optional}>(sélectionner ceux présents)</Text></Text>
                <View style={styles.chipRow}>
                  {ALLERGEN_LIST.map(a => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.allergenChip, formAllergens.includes(a) && styles.allergenChipActive]}
                      onPress={() => toggleAllergen(a)}
                    >
                      <Text style={[styles.allergenChipText, formAllergens.includes(a) && styles.allergenChipTextActive]}>{a}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Disponible */}
              <View style={styles.availRow}>
                <View>
                  <Text style={styles.fieldLabel}>Disponible à la commande</Text>
                  <Text style={styles.availSub}>{formAvailable ? 'Visible dans le menu' : 'Masqué du menu'}</Text>
                </View>
                <Switch
                  value={formAvailable}
                  onValueChange={setFormAvailable}
                  trackColor={{ false: '#E5E7EB', true: PRIMARY + '66' }}
                  thumbColor={formAvailable ? PRIMARY : '#9CA3AF'}
                />
              </View>

              {/* Boutons */}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: PRIMARY }, saving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>Enregistrer</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // Onboarding
  onboardingWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  onboardingIcon:    { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  onboardingTitle:   { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  onboardingDesc:    { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  onboardingBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  onboardingBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Header
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle:{ fontSize: 20, fontWeight: '800', color: '#111827' },
  headerSub:  { fontSize: 12, color: '#6B7280', marginTop: 1 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Onglets
  tabsRow:     { maxHeight: 50, flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tabsContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  tab:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  tabIcon:     { fontSize: 14 },
  tabText:     { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  // Liste
  list: { padding: 14, paddingBottom: 40 },

  // Section badge
  sectionBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingTop: 12 },
  sectionBadgeText: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Carte article
  itemCard: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 8,
    overflow: 'hidden', flexDirection: 'row',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  itemCardOff: { opacity: 0.55 },
  itemPhoto:   { width: 80, height: 80, resizeMode: 'cover' },
  itemBody:    { flex: 1, padding: 12 },
  itemTopRow:  { flexDirection: 'row', gap: 8, marginBottom: 8 },
  itemName:    { fontSize: 15, fontWeight: '700', color: '#111827' },
  itemDesc:    { fontSize: 12, color: '#6B7280', lineHeight: 17, marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: 4 },
  actionBtn:   { padding: 6, borderRadius: 8, backgroundColor: '#F9FAFB' },
  itemBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemPrice:   { fontSize: 14, fontWeight: '800', color: PRIMARY },
  allergenPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 4 },
  allergenPillText: { fontSize: 10, color: '#92400E', fontWeight: '500' },

  // État vide
  empty:       { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText:   { fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
  emptyBtn:    { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText:{ fontSize: 14, fontWeight: '700' },

  // Modal
  overlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48, maxHeight: '92%' },
  handle:   { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: '#111827', marginBottom: 20 },

  // Champs formulaire
  field:       { marginBottom: 18 },
  fieldLabel:  { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  optional:    { fontWeight: '400', color: '#9CA3AF' },
  input:       { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827', backgroundColor: '#FAFAFA' },
  inputMulti:  { height: 88, textAlignVertical: 'top' },
  priceWrap:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput:  { flex: 1 },
  currencyBadge: { backgroundColor: PRIMARY + '18', paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10 },
  currencyText:  { fontSize: 13, fontWeight: '700', color: PRIMARY },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  chipIcon:    { fontSize: 14 },
  chipText:    { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  allergenChip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  allergenChipActive:   { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  allergenChipText:     { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  allergenChipTextActive: { color: '#92400E', fontWeight: '700' },

  availRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  availSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  btnRow:      { flexDirection: 'row', gap: 12 },
  cancelBtn:   { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  saveBtn:     { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
