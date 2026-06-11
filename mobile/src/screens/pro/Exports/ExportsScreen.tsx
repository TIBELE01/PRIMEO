// Écran « Exporter mes données » — tableau de bord professionnel.
// Lance un export asynchrone (CSV/PDF) des réservations, propriétés, transactions
// ou statistiques avancées (Business/Entreprise), liste les exports passés et
// permet de télécharger les fichiers prêts (lien sécurisé à durée limitée).
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { exportsApi, DataExport, ExportType, ExportFormat } from '../../../services/api/endpoints/exports';
import { useProTheme } from '../../../hooks/useProTheme';
import { useSubscription } from '../../../hooks/useSubscription';

const TYPE_OPTIONS: { value: ExportType; label: string; icon: string; advanced?: boolean }[] = [
  { value: 'bookings',       label: 'Réservations',          icon: 'calendar-outline' },
  { value: 'properties',     label: 'Propriétés',            icon: 'business-outline' },
  { value: 'transactions',   label: 'Transactions',          icon: 'card-outline' },
  { value: 'advanced_stats', label: 'Statistiques avancées', icon: 'bar-chart-outline', advanced: true },
];

const STATUS_LABELS: Record<DataExport['status'], { label: string; color: string }> = {
  pending:    { label: 'En attente',  color: '#D97706' },
  processing: { label: 'Génération…', color: '#D97706' },
  ready:      { label: 'Prêt',        color: '#16A34A' },
  failed:     { label: 'Échec',       color: '#DC2626' },
  expired:    { label: 'Expiré',      color: '#9CA3AF' },
};

const TYPE_LABELS: Record<ExportType, string> = {
  bookings: 'Réservations',
  properties: 'Propriétés',
  transactions: 'Transactions',
  advanced_stats: 'Stats avancées',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ExportsScreen() {
  const theme = useProTheme();
  const { subscription } = useSubscription();
  const isAdvancedPlan = subscription?.planType === 'business' || subscription?.planType === 'entreprise';

  const [exports, setExports] = useState<DataExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedType, setSelectedType] = useState<ExportType>('bookings');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');

  const load = useCallback(async () => {
    try {
      const res = await exportsApi.list();
      const list = res?.data?.data ?? res?.data ?? [];
      setExports(Array.isArray(list) ? list : []);
    } catch {
      // silencieux : la liste reste vide, l'utilisateur peut rafraîchir
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Recharge automatiquement tant qu'un export est en cours de génération
  useEffect(() => {
    const hasActive = exports.some((e) => e.status === 'pending' || e.status === 'processing');
    if (!hasActive) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [exports, load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await exportsApi.create({ type: selectedType, format: selectedFormat });
      Alert.alert(
        'Export lancé',
        'Votre fichier est en cours de génération. Vous recevrez un email dès qu\'il sera prêt — il apparaîtra aussi dans la liste ci-dessous.',
      );
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      Alert.alert('Échec', err?.response?.data?.error ?? err?.response?.data?.message ?? 'Impossible de lancer l\'export.');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (exp: DataExport) => {
    if (exp.status !== 'ready' || !exp.fileUrl) return;
    try {
      await Linking.openURL(exp.fileUrl);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le lien de téléchargement.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Exporter mes données</Text>
        <Text style={styles.subtitle}>
          Générez un fichier CSV ou PDF de vos données (3 derniers mois) pour votre archivage.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Choix du jeu de données */}
        <Text style={styles.sectionTitle}>Données à exporter</Text>
        <View style={styles.typeGrid}>
          {TYPE_OPTIONS.map((opt) => {
            const locked = opt.advanced && !isAdvancedPlan;
            const active = selectedType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.typeCard, active && { borderColor: theme.primary, backgroundColor: theme.primaryLight }]}
                onPress={() => {
                  if (locked) {
                    Alert.alert('Plan requis', 'L\'export des statistiques avancées est réservé aux plans Business et Entreprise.');
                    return;
                  }
                  setSelectedType(opt.value);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Exporter : ${opt.label}${locked ? ' (réservé aux plans Business et Entreprise)' : ''}`}
                accessibilityState={{ selected: active, disabled: !!locked }}
              >
                <Ionicons
                  name={(locked ? 'lock-closed-outline' : opt.icon) as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={locked ? '#9CA3AF' : active ? theme.primary : '#6B7280'}
                />
                <Text style={[styles.typeLabel, locked && { color: '#9CA3AF' }, active && { color: theme.primary, fontWeight: '700' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Choix du format */}
        <Text style={styles.sectionTitle}>Format</Text>
        <View style={styles.formatRow}>
          {(['csv', 'pdf'] as ExportFormat[]).map((f) => {
            const active = selectedFormat === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.formatBtn, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => setSelectedFormat(f)}
                accessibilityRole="button"
                accessibilityLabel={`Format ${f.toUpperCase()}`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.formatLabel, active && { color: '#fff' }]}>{f.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: theme.primary }, creating && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={creating}
          accessibilityRole="button"
          accessibilityLabel="Lancer l'export"
        >
          {creating
            ? <ActivityIndicator size="small" color="#fff" />
            : (
              <>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Lancer l'export</Text>
              </>
            )}
        </TouchableOpacity>

        {/* Historique */}
        <Text style={styles.sectionTitle}>Mes exports</Text>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} />
        ) : exports.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucun export pour le moment.</Text>
          </View>
        ) : (
          exports.map((exp) => {
            const status = STATUS_LABELS[exp.status] ?? STATUS_LABELS.pending;
            const downloadable = exp.status === 'ready' && !!exp.fileUrl;
            return (
              <View key={exp.id} style={styles.exportCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportTitle}>
                    {TYPE_LABELS[exp.type] ?? exp.type} · {exp.format.toUpperCase()}
                  </Text>
                  <Text style={styles.exportMeta}>
                    {fmtDate(exp.createdAt)}
                    {exp.rowCount !== null ? ` · ${exp.rowCount} ligne${exp.rowCount > 1 ? 's' : ''}` : ''}
                  </Text>
                  {exp.status === 'ready' && exp.expiresAt && (
                    <Text style={styles.exportExpiry}>Lien valable jusqu'au {fmtDate(exp.expiresAt)}</Text>
                  )}
                  {exp.status === 'failed' && !!exp.error && (
                    <Text style={styles.exportError} numberOfLines={2}>{exp.error}</Text>
                  )}
                </View>
                <View style={styles.exportRight}>
                  <Text style={[styles.statusBadge, { color: status.color }]}>{status.label}</Text>
                  {downloadable && (
                    <TouchableOpacity
                      style={[styles.downloadBtn, { borderColor: theme.primary }]}
                      onPress={() => handleDownload(exp)}
                      accessibilityRole="button"
                      accessibilityLabel={`Télécharger l'export ${TYPE_LABELS[exp.type] ?? exp.type}`}
                    >
                      <Ionicons name="download-outline" size={16} color={theme.primary} />
                      <Text style={[styles.downloadLabel, { color: theme.primary }]}>Télécharger</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 18 },
  scroll: { padding: 16, paddingBottom: 48 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, backgroundColor: '#fff',
  },
  typeLabel: { fontSize: 13, color: '#374151', flexShrink: 1 },
  formatRow: { flexDirection: 'row', gap: 10 },
  formatBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff',
  },
  formatLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 14, marginTop: 18,
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  exportCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, padding: 14, marginBottom: 10,
    backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  exportTitle: { fontSize: 14.5, fontWeight: '700', color: '#111827' },
  exportMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  exportExpiry: { fontSize: 11.5, color: '#9CA3AF', marginTop: 2 },
  exportError: { fontSize: 11.5, color: '#DC2626', marginTop: 2 },
  exportRight: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { fontSize: 12, fontWeight: '700' },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  downloadLabel: { fontSize: 12.5, fontWeight: '700' },
});

export default ExportsScreen;
