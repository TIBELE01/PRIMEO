import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ClientScreenProps } from '../../../navigation/types';
import { disputesApi } from '../../../services/api/endpoints/disputes';
import { PageHeader } from '../../../components/layout/PageHeader';

type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_refund_full'
  | 'resolved_refund_partial'
  | 'resolved_no_refund';

interface DisputeItem {
  id: string;
  bookingId: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  resolution?: string;
  refundAmount?: number;
  createdAt: string;
  resolvedAt?: string;
  booking?: {
    property?: { id: string; title: string; coverImage?: string };
    startDate?: string;
    endDate?: string;
  };
}

const STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string; icon: string }> = {
  open:                     { label: 'Ouvert',                icon: '🔴', color: '#DC2626' },
  under_review:             { label: 'En examen',             icon: '🔍', color: '#D97706' },
  resolved_refund_full:     { label: 'Remboursé (total)',     icon: '✅', color: '#1056E0' },
  resolved_refund_partial:  { label: 'Remboursé (partiel)',   icon: '🟡', color: '#D97706' },
  resolved_no_refund:       { label: 'Rejeté',               icon: '⛔', color: '#6B7280' },
};

const REASON_LABELS: Record<string, string> = {
  non_conformity: 'Non-conformité',
  payment_issue: 'Problème de paiement',
  cancellation: 'Annulation abusive',
  no_show: 'Accès impossible',
  other: 'Autre problème',
};

type Props = ClientScreenProps<'DisputeList'>;

export function DisputeListScreen({ navigation }: Props) {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await disputesApi.getMyDisputes();
      const data: DisputeItem[] = res?.data?.data ?? res?.data ?? [];
      setDisputes(data);
    } catch { /* keep stale */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isResolved = (s: DisputeStatus) =>
    s === 'resolved_refund_full' || s === 'resolved_refund_partial' || s === 'resolved_no_refund';

  const openDisputes = disputes.filter(d => !isResolved(d.status));
  const closedDisputes = disputes.filter(d => isResolved(d.status));

  const renderItem = ({ item }: { item: DisputeItem }) => {
    const cfg = STATUS_CONFIG[item.status] ?? { label: item.status, color: '#9CA3AF', icon: '❓' };
    const cover = item.booking?.property?.coverImage;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DisputeDetail', { disputeId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardRow}>
          {cover
            ? <Image source={{ uri: cover }} style={styles.thumb} />
            : <View style={[styles.thumb, styles.thumbFallback]}><Text style={styles.thumbIcon}>🏡</Text></View>
          }
          <View style={styles.cardInfo}>
            <Text style={styles.propTitle} numberOfLines={1}>
              {item.booking?.property?.title ?? 'Propriété'}
            </Text>
            <Text style={styles.reasonLabel}>{REASON_LABELS[item.reason] ?? item.reason}</Text>
            <Text style={styles.dateLabel}>
              {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.statusCol}>
            <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
              <Text style={styles.statusIcon}>{cfg.icon}</Text>
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            {item.refundAmount != null && item.refundAmount > 0 && (
              <Text style={styles.refundAmt}>+{item.refundAmount.toLocaleString()} FCFA</Text>
            )}
          </View>
        </View>

        {item.resolution && (
          <View style={styles.resolutionRow}>
            <Text style={styles.resolutionLabel}>Décision :</Text>
            <Text style={styles.resolutionText} numberOfLines={2}>{item.resolution}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.viewDetail}>Voir le détail →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ title, count }: { title: string; count: number }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCount}><Text style={styles.sectionCountText}>{count}</Text></View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <PageHeader title="Mes litiges" />
        <View style={styles.centered}><ActivityIndicator size="large" color="#DC2626" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <PageHeader title="Mes litiges" />
      <Text style={styles.headerSub}>{disputes.length} litige{disputes.length !== 1 ? 's' : ''}</Text>

      <FlatList
        data={[...openDisputes, ...closedDisputes]}
        keyExtractor={(item, i) => item.id ?? String(i)}
        contentContainerStyle={[styles.list, disputes.length === 0 && styles.emptyFlex]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#DC2626" />}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          openDisputes.length > 0 ? (
            <SectionHeader title="En cours" count={openDisputes.length} />
          ) : null
        }
        ListFooterComponent={
          closedDisputes.length > 0 ? (
            <>
              <SectionHeader title="Résolus" count={closedDisputes.length} />
            </>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Text style={styles.emptyIcon}>⚖️</Text>
            <Text style={styles.emptyTitle}>Aucun litige</Text>
            <Text style={styles.emptyMsg}>
              Si vous rencontrez un problème avec une réservation, vous pouvez ouvrir un litige depuis la page de détail.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  headerSub: { fontSize: 13, color: '#9CA3AF', paddingHorizontal: 20, paddingVertical: 6, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  emptyFlex: { flex: 1 },
  emptyInner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 80, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyMsg: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount: { backgroundColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  sectionCountText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  thumbFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  thumbIcon: { fontSize: 24 },
  cardInfo: { flex: 1 },
  propTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  reasonLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  dateLabel: { fontSize: 11, color: '#9CA3AF' },
  statusCol: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusIcon: { fontSize: 11 },
  statusText: { fontSize: 11, fontWeight: '700' },
  refundAmt: { fontSize: 12, fontWeight: '700', color: '#1056E0' },
  resolutionRow: { flexDirection: 'row', gap: 6, marginTop: 10, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 8, alignItems: 'flex-start' },
  resolutionLabel: { fontSize: 12, fontWeight: '700', color: '#374151', minWidth: 60 },
  resolutionText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 17 },
  cardFooter: { marginTop: 10, alignItems: 'flex-end' },
  viewDetail: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
});
