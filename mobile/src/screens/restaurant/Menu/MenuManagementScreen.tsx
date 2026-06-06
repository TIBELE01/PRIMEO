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
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';
import { subscriptionsApi } from '../../../services/api/endpoints/subscriptions';

interface MenuItem {
  id: string;
  name: string;
  section: string;
  description?: string;
  price: number;
  allergens?: string[];
  isAvailable: boolean;
  sortOrder?: number;
}

interface Subscription {
  planType?: string;
  plan?: string;
}

const PLAN_LIMITS: Record<string, number> = {
  starter: 3,
  business: 10,
  entreprise: Infinity,
};

function getPlanLimit(sub: Subscription | null): number {
  if (!sub) return 10;
  const plan = (sub.planType ?? sub.plan ?? '').toLowerCase();
  return PLAN_LIMITS[plan] ?? 10;
}

function formatLimit(limit: number): string {
  return limit === Infinity ? '∞' : String(limit);
}

interface Props {
  route: { params: { propertyId: string } };
  navigation: any;
}

export default function MenuManagementScreen({ route, navigation }: Props) {
  const { propertyId } = route.params;

  const [items, setItems] = useState<MenuItem[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [menuRes, subRes] = await Promise.allSettled([
        restaurantApi.getMenuItems(propertyId),
        subscriptionsApi.getMySubscription(),
      ]);

      if (menuRes.status === 'fulfilled') {
        const raw = (menuRes.value as any)?.data ?? menuRes.value ?? [];
        setItems(Array.isArray(raw) ? raw : []);
      } else {
        throw new Error((menuRes.reason as any)?.message ?? 'Erreur chargement menu');
      }

      if (subRes.status === 'fulfilled') {
        setSubscription((subRes.value as any)?.data ?? subRes.value ?? null);
      }
      // Subscription failure is non-fatal — keep default limit
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors du chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await restaurantApi.updateMenuItem(propertyId, item.id, { isAvailable: !item.isAvailable });
      setItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, isAvailable: !item.isAvailable } : i)
      );
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de modifier la disponibilité');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await restaurantApi.deleteMenuItem(propertyId, deleteTarget.id);
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer l\'article');
    } finally {
      setDeleting(false);
    }
  };

  const limit = getPlanLimit(subscription);
  const usedCount = items.length;
  const limitReached = limit !== Infinity && usedCount >= limit;
  const progressFraction = limit === Infinity ? 0 : Math.min(usedCount / limit, 1);

  // Group by section
  const sections: Record<string, MenuItem[]> = {};
  items.forEach(item => {
    const key = item.section || 'Autres';
    if (!sections[key]) sections[key] = [];
    sections[key].push(item);
  });

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1056E0" />
          <Text style={s.loadingText}>Chargement du menu…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchData()}>
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
        <Text style={s.headerTitle}>Gestion du menu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#1056E0" />
        }
      >
        {/* Plan usage card */}
        <View style={s.usageCard}>
          <View style={s.usageRow}>
            <Text style={s.usageLabel}>Menus utilisés</Text>
            <Text style={s.usageCount}>
              <Text style={s.usageUsed}>{usedCount}</Text>
              <Text style={s.usageSep}> / </Text>
              <Text style={s.usageMax}>{formatLimit(limit)}</Text>
            </Text>
          </View>
          {limit !== Infinity && (
            <View style={s.progressBar}>
              <View
                style={[
                  s.progressFill,
                  { width: `${progressFraction * 100}%` as any },
                  limitReached && s.progressFillFull,
                ]}
              />
            </View>
          )}
          {limitReached && (
            <Text style={s.limitWarning}>
              Limite atteinte. Passez à un plan supérieur pour ajouter davantage d'articles.
            </Text>
          )}
        </View>

        {/* Add button */}
        <TouchableOpacity
          style={[s.addBtn, limitReached && s.addBtnDisabled]}
          onPress={() => {
            if (limitReached) return;
            navigation.navigate('AddMenuItem', { propertyId });
          }}
          disabled={limitReached}
          activeOpacity={0.8}
        >
          <Text style={s.addBtnIcon}>+</Text>
          <Text style={s.addBtnText}>Ajouter un menu</Text>
        </TouchableOpacity>

        {items.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyIcon}>🍽️</Text>
            <Text style={s.emptyTitle}>Aucun article de menu</Text>
            <Text style={s.emptySubtitle}>
              Ajoutez vos plats, boissons et desserts pour les afficher à vos clients.
            </Text>
          </View>
        ) : (
          Object.entries(sections).map(([sectionName, sectionItems]) => (
            <View key={sectionName} style={s.sectionGroup}>
              <Text style={s.sectionLabel}>{sectionName}</Text>
              {sectionItems.map(item => (
                <View key={item.id} style={s.itemCard}>
                  <View style={s.itemTopRow}>
                    <View style={s.itemInfo}>
                      <Text style={s.itemName}>{item.name}</Text>
                      {item.description ? (
                        <Text style={s.itemDesc} numberOfLines={2}>{item.description}</Text>
                      ) : null}
                    </View>
                    <Text style={s.itemPrice}>{item.price.toLocaleString('fr-FR')} FCFA</Text>
                  </View>
                  <View style={s.itemBottomRow}>
                    <View style={s.availabilityRow}>
                      <Switch
                        value={item.isAvailable}
                        onValueChange={() => handleToggleAvailability(item)}
                        trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                        thumbColor={item.isAvailable ? '#1056E0' : '#9CA3AF'}
                      />
                      <Text style={[s.availabilityText, !item.isAvailable && s.unavailableText]}>
                        {item.isAvailable ? 'Disponible' : 'Indisponible'}
                      </Text>
                    </View>
                    <View style={s.itemActions}>
                      <TouchableOpacity
                        style={s.editBtn}
                        onPress={() => navigation.navigate('AddMenuItem', { propertyId, item })}
                      >
                        <Text style={s.editBtnText}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.deleteBtn}
                        onPress={() => setDeleteTarget(item)}
                      >
                        <Text style={s.deleteBtnText}>Suppr.</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Supprimer cet article ?</Text>
            {deleteTarget ? (
              <Text style={s.confirmText}>{deleteTarget.name}</Text>
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
  retryBtn: { backgroundColor: '#1056E0', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
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
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Usage card
  usageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  usageLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  usageCount: { fontSize: 14, fontWeight: '700' },
  usageUsed: { color: '#1056E0', fontSize: 16 },
  usageSep: { color: '#9CA3AF' },
  usageMax: { color: '#9CA3AF' },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1056E0',
    borderRadius: 4,
  },
  progressFillFull: { backgroundColor: '#DC2626' },
  limitWarning: { fontSize: 12, color: '#DC2626', marginTop: 8, fontWeight: '500' },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1056E0',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 8,
    shadowColor: '#1056E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  addBtnDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0 },
  addBtnIcon: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Empty state
  emptyContainer: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  // Section
  sectionGroup: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1056E0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },

  // Item card
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  itemTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  itemInfo: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  itemDesc: { fontSize: 13, color: '#6B7280', marginTop: 3, lineHeight: 18 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: '#1056E0' },

  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  availabilityText: { fontSize: 13, fontWeight: '600', color: '#16A34A' },
  unavailableText: { color: '#9CA3AF' },

  itemActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#1056E0' },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  confirmText: { fontSize: 15, fontWeight: '600', color: '#374151', textAlign: 'center', marginBottom: 4 },
  confirmSubText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 4 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  modalDeleteText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  disabledBtn: { opacity: 0.5 },
});
