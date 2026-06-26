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
import { PageHeader } from '../../../components/layout/PageHeader';

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
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
}

const SECTIONS = ['Entrées', 'Plats principaux', 'Desserts', 'Boissons', 'Snacks', 'Menus'];
const SECTION_ICONS: Record<string, string> = {
  'Entrées':          '🥗',
  'Plats principaux': '🍽️',
  'Desserts':         '🍰',
  'Boissons':         '🥤',
  'Snacks':           '🥪',
  'Menus':            '📋',
};
const ALLERGEN_LIST = ['Gluten', 'Lactose', 'Arachides', 'Œufs', 'Poisson', 'Soja', 'Noix', 'Sésame', 'Céleri', 'Moutarde'];

// Conseils santé prédéfinis sélectionnables
const HEALTH_TIPS = [
  'Faible en calories',
  'Riche en protéines',
  'Sans gluten',
  'Végétarien',
  'Vegan',
  'Riche en fibres',
  'Faible en sel',
  'Riche en oméga-3',
];

const PORTION_SIZES = ['Petite', 'Normale', 'Grande', 'À partager'];

function formatPrice(n?: number | null): string {
  return (n ?? 0).toLocaleString('fr-CI') + ' FCFA';
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
            {item.status && item.status !== 'approved' ? (
              <View style={[styles.statusPill, item.status === 'rejected' ? styles.statusRejected : styles.statusPending]}>
                <Text style={styles.statusPillText}>
                  {item.status === 'rejected'
                    ? `✕ Refusé${item.rejectionReason ? ` — ${item.rejectionReason}` : ''}`
                    : '⏳ En attente de validation'}
                </Text>
              </View>
            ) : null}
            {item.description ? (
              <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
            ) : null}
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={onEdit} accessibilityRole="button" accessibilityLabel="Modifier l'article">
              <Ionicons name="pencil" size={15} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onDelete} accessibilityRole="button" accessibilityLabel="Supprimer l'article">
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

  // Formulaire modal 5 étapes
  const [modalVisible,      setModalVisible]      = useState(false);
  const [editingItem,       setEditingItem]        = useState<MenuItem | null>(null);
  const [formStep,          setFormStep]           = useState(1);
  // Étape 1 : Catégorie + Nom
  const [formSection,       setFormSection]        = useState(SECTIONS[0]);
  const [formName,          setFormName]           = useState('');
  // Étape 2 : Description + Ingrédients
  const [formDesc,          setFormDesc]           = useState('');
  const [formIngredients,   setFormIngredients]    = useState('');
  // Étape 3 : Accompagnement + Ration
  const [formPortion,       setFormPortion]        = useState('Normale');
  const [formAccompagnement,setFormAccompagnement] = useState('');
  // Étape 4 : Prix + Photo
  const [formPrice,         setFormPrice]          = useState('');
  const [formPhoto,         setFormPhoto]          = useState('');
  // Étape 5 : Allergènes + Conseils santé + Disponibilité
  const [formAllergens,     setFormAllergens]      = useState<string[]>([]);
  const [formHealthTips,    setFormHealthTips]     = useState<string[]>([]);
  const [formAvailable,     setFormAvailable]      = useState(true);
  const [formError,         setFormError]          = useState<string | null>(null);
  const [saving,            setSaving]             = useState(false);

  // ── Chargement ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Résoudre l'ID du restaurant du compte (auth) — /api/restaurant, repli getMyListings.
      let pid = '';
      try {
        const r = await restaurantApi.getMyRestaurant();
        pid = (r.data?.data ?? r.data)?.id ?? '';
      } catch { /* repli ci-dessous */ }
      if (!pid) {
        try {
          const propRes = await propertiesApi.getMyListings();
          const listings: any[] = propRes.data?.data ?? propRes.data ?? [];
          pid = listings[0]?.id ?? '';
        } catch { /* pid reste vide */ }
      }
      setPropertyId(pid || null);
      if (!pid) { setNoProperty(true); setLoading(false); return; }
      setNoProperty(false);

      // 2) Charger les plats : vue gestion (TOUS les statuts) → repli sur la vue
      // publique (validés) — c'est le chemin qui fonctionne côté client, donc
      // les plats validés s'affichent toujours, même si /menu/all échoue.
      let data: MenuItem[] = [];
      try {
        const m = await restaurantApi.getMenuItemsManage(pid);
        data = m.data?.data ?? m.data ?? [];
      } catch {
        try {
          const m = await restaurantApi.getMenuItems(pid);
          data = m.data?.data ?? m.data ?? [];
        } catch { /* data vide */ }
      }
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

  const resetForm = () => {
    setFormStep(1);
    setFormSection(SECTIONS[0]);
    setFormName('');
    setFormDesc('');
    setFormIngredients('');
    setFormPortion('Normale');
    setFormAccompagnement('');
    setFormPrice('');
    setFormPhoto('');
    setFormAllergens([]);
    setFormHealthTips([]);
    setFormAvailable(true);
    setFormError(null);
  };

  const openCreate = () => {
    setEditingItem(null);
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormStep(1);
    setFormSection(item.section);
    setFormName(item.name);
    setFormDesc(item.description ?? '');
    setFormIngredients('');
    setFormPortion('Normale');
    setFormAccompagnement('');
    setFormPrice(String(item.price));
    setFormPhoto(item.photoUrl ?? '');
    setFormAllergens(item.allergens ?? []);
    setFormHealthTips([]);
    setFormAvailable(item.isAvailable);
    setFormError(null);
    setModalVisible(true);
  };

  const toggleAllergen  = (a: string) =>
    setFormAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  const toggleHealthTip = (t: string) =>
    setFormHealthTips(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const TOTAL_STEPS = 5;
  const STEP_LABELS = [
    'Catégorie & Nom',
    'Description & Ingrédients',
    'Accompagnement & Ration',
    'Prix & Photo',
    'Santé & Disponibilité',
  ];

  const validateStep = (step: number): string | null => {
    if (step === 1 && !formName.trim()) return 'Le nom du plat est requis.';
    if (step === 4) {
      const p = parseFloat(formPrice.replace(/\s/g, '').replace(',', '.'));
      if (isNaN(p) || p < 0) return 'Veuillez saisir un prix valide (≥ 0 FCFA).';
    }
    return null;
  };

  const handleNextStep = () => {
    const err = validateStep(formStep);
    if (err) { setFormError(err); return; }
    setFormError(null);
    setFormStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const handlePrevStep = () => {
    setFormError(null);
    setFormStep(s => Math.max(s - 1, 1));
  };

  const handleSave = async () => {
    if (!propertyId) {
      Alert.alert('Erreur', 'Aucun établissement trouvé.');
      return;
    }
    const trimName = formName.trim();
    if (!trimName) { Alert.alert('Erreur', 'Le nom de l\'article est requis.'); return; }
    const price = parseFloat(formPrice.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(price) || price < 0) { Alert.alert('Erreur', 'Veuillez saisir un prix valide (≥ 0).'); return; }

    // Assemblage de la description complète avec ingrédients et accompagnement
    const parts: string[] = [];
    if (formDesc.trim())          parts.push(formDesc.trim());
    if (formIngredients.trim())   parts.push(`Ingrédients : ${formIngredients.trim()}`);
    if (formAccompagnement.trim()) parts.push(`Accompagnement : ${formAccompagnement.trim()} (${formPortion})`);
    if (formHealthTips.length)    parts.push(`Infos santé : ${formHealthTips.join(', ')}`);
    const fullDescription = parts.join('\n') || undefined;

    setSaving(true);
    try {
      if (editingItem) {
        const data = {
          name: trimName,
          description: fullDescription,
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
          description: fullDescription,
          price: Math.round(price),
          allergens: formAllergens,
          isAvailable: formAvailable,
          ...(formPhoto.trim() ? { photoUrl: formPhoto.trim() } : {}),
        };
        const res = await restaurantApi.createMenuItem(propertyId, payload);
        const created: MenuItem = res.data?.data ?? res.data;
        if (created) setItems(prev => [...prev, created]);
      }
      setModalVisible(false);
    } catch (err: any) {
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
          <Text style={styles.onboardingTitle}>Restaurant en préparation</Text>
          <Text style={styles.onboardingDesc}>
            Votre restaurant est en cours de configuration. Actualisez pour gérer votre menu.
          </Text>
          <TouchableOpacity
            style={[styles.onboardingBtn, { backgroundColor: PRIMARY }]}
            onPress={() => load()}
            accessibilityRole="button"
            accessibilityLabel="Actualiser"
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.onboardingBtnText}>Actualiser</Text>
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
      <PageHeader title="Menu" />
      {/* Stats + action */}
      <View style={styles.header}>
        <Text style={styles.headerSub}>{totalItems} article{totalItems !== 1 ? 's' : ''} · {availableCount} disponible{availableCount !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: PRIMARY }]} onPress={openCreate} accessibilityRole="button" accessibilityLabel="Ajouter un article au menu">
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
            accessibilityRole="button"
            accessibilityLabel={sec === 'Tout' ? 'Voir tout le menu' : `Section ${sec}`}
            accessibilityState={{ selected: activeSection === sec }}
          >
            {sec !== 'Tout' && <Text style={styles.tabIcon}>{SECTION_ICONS[sec] ?? '🍴'}</Text>}
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
            <TouchableOpacity style={[styles.emptyBtn, { borderColor: PRIMARY }]} onPress={openCreate} accessibilityRole="button" accessibilityLabel="Ajouter un article au menu">
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

      {/* Modal création/édition — formulaire 5 étapes */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>
              {editingItem ? 'Modifier l\'article' : 'Nouvel article'}
            </Text>

            {/* Indicateur 5 étapes */}
            <View style={styles.stepIndicatorRow}>
              {Array.from({ length: TOTAL_STEPS }, (_, idx) => {
                const s = idx + 1;
                return (
                  <React.Fragment key={s}>
                    <View style={[
                      styles.stepDot,
                      formStep === s && styles.stepDotActive,
                      formStep > s  && styles.stepDotDone,
                    ]}>
                      <Text style={[styles.stepDotText, formStep >= s && styles.stepDotTextActive]}>
                        {formStep > s ? '✓' : String(s)}
                      </Text>
                    </View>
                    {idx < TOTAL_STEPS - 1 && (
                      <View style={[styles.stepLine, formStep > s && styles.stepLineDone]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
            <Text style={styles.stepLabel}>{STEP_LABELS[formStep - 1]}</Text>

            {/* Bannière d'erreur inline */}
            {formError ? (
              <View style={styles.inlineErrorWrap}>
                <Ionicons name="alert-circle" size={15} color="#B91C1C" />
                <Text style={styles.inlineErrorText}>{formError}</Text>
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>

              {/* ─ Étape 1 : Catégorie & Nom ─ */}
              {formStep === 1 && (
                <>
                  {!editingItem && (
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Catégorie *</Text>
                      <View style={styles.chipRow}>
                        {SECTIONS.map(sec => (
                          <TouchableOpacity
                            key={sec}
                            style={[styles.chip, formSection === sec && { backgroundColor: PRIMARY, borderColor: PRIMARY }]}
                            onPress={() => setFormSection(sec)}
                            accessibilityRole="button"
                            accessibilityLabel={`Catégorie ${sec}`}
                          >
                            <Text style={styles.chipIcon}>{SECTION_ICONS[sec] ?? '🍴'}</Text>
                            <Text style={[styles.chipText, formSection === sec && styles.chipTextActive]}>{sec}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Nom du plat *</Text>
                    <TextInput
                      style={styles.input}
                      value={formName}
                      onChangeText={setFormName}
                      placeholder="ex : Attiéké poisson braisé"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                    />
                  </View>
                </>
              )}

              {/* ─ Étape 2 : Description & Ingrédients ─ */}
              {formStep === 2 && (
                <>
                  <View style={styles.field}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>Description <Text style={styles.optional}>(optionnel)</Text></Text>
                      <Text style={styles.charCount}>{formDesc.length}/500</Text>
                    </View>
                    <TextInput
                      style={[styles.input, styles.inputMulti]}
                      value={formDesc}
                      onChangeText={t => setFormDesc(t.slice(0, 500))}
                      placeholder="Décrivez le plat, sa préparation, son goût…"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Ingrédients principaux <Text style={styles.optional}>(optionnel)</Text></Text>
                    <TextInput
                      style={[styles.input, styles.inputMulti]}
                      value={formIngredients}
                      onChangeText={setFormIngredients}
                      placeholder="ex : riz, tomates, oignon, poisson fumé, huile de palme…"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                    <Text style={styles.fieldHint}>Listez les ingrédients séparés par des virgules</Text>
                  </View>
                </>
              )}

              {/* ─ Étape 3 : Accompagnement & Ration ─ */}
              {formStep === 3 && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Taille de la portion</Text>
                    <View style={styles.chipRow}>
                      {PORTION_SIZES.map(p => (
                        <TouchableOpacity
                          key={p}
                          style={[styles.chip, formPortion === p && { backgroundColor: PRIMARY, borderColor: PRIMARY }]}
                          onPress={() => setFormPortion(p)}
                          accessibilityRole="button"
                          accessibilityLabel={`Portion ${p}`}
                        >
                          <Text style={[styles.chipText, formPortion === p && styles.chipTextActive]}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Accompagnement proposé <Text style={styles.optional}>(optionnel)</Text></Text>
                    <TextInput
                      style={[styles.input, styles.inputMulti]}
                      value={formAccompagnement}
                      onChangeText={setFormAccompagnement}
                      placeholder="ex : salade verte, frites maison, riz blanc, alloco…"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                    <Text style={styles.fieldHint}>
                      Précisez les garnitures, sauces ou accompagnements servis avec le plat
                    </Text>
                  </View>
                  {(formPortion !== 'Normale' || formAccompagnement.trim()) && (
                    <View style={styles.portionPreview}>
                      <Ionicons name="information-circle-outline" size={16} color={PRIMARY} />
                      <Text style={styles.portionPreviewText}>
                        Portion {formPortion.toLowerCase()}
                        {formAccompagnement.trim() ? ` · ${formAccompagnement.trim()}` : ''}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* ─ Étape 4 : Prix & Photo ─ */}
              {formStep === 4 && (
                <>
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
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Photo du plat <Text style={styles.optional}>(URL optionnelle)</Text></Text>
                    <TextInput
                      style={styles.input}
                      value={formPhoto}
                      onChangeText={setFormPhoto}
                      placeholder="https://…"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                    <Text style={styles.fieldHint}>Collez un lien direct vers une image (jpg, png…)</Text>
                  </View>
                  {formPhoto.trim().length > 0 && (
                    <View style={styles.photoPreviewWrap}>
                      <Image source={{ uri: formPhoto.trim() }} style={styles.photoPreview} resizeMode="cover" />
                    </View>
                  )}
                </>
              )}

              {/* ─ Étape 5 : Santé & Disponibilité + Récapitulatif ─ */}
              {formStep === 5 && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Allergènes <Text style={styles.optional}>(sélectionner ceux présents)</Text></Text>
                    <View style={styles.chipRow}>
                      {ALLERGEN_LIST.map(a => (
                        <TouchableOpacity
                          key={a}
                          style={[styles.allergenChip, formAllergens.includes(a) && styles.allergenChipActive]}
                          onPress={() => toggleAllergen(a)}
                          accessibilityRole="button"
                          accessibilityLabel={`Allergène ${a}`}
                        >
                          <Text style={[styles.allergenChipText, formAllergens.includes(a) && styles.allergenChipTextActive]}>
                            {a}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {formAllergens.length > 0 && (
                      <View style={styles.allergenSummary}>
                        <Text style={styles.allergenSummaryText}>{formAllergens.join(' · ')}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Conseils santé <Text style={styles.optional}>(optionnel)</Text></Text>
                    <View style={styles.chipRow}>
                      {HEALTH_TIPS.map(t => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.healthChip, formHealthTips.includes(t) && styles.healthChipActive]}
                          onPress={() => toggleHealthTip(t)}
                          accessibilityRole="button"
                          accessibilityLabel={`Conseil santé ${t}`}
                        >
                          <Text style={[styles.healthChipText, formHealthTips.includes(t) && styles.healthChipTextActive]}>
                            {t}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

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

                  {/* Récapitulatif complet */}
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Récapitulatif</Text>
                    {[
                      { k: 'Plat',          v: formName || '—' },
                      ...(!editingItem ? [{ k: 'Catégorie', v: `${SECTION_ICONS[formSection] ?? '🍴'} ${formSection}` }] : []),
                      { k: 'Portion',       v: formPortion },
                      ...(formAccompagnement.trim() ? [{ k: 'Accomp.', v: formAccompagnement.trim() }] : []),
                      { k: 'Prix',          v: formPrice ? `${formPrice} FCFA` : '—' },
                      ...(formAllergens.length ? [{ k: 'Allergènes', v: formAllergens.join(', ') }] : []),
                      ...(formHealthTips.length ? [{ k: 'Santé', v: formHealthTips.join(', ') }] : []),
                    ].map(({ k, v }) => (
                      <View key={k} style={styles.summaryRow}>
                        <Text style={styles.summaryKey}>{k}</Text>
                        <Text style={styles.summaryVal} numberOfLines={2}>{v}</Text>
                      </View>
                    ))}
                    {formPhoto.trim().length > 0 && (
                      <View style={[styles.summaryRow, { alignItems: 'flex-start' }]}>
                        <Text style={styles.summaryKey}>Photo</Text>
                        <Image source={{ uri: formPhoto.trim() }} style={styles.summaryPhoto} resizeMode="cover" />
                      </View>
                    )}
                  </View>
                </>
              )}

            </ScrollView>

            {/* Navigation bas */}
            <View style={[styles.btnRow, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={formStep === 1 ? () => setModalVisible(false) : handlePrevStep}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={formStep === 1 ? 'Annuler' : 'Étape précédente'}
              >
                <Text style={styles.cancelBtnText}>{formStep === 1 ? 'Annuler' : '← Retour'}</Text>
              </TouchableOpacity>

              {formStep < TOTAL_STEPS ? (
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: PRIMARY }]} onPress={handleNextStep} accessibilityRole="button" accessibilityLabel="Étape suivante">
                  <Text style={styles.saveBtnText}>Suivant →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: PRIMARY }, saving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel="Enregistrer l'article"
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>Enregistrer</Text>}
                </TouchableOpacity>
              )}
            </View>
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
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerSub:  { fontSize: 12, color: '#6B7280' },
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
  statusPill:     { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  statusPending:  { backgroundColor: '#FEF3C7' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
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

  // Indicateur 5 étapes (dots plus petits pour tenir sur une ligne)
  stepIndicatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { borderColor: PRIMARY, backgroundColor: PRIMARY },
  stepDotDone:   { borderColor: PRIMARY2, backgroundColor: PRIMARY2 },
  stepDotText:   { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },
  stepDotTextActive: { color: '#fff' },
  stepLine:  { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 2 },
  stepLineDone: { backgroundColor: PRIMARY2 },
  stepLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 14, textAlign: 'center' },

  // Erreur inline
  inlineErrorWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12 },
  inlineErrorText: { flex: 1, fontSize: 13, color: '#B91C1C', fontWeight: '500' },

  // Champs supplémentaires
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  charCount: { fontSize: 11, color: '#9CA3AF' },
  fieldHint: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  // Aperçu photo
  photoPreviewWrap: { alignItems: 'center', marginBottom: 16 },
  photoPreview: { width: '100%', height: 160, borderRadius: 12 },

  // Sélection allergènes
  allergenSummary: { marginTop: 8, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  allergenSummaryText: { fontSize: 12, color: '#92400E', fontWeight: '500' },

  // Conseils santé
  healthChip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  healthChipActive:   { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  healthChipText:     { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  healthChipTextActive: { color: '#15803D', fontWeight: '700' },

  // Aperçu portion
  portionPreview: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PRIMARY + '10', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 4 },
  portionPreviewText: { fontSize: 12, color: PRIMARY, fontWeight: '600', flex: 1 },

  // Récapitulatif
  summaryCard: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 16, marginTop: 8, gap: 10 },
  summaryTitle: { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryKey: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', width: 68 },
  summaryVal: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '600' },
  summaryPhoto: { width: 60, height: 44, borderRadius: 8 },
});
