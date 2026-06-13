// Import iCal externe (Airbnb / Booking / autre).
//
// Le professionnel ajoute l'URL iCal publique de son calendrier externe ;
// Primeo la télécharge périodiquement (toutes les 6 h, cron côté serveur) et
// fusionne les dates bloquées (`external_blocked`) SANS jamais supprimer ses
// réservations internes ni ses blocages manuels. Un bouton « Synchroniser »
// permet aussi de forcer une mise à jour immédiate.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { availabilitiesApi } from '../../../services/api/endpoints/availabilities';

interface IcalFeed {
  id: string;
  url: string;
  source: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

const SOURCES: { key: string; label: string }[] = [
  { key: 'airbnb', label: 'Airbnb' },
  { key: 'booking', label: 'Booking' },
  { key: 'autre', label: 'Autre' },
];

export default function IcalFeedsScreen({ route, navigation }: any) {
  const { propertyId } = route.params ?? {};
  const [feeds, setFeeds] = useState<IcalFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [source, setSource] = useState('airbnb');

  const load = useCallback(async () => {
    if (!propertyId) { setLoading(false); return; }
    try {
      const res = await availabilitiesApi.listIcalFeeds(propertyId);
      const list: IcalFeed[] = res?.data?.data ?? res?.data ?? [];
      setFeeds(Array.isArray(list) ? list : []);
    } catch {
      setFeeds([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const trimmed = url.trim();
    if (!trimmed || adding) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      Alert.alert('URL invalide', 'L\'URL iCal doit commencer par http:// ou https://');
      return;
    }
    setAdding(true);
    try {
      await availabilitiesApi.addIcalFeed(propertyId, trimmed, source);
      setUrl('');
      await load();
      Alert.alert('Flux ajouté', 'Le calendrier a été importé et synchronisé.');
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible d\'ajouter ce flux iCal.');
    } finally {
      setAdding(false);
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await availabilitiesApi.syncIcalFeeds(propertyId);
      const r = res?.data?.data ?? res?.data ?? {};
      await load();
      Alert.alert(
        'Synchronisation terminée',
        `${r.blocked ?? 0} date(s) bloquée(s)` +
          (r.errors ? `\n${r.errors} flux en erreur` : ''),
      );
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Synchronisation impossible pour le moment.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = (feed: IcalFeed) => {
    Alert.alert('Supprimer ce flux ?', feed.url, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await availabilitiesApi.removeIcalFeed(propertyId, feed.id);
            await load();
          } catch {
            Alert.alert('Erreur', 'Suppression impossible pour le moment.');
          }
        },
      },
    ]);
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return 'Jamais synchronisé';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `Synchronisé le ${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const sourceLabel = (key: string) => SOURCES.find(s => s.key === key)?.label ?? 'Autre';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import iCal</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#1056E0" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <Text style={styles.intro}>
            Synchronisez votre calendrier Airbnb ou Booking pour bloquer
            automatiquement les dates déjà réservées ailleurs. Vos réservations
            Primeo ne sont jamais modifiées.
          </Text>

          {/* Formulaire d'ajout */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ajouter un calendrier</Text>
            <View style={styles.sourceRow}>
              {SOURCES.map(s => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.sourceChip, source === s.key && styles.sourceChipActive]}
                  onPress={() => setSource(s.key)}
                >
                  <Text style={[styles.sourceChipText, source === s.key && styles.sourceChipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="https://www.airbnb.com/calendar/ical/....ics"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.addBtn, (!url.trim() || adding) && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!url.trim() || adding}
            >
              {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Ajouter le flux</Text>}
            </TouchableOpacity>
          </View>

          {/* Liste des flux */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Flux configurés ({feeds.length})</Text>
            {feeds.length > 0 && (
              <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing}>
                {syncing
                  ? <ActivityIndicator color="#1056E0" size="small" />
                  : <Text style={styles.syncBtnText}>↻ Synchroniser</Text>}
              </TouchableOpacity>
            )}
          </View>

          {feeds.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyText}>Aucun calendrier importé pour le moment.</Text>
            </View>
          ) : (
            feeds.map(feed => (
              <View key={feed.id} style={styles.feedCard}>
                <View style={styles.feedTop}>
                  <View style={[styles.badge, badgeStyle(feed.source)]}>
                    <Text style={styles.badgeText}>{sourceLabel(feed.source)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(feed)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.feedUrl} numberOfLines={1}>{feed.url}</Text>
                <Text style={styles.feedSync}>{fmtDate(feed.lastSyncedAt)}</Text>
                {feed.lastError && (
                  <Text style={styles.feedError}>⚠ {feed.lastError}</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function badgeStyle(source: string) {
  switch (source) {
    case 'airbnb': return { backgroundColor: '#FFE4E6' };
    case 'booking': return { backgroundColor: '#DBEAFE' };
    default: return { backgroundColor: '#F3F4F6' };
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 8, width: 40 },
  backArrow: { fontSize: 22, color: '#1056E0', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  body: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#EEF0F3' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sourceRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sourceChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB' },
  sourceChipActive: { borderColor: '#1056E0', backgroundColor: '#EFF4FE' },
  sourceChipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  sourceChipTextActive: { color: '#1056E0' },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#111827', backgroundColor: '#FAFAFA', marginBottom: 12,
  },
  addBtn: { backgroundColor: '#1056E0', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  addBtnDisabled: { backgroundColor: '#9CB8EE' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  syncBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#1056E0' },
  syncBtnText: { color: '#1056E0', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  feedCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EEF0F3' },
  feedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  deleteBtnText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  feedUrl: { fontSize: 13, color: '#374151', marginBottom: 4 },
  feedSync: { fontSize: 12, color: '#9CA3AF' },
  feedError: { fontSize: 12, color: '#DC2626', marginTop: 4 },
});
