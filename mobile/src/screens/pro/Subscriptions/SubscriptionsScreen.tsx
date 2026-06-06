import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { subscriptionsApi } from '../../../services/api/endpoints/subscriptions';
import { usersApi } from '../../../services/api/endpoints/users';
import { paymentsApi } from '../../../services/api/endpoints/payments';
import { useProTheme } from '../../../hooks/useProTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subscription {
  id: string;
  plan: string;
  status: string;
  renewalDate?: string;
  monthlyCost?: number;
  currentPeriodEnd?: string;
}

interface Invoice {
  id: string;
  date: string;
  description?: string;
  amount: number;
  status: 'paid' | 'pending' | string;
  pdfUrl?: string;
}

interface Transaction {
  id: string;
  date: string;
  description?: string;
  amount: number;
  type?: string;
}

// ─── Plan definitions ─────────────────────────────────────────────────────────

type PlanKey = 'starter' | 'business' | 'entreprise';

interface PlanDef {
  key: PlanKey;
  name: string;
  price: string;
  features: string[];
  cost: number;
}

const PLANS: PlanDef[] = [
  {
    key: 'starter',
    name: 'Starter',
    price: 'Gratuit',
    cost: 0,
    features: [
      "Jusqu'à 3 annonces actives",
      'Réservations en ligne',
      'Messagerie clients',
      '0 % de commission sur les réservations',
      'Statistiques de base (vues & clics)',
      'Support par email',
      'Profil professionnel public',
      'Application mobile Primeo',
      'Photos dans les annonces',
      'Calendrier de disponibilité',
    ],
  },
  {
    key: 'business',
    name: 'Business',
    price: '9 000 FCFA',
    cost: 9000,
    features: [
      "Jusqu'à 10 annonces actives",
      '0 % de commission sur les réservations',
      '2 boosts gratuits/mois (3 jours chacun)',
      'Badge vérifié sur le profil',
      '+30 % de visibilité dans les résultats',
      'Vidéos dans les annonces',
      'Statistiques avancées (conversion, revenus)',
      'Support prioritaire (réponse < 24 h)',
      'Profil professionnel public',
      'Application mobile Primeo',
      'Photos dans les annonces',
      'Calendrier de disponibilité',
      'Réservations en ligne',
      'Messagerie clients',
      'Historique complet des réservations',
    ],
  },
  {
    key: 'entreprise',
    name: 'Entreprise',
    price: '24 000 FCFA',
    cost: 24000,
    features: [
      '40 annonces actives (illimitées pour restaurants)',
      '0 % de commission sur les réservations',
      '7 boosts gratuits/mois (3 jours chacun)',
      'Badge premium sur le profil',
      'Visibilité prioritaire dans les résultats',
      'Visite virtuelle 3D des biens',
      'Gestion multi-utilisateurs (équipe)',
      'Rapport PDF mensuel de performance',
      'Programme de fidélité clients',
      'Vidéos dans les annonces',
      'Statistiques avancées (conversion, revenus)',
      'Support dédié VIP (réponse < 4 h)',
      'Profil professionnel public',
      'Application mobile Primeo',
      'Photos illimitées dans les annonces',
      'Calendrier de disponibilité avancé',
      'Réservations en ligne',
      'Messagerie clients',
      'Historique complet des réservations',
      'Accès aux nouvelles fonctionnalités en avant-première',
    ],
  },
];

// Tableau comparatif — 20 lignes (Starter ✓ sur 10, Business ✓ sur 15, Entreprise ✓ sur 20)
const COMPARISON_ROWS: { label: string; starter: string; business: string; entreprise: string }[] = [
  { label: 'Annonces actives',       starter: '3',        business: '10',          entreprise: '40 (∞ resto)' },
  { label: 'Commission',             starter: '0 %',      business: '0 %',         entreprise: '0 %' },
  { label: 'Réservations en ligne',  starter: '✓',        business: '✓',           entreprise: '✓' },
  { label: 'Messagerie clients',     starter: '✓',        business: '✓',           entreprise: '✓' },
  { label: 'Profil public',          starter: '✓',        business: '✓',           entreprise: '✓' },
  { label: 'Photos annonces',        starter: '✓',        business: '✓',           entreprise: 'Illimitées' },
  { label: 'Calendrier dispo',       starter: '✓',        business: '✓',           entreprise: 'Avancé' },
  { label: 'Statistiques',           starter: 'Basiques', business: 'Avancées',    entreprise: 'Avancées' },
  { label: 'Application mobile',     starter: '✓',        business: '✓',           entreprise: '✓' },
  { label: 'Support',                starter: 'Email',    business: 'Prioritaire', entreprise: 'VIP dédié' },
  { label: 'Boosts gratuits/mois',   starter: '—',        business: '2 (3 j)',     entreprise: '7 (3 j)' },
  { label: 'Vidéo annonce',          starter: '—',        business: '✓',           entreprise: '✓' },
  { label: 'Badge',                  starter: '—',        business: 'Vérifié',     entreprise: 'Premium' },
  { label: 'Visibilité',             starter: 'Standard', business: '+30 %',       entreprise: 'Prioritaire' },
  { label: 'Historique réservations',starter: '—',        business: '✓',           entreprise: '✓' },
  { label: 'Visite virtuelle 3D',    starter: '—',        business: '—',           entreprise: '✓' },
  { label: 'Multi-utilisateurs',     starter: '—',        business: '—',           entreprise: '✓' },
  { label: 'Rapport PDF mensuel',    starter: '—',        business: '—',           entreprise: '✓' },
  { label: 'Programme fidélité',     starter: '—',        business: '—',           entreprise: '✓' },
  { label: 'Prix /mois',             starter: 'Gratuit',  business: '9 000 F',     entreprise: '24 000 F' },
];

// Le backend utilise directement 'starter' / 'business' / 'entreprise'
function toBackendPlan(key: PlanKey): string {
  return key;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatAmount(n: number): string {
  return `${n.toLocaleString('fr-CI')} FCFA`;
}

function normalizePlanKey(raw: string | undefined): PlanKey | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes('entreprise') || lower.includes('premium')) return 'entreprise';
  if (lower.includes('business') || lower.includes('prestige')) return 'business';
  if (lower.includes('starter') || lower.includes('essential') || lower.includes('essentiel')) return 'starter';
  return null;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Current plan card ────────────────────────────────────────────────────────

interface CurrentPlanCardProps {
  subscription: Subscription | null;
}

function CurrentPlanCard({ subscription }: CurrentPlanCardProps) {
  const planKey = normalizePlanKey(subscription?.plan);
  const planDef = PLANS.find((p) => p.key === planKey);
  const planName = planDef?.name ?? subscription?.plan ?? 'Essentiel';
  const renewalDate =
    subscription?.renewalDate ??
    subscription?.currentPeriodEnd;
  const cost = subscription?.monthlyCost ?? planDef?.cost ?? 0;

  return (
    <View style={styles.currentPlanCard}>
      <View style={styles.currentPlanTop}>
        <View>
          <Text style={styles.currentPlanLabel}>Formule actuelle</Text>
          <Text style={styles.currentPlanName}>{planName}</Text>
        </View>
        <View style={styles.currentPlanBadge}>
          <Text style={styles.currentPlanBadgeText}>Actif</Text>
        </View>
      </View>
      <View style={styles.currentPlanDetails}>
        <View style={styles.currentPlanDetail}>
          <Ionicons name="pricetag-outline" size={16} color="#1056E0" />
          <Text style={styles.currentPlanDetailText}>
            {cost === 0 ? 'Gratuit' : formatAmount(cost) + '/mois'}
          </Text>
        </View>
        {renewalDate ? (
          <View style={styles.currentPlanDetail}>
            <Ionicons name="refresh-outline" size={16} color="#6B7280" />
            <Text style={styles.currentPlanDetailText}>
              Renouvellement : {formatDate(renewalDate)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Wallet balance card ──────────────────────────────────────────────────────

function WalletCard({ balance }: { balance: number | null }) {
  return (
    <View style={styles.walletCard}>
      <View style={styles.walletLeft}>
        <Ionicons name="wallet-outline" size={24} color="#1056E0" />
        <View style={styles.walletInfo}>
          <Text style={styles.walletLabel}>Portefeuille virtuel</Text>
          <Text style={styles.walletAmount}>
            {balance !== null ? formatAmount(balance) : '—'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </View>
  );
}

// ─── Plan comparison card ─────────────────────────────────────────────────────

interface PlanCardProps {
  plan: PlanDef;
  isActive: boolean;
  isUpgrading: boolean;
  onChoose: (key: PlanKey) => void;
}

// Nombre de fonctionnalités visibles par défaut avant le bouton "Voir plus"
const FEATURES_PREVIEW_COUNT = 5;

function PlanCard({ plan, isActive, isUpgrading, onChoose }: PlanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleFeatures = expanded ? plan.features : plan.features.slice(0, FEATURES_PREVIEW_COUNT);
  const hasMore = plan.features.length > FEATURES_PREVIEW_COUNT;

  return (
    <View style={[styles.planCard, isActive && styles.planCardActive]}>
      {/* En-tête du plan */}
      <View style={styles.planHeader}>
        <View>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planCommission}>0 % de commission</Text>
        </View>
        <View style={styles.planPriceBox}>
          <Text style={styles.planPrice}>{plan.price}</Text>
          {plan.cost > 0 && <Text style={styles.planPriceUnit}>/mois</Text>}
        </View>
      </View>

      {/* Liste des avantages */}
      <View style={styles.featureList}>
        {visibleFeatures.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#1056E0" />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {/* Bouton Voir plus / Voir moins */}
      {hasMore && (
        <TouchableOpacity
          style={styles.toggleFeaturesBtn}
          onPress={() => setExpanded((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleFeaturesBtnText}>
            {expanded
              ? 'Voir moins'
              : `Voir plus (${plan.features.length - FEATURES_PREVIEW_COUNT} avantages supplémentaires)`}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#1056E0"
          />
        </TouchableOpacity>
      )}

      {/* CTA */}
      {isActive ? (
        <View style={styles.activePlanBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#1056E0" />
          <Text style={styles.activePlanBadgeText}>Actuel</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.choosePlanBtn}
          onPress={() => onChoose(plan.key)}
          disabled={isUpgrading}
          activeOpacity={0.8}
        >
          {isUpgrading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.choosePlanBtnText}>Choisir ce plan</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Comparison table ─────────────────────────────────────────────────────────

function ComparisonTable({ activePlanKey }: { activePlanKey: PlanKey | null }) {
  const colStyle = (key: PlanKey) => [
    styles.compCell,
    activePlanKey === key && styles.compCellActive,
  ];
  return (
    <View style={styles.compTable}>
      {/* En-tête */}
      <View style={[styles.compRow, styles.compHeaderRow]}>
        <View style={[styles.compCell, styles.compLabelCell]}>
          <Text style={styles.compHeaderText}>Critère</Text>
        </View>
        <View style={colStyle('starter')}><Text style={styles.compHeaderText}>Starter</Text></View>
        <View style={colStyle('business')}><Text style={styles.compHeaderText}>Business</Text></View>
        <View style={colStyle('entreprise')}><Text style={styles.compHeaderText}>Entreprise</Text></View>
      </View>
      {COMPARISON_ROWS.map((row, i) => (
        <View key={row.label} style={[styles.compRow, i % 2 === 1 && styles.compRowAlt]}>
          <View style={[styles.compCell, styles.compLabelCell]}>
            <Text style={styles.compLabelText}>{row.label}</Text>
          </View>
          <View style={colStyle('starter')}><Text style={styles.compValueText}>{row.starter}</Text></View>
          <View style={colStyle('business')}><Text style={styles.compValueText}>{row.business}</Text></View>
          <View style={colStyle('entreprise')}><Text style={styles.compValueText}>{row.entreprise}</Text></View>
        </View>
      ))}
    </View>
  );
}

// ─── Invoice item ─────────────────────────────────────────────────────────────

function InvoiceItem({ invoice }: { invoice: Invoice }) {
  const handleDownload = async () => {
    if (!invoice.pdfUrl) {
      Alert.alert('PDF non disponible', 'Le document PDF n\'est pas disponible pour cette facture.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(invoice.pdfUrl);
      if (supported) {
        await Linking.openURL(invoice.pdfUrl);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir ce lien.');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'ouverture du PDF.');
    }
  };

  const isPaid = invoice.status === 'paid';

  return (
    <View style={styles.invoiceItem}>
      <View style={styles.invoiceLeft}>
        <Text style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
        <Text style={styles.invoiceDesc} numberOfLines={1}>
          {invoice.description ?? 'Facture abonnement'}
        </Text>
        <View
          style={[
            styles.invoiceStatusBadge,
            { backgroundColor: isPaid ? '#D1FAE5' : '#FEF3C7' },
          ]}
        >
          <Text
            style={[
              styles.invoiceStatusText,
              { color: isPaid ? '#065F46' : '#D97706' },
            ]}
          >
            {isPaid ? 'Payée' : 'En attente'}
          </Text>
        </View>
      </View>
      <View style={styles.invoiceRight}>
        <Text style={styles.invoiceAmount}>{formatAmount(invoice.amount)}</Text>
        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={14} color="#1056E0" />
          <Text style={styles.downloadBtnText}>Télécharger</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Transaction item ─────────────────────────────────────────────────────────

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isDebit = (transaction.amount ?? 0) < 0;
  return (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.transactionIcon,
            { backgroundColor: isDebit ? '#FEE2E2' : '#D1FAE5' },
          ]}
        >
          <Ionicons
            name={isDebit ? 'arrow-up-outline' : 'arrow-down-outline'}
            size={16}
            color={isDebit ? '#DC2626' : '#065F46'}
          />
        </View>
        <View>
          <Text style={styles.transactionDesc} numberOfLines={1}>
            {transaction.description ?? 'Transaction'}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text
          style={[
            styles.transactionAmount,
            { color: isDebit ? '#DC2626' : '#065F46' },
          ]}
        >
          {isDebit ? '-' : '+'}{formatAmount(Math.abs(transaction.amount))}
        </Text>
        {transaction.type ? (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{transaction.type}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SubscriptionsScreen() {
  useNavigation<any>();
  const theme = useProTheme();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<PlanKey | null>(null);
  // Annonces suspendues suite à une rétrogradation — affichées dans une alerte dédiée
  const [suspendedAfterDowngrade, setSuspendedAfterDowngrade] = useState<Array<{ id: string; title: string }>>([]);

  const fetchAll = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const [subRes, userRes, invoiceRes, txRes] = await Promise.allSettled([
      subscriptionsApi.getMySubscription(),
      usersApi.getProfile(),
      subscriptionsApi.listInvoices(),
      paymentsApi.listTransactions({ limit: 10 }),
    ]);

    if (subRes.status === 'fulfilled') {
      const d = subRes.value.data?.data ?? subRes.value.data;
      setSubscription(d ?? null);
    }

    if (userRes.status === 'fulfilled') {
      const d = userRes.value.data?.data ?? userRes.value.data;
      setWalletBalance(d?.walletBalance ?? null);
    }

    if (invoiceRes.status === 'fulfilled') {
      const d = invoiceRes.value.data?.data ?? invoiceRes.value.data;
      setInvoices(Array.isArray(d) ? d : []);
    }

    if (txRes.status === 'fulfilled') {
      const d = txRes.value.data?.data ?? txRes.value.data;
      setTransactions(Array.isArray(d) ? d : []);
    }

    if (silent) setRefreshing(false);
    else setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  const handleRefresh = useCallback(() => {
    fetchAll(true);
  }, [fetchAll]);

  const openCheckout = useCallback((url: string) => {
    if (Platform.OS === 'web') {
      // window.open dans le contexte du clic n'est pas bloqué par le navigateur
      if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url).catch(() => {
        Alert.alert('Erreur', "Impossible d'ouvrir la page de paiement.");
      });
    }
  }, []);

  const handleChoosePlan = useCallback(
    (planKey: PlanKey) => {
      const planDef = PLANS.find((p) => p.key === planKey);
      const currentPlanKey = normalizePlanKey(subscription?.plan);
      const currentPlanDef = PLANS.find((p) => p.key === currentPlanKey);
      const currentCost = subscription?.monthlyCost ?? currentPlanDef?.cost ?? 0;
      const isUpgrade = (planDef?.cost ?? 0) > currentCost;

      // Calcul des fonctionnalités gagnées / perdues pour le récapitulatif
      const currentFeatures = new Set(currentPlanDef?.features ?? []);
      const newFeatures = new Set(planDef?.features ?? []);
      const gained = planDef?.features.filter((f) => !currentFeatures.has(f)).slice(0, 4) ?? [];
      const lost   = currentPlanDef?.features.filter((f) => !newFeatures.has(f)).slice(0, 4) ?? [];

      const featureSummary = isUpgrade
        ? gained.length > 0 ? `\n\nNouveaux avantages :\n${gained.map((f) => `  ✓ ${f}`).join('\n')}` : ''
        : lost.length > 0   ? `\n\nAvantages retirés :\n${lost.map((f) => `  ✗ ${f}`).join('\n')}` : '';

      const confirmMessage = isUpgrade
        ? `Passer à la formule ${planDef?.name} (${planDef?.price}/mois) ?\n\nVous serez redirigé vers Genius Pay. La formule est activée dès la validation du paiement.${featureSummary}`
        : `Passer à la formule ${planDef?.name} ?\n\nLe changement prendra effet à votre prochaine date de facturation.${featureSummary}`;

      Alert.alert('Changer de formule', confirmMessage, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isUpgrade ? 'Payer maintenant' : 'Confirmer',
          style: isUpgrade ? 'default' : 'destructive',
          onPress: async () => {
            setUpgradingPlan(planKey);
            try {
              const res = await subscriptionsApi.upgrade(toBackendPlan(planKey));
              const data = res.data?.data ?? res.data;

              if (data?.requiresPayment && data?.checkoutUrl) {
                openCheckout(data.checkoutUrl);
                Alert.alert(
                  'Paiement en cours',
                  'Finalisez le paiement dans Genius Pay. Votre formule sera mise à jour automatiquement dès validation.',
                );
              } else {
                // Rétrogradation programmée — vérifier si des annonces seront suspendues
                const suspended: Array<{ id: string; title: string }> = data?.suspendedProperties ?? [];
                if (suspended.length > 0) {
                  setSuspendedAfterDowngrade(suspended);
                } else {
                  Alert.alert(
                    'Changement programmé',
                    data?.message ?? 'Votre formule sera mise à jour à la prochaine date de facturation.',
                  );
                }
              }
              fetchAll(true);
            } catch (e: any) {
              const msg =
                e?.response?.data?.error ??
                e?.response?.data?.message ??
                'Impossible de changer de formule. Veuillez réessayer.';
              Alert.alert('Erreur', msg);
            } finally {
              setUpgradingPlan(null);
            }
          },
        },
      ]);
    },
    [fetchAll, openCheckout, subscription],
  );

  const activePlanKey = normalizePlanKey(subscription?.plan);

  // Alerte annonces suspendues après rétrogradation
  if (suspendedAfterDowngrade.length > 0) {
    const titles = suspendedAfterDowngrade.map((p) => `• ${p.title}`).join('\n');
    Alert.alert(
      'Annonces désactivées',
      `La rétrogradation entraînera la désactivation de ${suspendedAfterDowngrade.length} annonce(s) lors de son effet :\n\n${titles}\n\nSupprimez des annonces ou passez à une formule supérieure pour les conserver actives.`,
      [
        { text: 'Passer à Business', onPress: () => { setSuspendedAfterDowngrade([]); handleChoosePlan('business'); } },
        { text: 'Continuer', style: 'destructive', onPress: () => setSuspendedAfterDowngrade([]) },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* ── Section 1: Current plan & wallet ── */}
        <SectionHeader title="Mon abonnement" />
        <CurrentPlanCard subscription={subscription} />
        <WalletCard balance={walletBalance} />

        {/* ── Section 2: Plan comparison ── */}
        <SectionHeader title="Choisir une formule" />
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            isActive={activePlanKey === plan.key}
            isUpgrading={upgradingPlan === plan.key}
            onChoose={handleChoosePlan}
          />
        ))}

        {/* ── Tableau comparatif ── */}
        <SectionHeader title="Tableau comparatif" />
        <ComparisonTable activePlanKey={activePlanKey} />

        {/* ── Section 3: Invoice history ── */}
        <SectionHeader title="Historique de facturation" />
        {invoices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={32} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucune facture disponible</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {invoices.map((inv: Invoice, i: number) => (
              <View key={inv.id}>
                <InvoiceItem invoice={inv} />
                {i < invoices.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        {/* ── Section 4: Transaction history ── */}
        <SectionHeader title="Transactions" />
        {transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="swap-horizontal-outline" size={32} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucune transaction</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {transactions.map((tx: Transaction, i: number) => (
              <View key={tx.id}>
                <TransactionItem transaction={tx} />
                {i < transactions.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Section header
  sectionHeader: {
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  // Current plan card
  currentPlanCard: {
    backgroundColor: '#1056E0',
    borderRadius: 14,
    padding: 20,
    gap: 14,
  },
  currentPlanTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentPlanLabel: {
    fontSize: 12,
    color: '#A7F3D0',
    fontWeight: '500',
  },
  currentPlanName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  currentPlanBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  currentPlanBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  currentPlanDetails: {
    gap: 8,
  },
  currentPlanDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentPlanDetailText: {
    fontSize: 13,
    color: '#D1FAE5',
  },

  // Wallet card
  walletCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletInfo: {
    gap: 2,
  },
  walletLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  walletAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  // Plan card
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  planCardActive: {
    borderColor: '#1056E0',
    backgroundColor: '#F0FDF4',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  planCommission: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  planPriceBox: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1056E0',
  },
  planPriceUnit: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  featureList: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  toggleFeaturesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 2,
  },
  toggleFeaturesBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1056E0',
  },
  activePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  activePlanBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  choosePlanBtn: {
    backgroundColor: '#1056E0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  choosePlanBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Comparison table
  compTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  compHeaderRow: {
    backgroundColor: '#1056E0',
  },
  compRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  compCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  compCellActive: {
    backgroundColor: '#EFF5FF',
  },
  compLabelCell: {
    flex: 1.4,
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  compHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  compLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  compValueText: {
    fontSize: 12,
    color: '#111827',
    textAlign: 'center',
  },

  // List card wrapper
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },

  // Invoice item
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    gap: 8,
  },
  invoiceLeft: {
    flex: 1,
    gap: 4,
  },
  invoiceDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  invoiceDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  invoiceStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  invoiceStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 6,
    backgroundColor: '#F0FDF4',
  },
  downloadBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1056E0',
  },

  // Transaction item
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  transactionDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  typeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Empty state
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
