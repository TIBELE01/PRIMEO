import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Promotion {
  id: string;
  title: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  validUntil?: string;
  isActive: boolean;
}

interface CreatePromoForm {
  title: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: string;
  validUntil: string;
}

const EMPTY_FORM: CreatePromoForm = {
  title: '',
  description: '',
  discountType: 'percent',
  discountValue: '',
  validUntil: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDiscount(promo: Promotion): string {
  if (promo.discountType === 'percent') {
    return `−${promo.discountValue}%`;
  }
  return `−${promo.discountValue.toLocaleString('fr-CI')} FCFA`;
}

function formatValidUntil(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `Valide jusqu'au ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  } catch {
    return null;
  }
}

let _localIdCounter = 1;
function nextLocalId(): string {
  return `local-${Date.now()}-${_localIdCounter++}`;
}

// ─── Promo Card ───────────────────────────────────────────────────────────────

interface PromoCardProps {
  promo: Promotion;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

function PromoCard({ promo, onToggle, onDelete }: PromoCardProps) {
  const validLabel = formatValidUntil(promo.validUntil);

  const handleDelete = () => {
    Alert.alert(
      'Supprimer l\'offre',
      `Supprimer "${promo.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => onDelete(promo.id) },
      ],
    );
  };

  return (
    <View style={styles.promoCard}>
      {/* Top row */}
      <View style={styles.promoCardTop}>
        <View style={styles.promoCardTitleBlock}>
          <Text style={styles.promoTitle}>{promo.title}</Text>
          {promo.description ? (
            <Text style={styles.promoDescription}>{promo.description}</Text>
          ) : null}
        </View>
        <View style={styles.discountBadge}>
          <Text style={styles.discountBadgeText}>{formatDiscount(promo)}</Text>
        </View>
      </View>

      {/* Validity */}
      {validLabel ? (
        <View style={styles.validRow}>
          <Ionicons name="time-outline" size={12} color="#6B7280" />
          <Text style={styles.validText}>{validLabel}</Text>
        </View>
      ) : null}

      {/* Bottom row: toggle + delete */}
      <View style={styles.promoCardBottom}>
        <View style={styles.activeRow}>
          <Switch
            value={promo.isActive}
            onValueChange={v => onToggle(promo.id, v)}
            trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
            thumbColor={promo.isActive ? '#1056E0' : '#9CA3AF'}
          />
          <Text style={[styles.activeLabel, promo.isActive ? styles.activeLabelOn : styles.activeLabelOff]}>
            {promo.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={16} color="#DC2626" />
          <Text style={styles.deleteBtnText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Create Promo Modal ───────────────────────────────────────────────────────

interface CreatePromoModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (form: CreatePromoForm) => Promise<void>;
}

function CreatePromoModal({ visible, onClose, onSubmit }: CreatePromoModalProps) {
  const [form, setForm] = useState<CreatePromoForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => setForm(EMPTY_FORM);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      Alert.alert('Champ requis', 'Le titre de l\'offre est obligatoire.');
      return;
    }
    const val = parseFloat(form.discountValue.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      Alert.alert('Valeur invalide', 'Veuillez saisir une valeur de réduction valide.');
      return;
    }
    if (form.discountType === 'percent' && val > 100) {
      Alert.alert('Valeur invalide', 'Le pourcentage ne peut pas dépasser 100%.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ ...form, discountValue: String(val) });
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrapper}
        >
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Créer une offre</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <Text style={styles.inputLabel}>Titre <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Menu découverte à −15%"
                value={form.title}
                onChangeText={v => setForm(p => ({ ...p, title: v }))}
                maxLength={80}
              />

              {/* Description */}
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Décrivez votre offre…"
                value={form.description}
                onChangeText={v => setForm(p => ({ ...p, description: v }))}
                multiline
                numberOfLines={3}
                maxLength={300}
              />

              {/* Discount type */}
              <Text style={styles.inputLabel}>Type de réduction</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeSelectorBtn,
                    form.discountType === 'percent' && styles.typeSelectorBtnActive,
                  ]}
                  onPress={() => setForm(p => ({ ...p, discountType: 'percent' }))}
                >
                  <Text
                    style={[
                      styles.typeSelectorText,
                      form.discountType === 'percent' && styles.typeSelectorTextActive,
                    ]}
                  >
                    Pourcentage
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeSelectorBtn,
                    form.discountType === 'fixed' && styles.typeSelectorBtnActive,
                  ]}
                  onPress={() => setForm(p => ({ ...p, discountType: 'fixed' }))}
                >
                  <Text
                    style={[
                      styles.typeSelectorText,
                      form.discountType === 'fixed' && styles.typeSelectorTextActive,
                    ]}
                  >
                    Montant fixe (FCFA)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Discount value */}
              <Text style={styles.inputLabel}>
                Valeur {form.discountType === 'percent' ? '(%)' : '(FCFA)'}
                {' '}<Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={form.discountType === 'percent' ? 'Ex: 10' : 'Ex: 2000'}
                value={form.discountValue}
                onChangeText={v => setForm(p => ({ ...p, discountValue: v }))}
                keyboardType="decimal-pad"
              />

              {/* Valid until */}
              <Text style={styles.inputLabel}>Valide jusqu'au (JJ/MM/AAAA, optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 31/12/2025"
                value={form.validUntil}
                onChangeText={v => setForm(p => ({ ...p, validUntil: v }))}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Créer l'offre</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PromotionsScreen() {
  const navigation = useNavigation<any>();

  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // Step 1: resolve propertyId
      let pid = propertyId;
      if (!pid) {
        const propRes = await propertiesApi.getMyListings();
        const listings = propRes.data?.data ?? propRes.data ?? [];
        if (Array.isArray(listings) && listings.length > 0) {
          pid = listings[0].id as string;
          setPropertyId(pid);
        }
      }

      if (!pid) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Step 2: fetch promotions
      const res = await restaurantApi.getPromotions(pid);
      const data: Promotion[] = res.data?.data ?? res.data ?? [];
      setPromos(Array.isArray(data) ? data : []);
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  // Toggle active state (optimistic, no API endpoint yet)
  const handleToggle = useCallback((id: string, active: boolean) => {
    setPromos(prev => prev.map(p => p.id === id ? { ...p, isActive: active } : p));
  }, []);

  // Delete promo
  const handleDelete = useCallback(
    async (id: string) => {
      if (!propertyId) return;
      // Optimistic removal
      setPromos(prev => prev.filter(p => p.id !== id));
      try {
        await restaurantApi.deletePromotion(propertyId, id);
      } catch {
        // If it was a local/optimistic item the API won't know about it — ignore
      }
    },
    [propertyId],
  );

  // Create promo
  const handleCreate = useCallback(
    async (form: CreatePromoForm) => {
      // Parse validUntil DD/MM/YYYY → ISO
      let validUntilISO: string | undefined;
      if (form.validUntil.trim()) {
        const parts = form.validUntil.trim().split('/');
        if (parts.length === 3) {
          validUntilISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        ...(validUntilISO ? { validUntil: validUntilISO } : {}),
      };

      const optimistic: Promotion = {
        id: nextLocalId(),
        title: payload.title,
        description: payload.description,
        discountType: payload.discountType,
        discountValue: payload.discountValue,
        validUntil: validUntilISO,
        isActive: true,
      };

      if (!propertyId) {
        // No property yet — add locally only
        setPromos(prev => [optimistic, ...prev]);
        setModalVisible(false);
        Alert.alert(
          'Information',
          'Cette fonctionnalité sera disponible prochainement. Votre offre a été enregistrée localement.',
        );
        return;
      }

      try {
        const res = await restaurantApi.createPromotion(propertyId, payload);
        const created: Promotion = res.data?.data ?? res.data ?? optimistic;
        setPromos(prev => [created, ...prev]);
        setModalVisible(false);
      } catch {
        // API not available yet — add optimistically and inform user
        setPromos(prev => [optimistic, ...prev]);
        setModalVisible(false);
        Alert.alert(
          'Information',
          'Cette fonctionnalité sera disponible prochainement. Votre offre a été enregistrée localement.',
        );
      }
    },
    [propertyId],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1056E0" />
          <Text style={styles.loadingText}>Chargement des offres…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Offres spéciales</Text>
        <Text style={styles.screenSubtitle}>Attirez plus de clients</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => load(true)}
            tintColor="#1056E0"
            colors={['#1056E0']}
          />
        }
      >
        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
          <Text style={styles.infoText}>
            Les offres spéciales sont affichées sur la fiche de votre restaurant et attirent
            plus de réservations.
          </Text>
        </View>

        {/* No property warning */}
        {!propertyId && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={18} color="#D97706" />
            <Text style={styles.warningText}>
              Créez d'abord votre annonce restaurant pour publier des offres.
            </Text>
          </View>
        )}

        {/* Promotions list */}
        {promos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={52} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Aucune offre pour le moment</Text>
            <Text style={styles.emptySubtitle}>
              Créez votre première offre spéciale pour attirer plus de clients.
            </Text>
          </View>
        ) : (
          promos.map(p => (
            <PromoCard
              key={p.id}
              promo={p}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))
        )}

        {/* Bottom spacer for FAB */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.fabText}>Créer une offre</Text>
      </TouchableOpacity>

      {/* Create modal */}
      <CreatePromoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreate}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },

  screenHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  screenTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  screenSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  scroll: { padding: 16, paddingBottom: 20 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18 },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },

  // Promo card
  promoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  promoCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  promoCardTitleBlock: { flex: 1 },
  promoTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  promoDescription: { fontSize: 13, color: '#6B7280', marginTop: 3, lineHeight: 18 },
  discountBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  discountBadgeText: { fontSize: 14, fontWeight: '800', color: '#065F46' },

  validRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  validText: { fontSize: 12, color: '#6B7280' },

  promoCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeLabel: { fontSize: 13, fontWeight: '600' },
  activeLabelOn: { color: '#1056E0' },
  activeLabelOff: { color: '#9CA3AF' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#1056E0',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalWrapper: { justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

  // Form
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 6,
  },
  required: { color: '#DC2626' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 11,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeSelectorBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  typeSelectorBtnActive: {
    borderColor: '#1056E0',
    backgroundColor: '#F0FDF4',
  },
  typeSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeSelectorTextActive: {
    color: '#1056E0',
  },

  submitBtn: {
    backgroundColor: '#1056E0',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
