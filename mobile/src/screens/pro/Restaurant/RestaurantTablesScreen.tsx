import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Switch, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';
import { PageHeader } from '../../../components/layout/PageHeader';

const PRIMARY = '#DC2626';

interface RestaurantTable {
  id: string;
  name: string;
  seats: number;
  location: string | null;
  isActive: boolean;
}

export default function RestaurantTablesScreen() {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reservationEnabled, setReservationEnabled] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [name, setName] = useState('');
  const [seats, setSeats] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Résout le restaurant + son paramètre de réservation via /api/restaurant
      // (repli getMyListings). Un échec réseau ne vaut pas « aucune table ».
      let pid = '';
      try {
        const r = await restaurantApi.getMyRestaurant();
        const resto: any = r.data?.data ?? r.data;
        pid = resto?.id ?? '';
        setReservationEnabled(!!resto?.tableReservationEnabled);
      } catch {
        const propRes = await propertiesApi.getMyListings();
        const listings: any[] = propRes.data?.data ?? propRes.data ?? [];
        pid = listings[0]?.id ?? '';
      }
      setPropertyId(pid || null);
      setLoadFailed(false);
      if (!pid) { setTables([]); setLoading(false); return; }
      const res = await restaurantApi.getTables(pid);
      setTables(res.data?.data ?? res.data ?? []);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleReservation = async (value: boolean) => {
    setReservationEnabled(value); // optimiste
    try {
      await restaurantApi.updateMyRestaurant({ tableReservationEnabled: value });
    } catch {
      setReservationEnabled(!value); // revert
      Alert.alert('Erreur', 'Impossible de mettre à jour le paramètre.');
    }
  };

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null); setName(''); setSeats(''); setLocation(''); setModalVisible(true);
  };
  const openEdit = (t: RestaurantTable) => {
    setEditing(t); setName(t.name); setSeats(String(t.seats)); setLocation(t.location ?? ''); setModalVisible(true);
  };

  const handleSave = async () => {
    if (!propertyId) return;
    const seatsNum = parseInt(seats, 10);
    if (!name.trim()) { Alert.alert('Champ requis', 'Indiquez le nom de la table.'); return; }
    if (isNaN(seatsNum) || seatsNum < 1) { Alert.alert('Couverts', 'Le nombre de couverts doit être au moins 1.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await restaurantApi.updateTable(propertyId, editing.id, { name: name.trim(), seats: seatsNum, location: location.trim() });
      } else {
        await restaurantApi.createTable(propertyId, { name: name.trim(), seats: seatsNum, location: location.trim() || undefined });
      }
      setModalVisible(false);
      await load();
    } catch {
      Alert.alert('Erreur', "Impossible d'enregistrer la table.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t: RestaurantTable) => {
    if (!propertyId) return;
    const next = !t.isActive;
    setTables((prev) => prev.map((x) => x.id === t.id ? { ...x, isActive: next } : x));
    try {
      await restaurantApi.updateTable(propertyId, t.id, { isActive: next });
    } catch {
      setTables((prev) => prev.map((x) => x.id === t.id ? { ...x, isActive: t.isActive } : x));
      Alert.alert('Erreur', 'Impossible de mettre à jour la table.');
    }
  };

  const handleDelete = (t: RestaurantTable) => {
    if (!propertyId) return;
    Alert.alert('Supprimer la table', `Supprimer « ${t.name} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try { await restaurantApi.deleteTable(propertyId, t.id); setTables((p) => p.filter((x) => x.id !== t.id)); }
          catch { Alert.alert('Erreur', 'Suppression impossible.'); }
        },
      },
    ]);
  };

  const totalSeats = tables.filter((t) => t.isActive).reduce((s, t) => s + t.seats, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Tables" />
        <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
      </SafeAreaView>
    );
  }

  if (loadFailed) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Tables" />
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={44} color={PRIMARY} />
          <Text style={styles.emptyText}>Impossible de charger les tables. Réessayez.</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => load()}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageHeader title="Tables" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Configuration : activer la réservation de tables (désactivée par défaut) */}
        <View style={styles.configCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.configTitle}>Activer la réservation de tables</Text>
            <Text style={styles.configSub}>
              Si activé, les clients peuvent réserver une table depuis votre fiche. Sinon, seul « Commander » est proposé.
            </Text>
          </View>
          <Switch value={reservationEnabled} onValueChange={handleToggleReservation} trackColor={{ true: PRIMARY }} />
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>{tables.length} table{tables.length > 1 ? 's' : ''}</Text>
          <Text style={styles.summaryText}>{totalSeats} couverts actifs</Text>
        </View>

        {tables.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name="grid-outline" size={44} color="#9CA3AF" />
            <Text style={styles.emptyText}>Aucune table. Ajoutez vos tables et leur nombre de couverts.</Text>
          </View>
        )}

        {tables.map((t) => (
          <View key={t.id} style={[styles.card, !t.isActive && styles.cardInactive]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t.name}</Text>
              <Text style={styles.cardSub}>
                {t.seats} couvert{t.seats > 1 ? 's' : ''}{t.location ? ` · ${t.location}` : ''}
              </Text>
            </View>
            <Switch value={t.isActive} onValueChange={() => handleToggleActive(t)} trackColor={{ true: PRIMARY }} />
            <TouchableOpacity onPress={() => openEdit(t)} style={styles.iconBtn} accessibilityLabel="Modifier">
              <Ionicons name="create-outline" size={22} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(t)} style={styles.iconBtn} accessibilityLabel="Supprimer">
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Ajouter une table</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Modifier la table' : 'Nouvelle table'}</Text>
            <Text style={styles.label}>Nom</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex : Table 1, Terrasse 3" />
            <Text style={styles.label}>Nombre de couverts</Text>
            <TextInput style={styles.input} value={seats} onChangeText={setSeats} keyboardType="number-pad" placeholder="Ex : 4" />
            <Text style={styles.label}>Emplacement (optionnel)</Text>
            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Ex : Intérieur, Terrasse, Étage" />
            <View style={styles.modalRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  content: { padding: 16, paddingBottom: 40 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  summaryText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  configCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  configTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  configSub: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 16 },
  emptyText: { color: '#6B7280', textAlign: 'center', fontSize: 15 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  cardInactive: { opacity: 0.55 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  iconBtn: { padding: 6 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 6 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginTop: 4 },
  modalRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  saveBtn: { backgroundColor: PRIMARY },
  cancelText: { color: '#374151', fontWeight: '700' },
  saveText: { color: '#fff', fontWeight: '700' },
});
