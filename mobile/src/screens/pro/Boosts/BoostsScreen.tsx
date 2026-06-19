import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  Pressable,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { boostsApi } from '../../../services/api/endpoints/boosts';
import { propertiesApi } from '../../../services/api/endpoints/properties';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BoostBalance {
  freeBoostsRemaining: number;
  freeBoostsTotal: number;
  freeBoostDuration: number;
  plan: string;
}

interface Boost {
  id: string;
  propertyId: string;
  property: { name: string };
  type: 'paid' | 'free';
  expiresAt: string;
  createdAt: string;
  isActive: boolean;
}

interface Property {
  id: string;
  name: string;
  status?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `J-${days} ${hours % 24}h ${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

function progressFraction(boost: Boost, freeBoostDuration: number): number {
  const totalMs =
    boost.type === 'paid'
      ? 72 * 3_600_000
      : freeBoostDuration * 24 * 3_600_000;
  const createdAt = new Date(boost.createdAt).getTime();
  const expiresAt = new Date(boost.expiresAt).getTime();
  const totalDuration = expiresAt - createdAt || totalMs;
  const elapsed = Date.now() - createdAt;
  return Math.min(Math.max(elapsed / totalDuration, 0), 1);
}

function planLabel(plan: string): string {
  const p = plan.toLowerCase();
  if (p === 'entreprise') return 'Entreprise';
  if (p === 'business') return 'Business';
  // rétrocompatibilité anciens noms
  if (p === 'premium' || p === 'prestige') return p === 'premium' ? 'Entreprise' : 'Business';
  return 'Starter';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BoostsScreen() {
  const navigation = useNavigation();

  const [balance, setBalance] = useState<BoostBalance | null>(null);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectorVisible, setSelectorVisible] = useState(false);

  // Tick every second to keep countdowns live
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const [balRes, boostRes, propRes] = await Promise.allSettled([
        boostsApi.getBalance(),
        boostsApi.getMyBoosts(),
        propertiesApi.getMyListings(),
      ]);

      if (balRes.status === 'fulfilled') {
        const d = balRes.value.data?.data ?? balRes.value.data;
        setBalance(d as BoostBalance);
      }
      if (boostRes.status === 'fulfilled') {
        const d = boostRes.value.data?.data ?? boostRes.value.data;
        setBoosts(Array.isArray(d) ? (d as Boost[]) : []);
      }
      if (propRes.status === 'fulfilled') {
        const d = propRes.value.data?.data ?? propRes.value.data;
        const list = Array.isArray(d) ? d : (d?.listings ?? d?.properties ?? []);
        // Les propriétés exposent `title` côté backend ; on ne boost que les annonces actives
        const mapped: Property[] = (list as any[])
          .map((p) => ({ id: p.id, name: p.title ?? p.name ?? 'Annonce', status: p.status }))
          .filter((p) => p.status === 'active' || p.status === undefined);
        setProperties(mapped);
      }
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeBoosts = boosts.filter(b => b.isActive);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const openCheckout = useCallback((url: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url).catch(() => {
        Alert.alert('Erreur', "Impossible d'ouvrir la page de paiement.");
      });
    }
  }, []);

  const extractError = (e: any, fallback: string) =>
    e?.response?.data?.error ?? e?.response?.data?.message ?? fallback;

  // Boost payant 2 000 FCFA → redirection Genius Pay, activation après validation du paiement
  const handlePurchase = () => {
    if (!selectedPropertyId) {
      Alert.alert('Sélection requise', 'Veuillez choisir une annonce à booster.');
      return;
    }
    Alert.alert(
      'Confirmer l\'achat',
      `Booster "${selectedProperty?.name}" pour 2 000 FCFA via Genius Pay ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Payer maintenant',
          style: 'default',
          onPress: async () => {
            setIsPurchasing(true);
            try {
              const res = await boostsApi.create(selectedPropertyId, 'paid');
              const data = res.data?.data ?? res.data;
              if (data?.checkoutUrl) {
                openCheckout(data.checkoutUrl);
                Alert.alert(
                  'Paiement en cours',
                  'Finalisez le paiement dans la page Genius Pay. Le boost sera activé automatiquement dès sa validation.',
                );
              } else {
                Alert.alert('Succès', 'Votre boost a été activé.');
              }
              setSelectedPropertyId(null);
              await load(true);
            } catch (e) {
              Alert.alert('Erreur', extractError(e, 'Impossible de créer le boost. Veuillez réessayer.'));
            } finally {
              setIsPurchasing(false);
            }
          },
        },
      ],
    );
  };

  // Boost gratuit (quota mensuel Business/Entreprise) → activation immédiate
  const handleFreeBoost = () => {
    if (!selectedPropertyId) {
      Alert.alert('Sélection requise', 'Veuillez choisir une annonce à booster.');
      return;
    }
    Alert.alert(
      'Utiliser un boost gratuit',
      `Booster "${selectedProperty?.name}" avec un de vos boosts gratuits ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setIsPurchasing(true);
            try {
              await boostsApi.create(selectedPropertyId, 'free');
              setSelectedPropertyId(null);
              Alert.alert('Succès', 'Votre boost gratuit a été activé.');
              await load(true);
            } catch (e) {
              Alert.alert('Erreur', extractError(e, "Impossible d'activer le boost gratuit."));
            } finally {
              setIsPurchasing(false);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1056E0" />
        </View>
      </SafeAreaView>
    );
  }

  // Quota mensuel selon la formule (fourni par le backend) : Entreprise 7, Business 2, Starter 0
  const planNorm = balance?.plan?.toLowerCase() ?? '';
  const freeTotal = balance?.freeBoostsTotal
    ?? (planNorm === 'entreprise' || planNorm === 'premium' ? 7
      : planNorm === 'business' || planNorm === 'prestige' ? 2
      : 0);
  const freeRemaining = balance?.freeBoostsRemaining ?? 0;
  const freeDuration = balance?.freeBoostDuration ?? 3;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor="#1056E0" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mes boosts</Text>
          <Text style={styles.subtitle}>Mettez vos annonces en avant</Text>
        </View>

        {/* ── Section 1: Balance card ─────────────────────────────────────── */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceLeft}>
              <Text style={styles.balanceLabel}>Boosts gratuits restants ce mois</Text>
              <View style={styles.badgeRow}>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberBadgeText}>
                    {freeRemaining}/{freeTotal}
                  </Text>
                </View>
                <View style={[
                  styles.planBadge,
                  (planNorm === 'entreprise' || planNorm === 'premium') && styles.planBadgePremium,
                  (planNorm === 'business' || planNorm === 'prestige') && styles.planBadgePrestige,
                ]}>
                  <Text style={styles.planBadgeText}>{planLabel(balance?.plan ?? 'Starter')}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="flash" size={32} color="#F59E0B" />
          </View>
          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.durationText}>
              Durée gratuite : {freeDuration} jour{freeDuration > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* ── Section 2: Active boosts ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Boosts actifs</Text>

          {activeBoosts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="flash-off-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyText}>Aucun boost actif pour le moment</Text>
              <Text style={styles.emptySubText}>
                Achetez un boost ou utilisez vos boosts gratuits ci-dessous
              </Text>
            </View>
          ) : (
            activeBoosts.map(boost => {
              const progress = progressFraction(boost, freeDuration);
              const remaining = timeRemaining(boost.expiresAt);
              const expired = remaining === 'Expiré';
              return (
                <View key={boost.id} style={styles.boostCard}>
                  <View style={styles.boostCardHeader}>
                    <View style={styles.boostCardLeft}>
                      <Text style={styles.boostPropertyName} numberOfLines={1}>
                        {boost.property?.name ?? 'Annonce'}
                      </Text>
                      <View style={[
                        styles.typeBadge,
                        boost.type === 'free' ? styles.typeBadgeFree : styles.typeBadgePaid,
                      ]}>
                        <Text style={[
                          styles.typeBadgeText,
                          boost.type === 'free' ? styles.typeBadgeTextFree : styles.typeBadgeTextPaid,
                        ]}>
                          {boost.type === 'free' ? 'Gratuit' : 'Payant'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.timerBadge, expired && styles.timerBadgeExpired]}>
                      <Ionicons
                        name={expired ? 'close-circle-outline' : 'timer-outline'}
                        size={13}
                        color={expired ? '#DC2626' : '#1056E0'}
                      />
                      <Text style={[styles.timerText, expired && styles.timerTextExpired]}>
                        {/* tick is used to force re-render each second */}
                        {tick >= 0 ? remaining : remaining}
                      </Text>
                    </View>
                  </View>
                  {/* Progress bar */}
                  <View style={styles.progressTrack}>
                    <View style={[
                      styles.progressFill,
                      { width: `${Math.round(progress * 100)}%` },
                      boost.type === 'paid' ? styles.progressFillPaid : styles.progressFillFree,
                    ]} />
                  </View>
                  <Text style={styles.progressLabel}>
                    {boost.type === 'paid' ? '72h' : `${freeDuration * 24}h`} total
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* ── Section 3: Purchase paid boost ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acheter un boost payant</Text>

          <View style={styles.infoCard}>
            <Ionicons name="flash" size={20} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.infoCardTitle}>72 heures — 2 000 FCFA</Text>
              <Text style={styles.infoCardSub}>
                Votre annonce sera mise en avant en tête des résultats
              </Text>
            </View>
          </View>

          {/* Property selector */}
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setSelectorVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Choisir une annonce à booster"
          >
            <Text style={selectedPropertyId ? styles.selectorTextSelected : styles.selectorPlaceholder}>
              {selectedProperty?.name ?? 'Choisir une annonce…'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>

          {/* Disclaimer */}
          <View style={styles.disclaimerRow}>
            <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
            <Text style={styles.disclaimerText}>
              Le paiement de 2 000 FCFA sera prélevé via Genius Pay sur votre compte.
            </Text>
          </View>

          {/* Free boost button — visible only when free boosts remain */}
          {freeRemaining > 0 && (
            <TouchableOpacity
              style={[styles.freeBoostBtn, (!selectedPropertyId || isPurchasing) && styles.freeBoostBtnDisabled]}
              onPress={handleFreeBoost}
              disabled={!selectedPropertyId || isPurchasing}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Utiliser un boost gratuit"
            >
              <Ionicons name="gift-outline" size={18} color="#15803D" style={{ marginRight: 8 }} />
              <Text style={styles.freeBoostBtnText}>
                Utiliser un boost gratuit ({freeDuration} j) — {freeRemaining} restant{freeRemaining > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}

          {/* Purchase button */}
          <TouchableOpacity
            style={[styles.purchaseBtn, (!selectedPropertyId || isPurchasing) && styles.purchaseBtnDisabled]}
            onPress={handlePurchase}
            disabled={!selectedPropertyId || isPurchasing}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Acheter un boost payant pour cette annonce"
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="flash" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.purchaseBtnText}>Booster cette annonce — 2 000 FCFA</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Property selector modal ─────────────────────────────────────── */}
      <Modal
        visible={selectorVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectorVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectorVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir une annonce</Text>
              <TouchableOpacity onPress={() => setSelectorVisible(false)} accessibilityRole="button" accessibilityLabel="Fermer la sélection d'annonce">
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            {properties.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>Aucune annonce disponible</Text>
              </View>
            ) : (
              <FlatList
                data={properties}
                keyExtractor={(item, i) => item.id ?? String(i)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.propertyRow,
                      item.id === selectedPropertyId && styles.propertyRowSelected,
                    ]}
                    onPress={() => {
                      setSelectedPropertyId(item.id);
                      setSelectorVisible(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Sélectionner ${item.name}`}
                    accessibilityState={{ selected: item.id === selectedPropertyId }}
                  >
                    <Text style={[
                      styles.propertyRowText,
                      item.id === selectedPropertyId && styles.propertyRowTextSelected,
                    ]}>
                      {item.name}
                    </Text>
                    {item.id === selectedPropertyId && (
                      <Ionicons name="checkmark-circle" size={20} color="#1056E0" />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={{ paddingBottom: 24 }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 16, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: 16, paddingBottom: 48 },

  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },

  // Balance card
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  balanceLeft: { flex: 1, marginRight: 12 },
  balanceLabel: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numberBadge: {
    backgroundColor: '#1056E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  numberBadgeText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  planBadge: {
    backgroundColor: '#EFF5FF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planBadgePrestige: { backgroundColor: '#DBEAFE' },
  planBadgePremium: { backgroundColor: '#FEF3C7' },
  planBadgeText: { fontSize: 12, fontWeight: '700', color: '#1056E0' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  durationText: { fontSize: 13, color: '#6B7280' },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  // Empty state
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    elevation: 1,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 12, textAlign: 'center' },
  emptySubText: { fontSize: 13, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },

  // Boost card
  boostCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  boostCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  boostCardLeft: { flex: 1, marginRight: 10 },
  boostPropertyName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  typeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  typeBadgeFree: { backgroundColor: '#DCFCE7' },
  typeBadgePaid: { backgroundColor: '#FEF9C3' },
  typeBadgeText: { fontSize: 12, fontWeight: '600' },
  typeBadgeTextFree: { color: '#15803D' },
  typeBadgeTextPaid: { color: '#B45309' },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timerBadgeExpired: { backgroundColor: '#FEF2F2' },
  timerText: { fontSize: 12, fontWeight: '700', color: '#1056E0' },
  timerTextExpired: { color: '#DC2626' },
  progressTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },
  progressFillFree: { backgroundColor: '#1056E0' },
  progressFillPaid: { backgroundColor: '#F59E0B' },
  progressLabel: { fontSize: 11, color: '#9CA3AF' },

  // Purchase section
  infoCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoCardTitle: { fontSize: 15, fontWeight: '700', color: '#92400E' },
  infoCardSub: { fontSize: 12, color: '#B45309', marginTop: 2 },
  selectorButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  selectorPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  selectorTextSelected: { fontSize: 14, color: '#111827', fontWeight: '600', flex: 1, marginRight: 8 },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  disclaimerText: { fontSize: 12, color: '#6B7280', flex: 1, lineHeight: 17 },
  purchaseBtn: {
    backgroundColor: '#1056E0',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  purchaseBtnDisabled: { backgroundColor: '#9CA3AF' },
  purchaseBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  freeBoostBtn: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  freeBoostBtnDisabled: { opacity: 0.5 },
  freeBoostBtnText: { color: '#15803D', fontSize: 14, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  propertyRowSelected: { backgroundColor: '#F0FDF4' },
  propertyRowText: { fontSize: 15, color: '#374151', flex: 1, marginRight: 8 },
  propertyRowTextSelected: { fontWeight: '700', color: '#1056E0' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 20 },
});
