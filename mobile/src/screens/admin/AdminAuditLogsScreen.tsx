// Journal d'audit admin — consultation sécurisée (lecture seule) des actions
// sensibles : filtres par action / type de cible / période, pagination et
// export CSV via la feuille de partage native. Les logs sont immuables côté
// base (trigger SQL) : aucun bouton de modification ou suppression n'existe.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Share, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { adminAuditApi } from '../../services/api/endpoints/adminApi';

interface AuditLog {
  id: string;
  action: string;
  description: string | null;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
}

// Familles d'actions proposées en filtre rapide (préfixe du champ action)
const ACTION_FILTERS = [
  { label: 'Tout', value: '' },
  { label: 'KYC', value: 'kyc' },
  { label: 'Comptes', value: 'user' },
  { label: 'Annonces', value: 'property' },
  { label: 'Remboursements', value: 'refund' },
  { label: 'Litiges', value: 'dispute' },
  { label: 'Maintenance', value: 'maintenance' },
];

function actionColor(action: string): string {
  if (action.includes('ban') || action.includes('reject') || action.includes('suspend')) return '#D93025';
  if (action.includes('approve') || action.includes('reactivate')) return '#188038';
  if (action.includes('refund') || action.includes('maintenance')) return '#E37400';
  return '#1056E0';
}

export default function AdminAuditLogsScreen() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = useCallback(async (p = 1, refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await adminAuditApi.list({
        page: p,
        limit: 50,
        ...(actionFilter ? { action: actionFilter } : {}),
      });
      setLogs(data.data ?? []);
      setPages(data.pages ?? 1);
      setPage(p);
    } catch {
      // Erreur réseau : on garde la liste affichée
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actionFilter]);

  useEffect(() => { load(1); }, [load]);

  const onExport = async () => {
    setExporting(true);
    try {
      const { data } = await adminAuditApi.exportCsv(actionFilter ? { action: actionFilter } : undefined);
      await Share.share({
        title: 'Journal d\'audit Primeo (CSV)',
        message: typeof data === 'string' ? data : String(data),
      });
    } catch {
      // Partage annulé ou erreur réseau — rien à faire
    } finally {
      setExporting(false);
    }
  };

  const visible = search.trim()
    ? logs.filter((l) =>
        [l.action, l.description, l.targetId, l.user?.email]
          .filter(Boolean)
          .some((f) => (f as string).toLowerCase().includes(search.trim().toLowerCase())))
    : logs;

  const renderItem = ({ item }: { item: AuditLog }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.actionBadge, { backgroundColor: `${actionColor(item.action)}18` }]}>
          <Text style={[styles.actionText, { color: actionColor(item.action) }]}>{item.action}</Text>
        </View>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
      <View style={styles.metaRow}>
        <Ionicons name="person-outline" size={13} color="#888" />
        <Text style={styles.meta}>
          {item.user ? `${item.user.firstName} ${item.user.lastName}` : 'Système'}
        </Text>
        {item.targetType ? (
          <>
            <Ionicons name="locate-outline" size={13} color="#888" style={styles.metaIcon} />
            <Text style={styles.meta}>{item.targetType} · {item.targetId?.slice(0, 8)}…</Text>
          </>
        ) : null}
        {item.ipAddress ? (
          <>
            <Ionicons name="globe-outline" size={13} color="#888" style={styles.metaIcon} />
            <Text style={styles.meta}>{item.ipAddress}</Text>
          </>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#16224D" />
        </TouchableOpacity>
        <Text style={styles.title}>Journal d'audit</Text>
        <TouchableOpacity onPress={onExport} disabled={exporting} accessibilityRole="button">
          {exporting
            ? <ActivityIndicator size="small" color="#1056E0" />
            : <Ionicons name="download-outline" size={24} color="#1056E0" />}
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher (action, cible, email…)"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        horizontal
        data={ACTION_FILTERS}
        keyExtractor={(f) => f.value}
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={styles.filtersContent}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.chip, actionFilter === f.value && styles.chipActive]}
            onPress={() => setActionFilter(f.value)}
          >
            <Text style={[styles.chipText, actionFilter === f.value && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#1056E0" />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(l) => l.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, true)} />}
          ListEmptyComponent={<Text style={styles.empty}>Aucune entrée d'audit pour ces critères.</Text>}
          ListFooterComponent={pages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity disabled={page <= 1} onPress={() => load(page - 1)} style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}>
                <Ionicons name="chevron-back" size={18} color={page <= 1 ? '#bbb' : '#1056E0'} />
              </TouchableOpacity>
              <Text style={styles.pageText}>{page} / {pages}</Text>
              <TouchableOpacity disabled={page >= pages} onPress={() => load(page + 1)} style={[styles.pageBtn, page >= pages && styles.pageBtnDisabled]}>
                <Ionicons name="chevron-forward" size={18} color={page >= pages ? '#bbb' : '#1056E0'} />
              </TouchableOpacity>
            </View>
          ) : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#16224D' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16,
    borderRadius: 10, paddingHorizontal: 12, height: 42, gap: 8, borderWidth: 1, borderColor: '#E5E9F0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#16224D' },
  filters: { maxHeight: 46, marginTop: 10 },
  filtersContent: { paddingHorizontal: 16, gap: 8 },
  chip: { backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 14, height: 34, justifyContent: 'center', borderWidth: 1, borderColor: '#E5E9F0' },
  chipActive: { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  chipText: { fontSize: 13, color: '#555', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  loader: { marginTop: 40 },
  list: { padding: 16, paddingTop: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EDF0F5' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  actionBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  actionText: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 12, color: '#999' },
  description: { fontSize: 14, color: '#333', marginBottom: 8, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  meta: { fontSize: 12, color: '#888' },
  metaIcon: { marginLeft: 8 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E9F0' },
  pageBtnDisabled: { opacity: 0.5 },
  pageText: { fontSize: 14, fontWeight: '600', color: '#16224D' },
});
