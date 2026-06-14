import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, RefreshControl, Image, Alert, Share, TextInput, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClientScreenProps } from '../../../navigation/types';
import { favoritesApi } from '../../../services/api/endpoints/favorites';

interface FavoriteProperty {
  id: string;
  propertyId: string;
  property: {
    id: string;
    name: string;
    city: string;
    pricePerNight: number;
    coverImage?: string;
    type?: string;
  };
}

interface NamedList {
  id: string;
  name: string;
  propertyIds: string[];
}

const LISTS_KEY = '@primeo_favorite_lists';

type Props = ClientScreenProps<'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [lists, setLists] = useState<NamedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [addToListProperty, setAddToListProperty] = useState<string | null>(null);

  // ── Server-side list management ────────────────────────────────────────────

  const loadListsFromServer = async () => {
    try {
      const listsRes = await favoritesApi.listLists();
      const serverLists: Array<{ id: string; name: string }> = listsRes?.data?.data ?? listsRes?.data ?? [];
      // Fetch propertyIds for each list (needed for active-list filtering)
      const withItems: NamedList[] = await Promise.all(
        serverLists.map(async (l) => {
          try {
            const itemsRes = await favoritesApi.listItems(l.id);
            const items: Array<{ propertyId: string }> = itemsRes?.data?.data ?? itemsRes?.data ?? [];
            return { id: l.id, name: l.name, propertyIds: items.map((i) => i.propertyId) };
          } catch {
            return { id: l.id, name: l.name, propertyIds: [] };
          }
        }),
      );
      setLists(withItems);
    } catch { /* keep stale */ }
  };

  // Migration one-shot : si des listes existent en AsyncStorage, les pousser sur le serveur.
  const migrateLocalLists = async () => {
    try {
      const raw = await AsyncStorage.getItem(LISTS_KEY);
      if (!raw) return;
      const localLists: NamedList[] = JSON.parse(raw);
      if (!localLists.length) { await AsyncStorage.removeItem(LISTS_KEY); return; }

      for (const local of localLists) {
        try {
          const res = await favoritesApi.createList(local.name);
          const created = res?.data?.data ?? res?.data;
          if (created?.id && local.propertyIds.length > 0) {
            await favoritesApi.syncList(created.id, local.propertyIds);
          }
        } catch { /* ignorer les listes qui échouent */ }
      }
      await AsyncStorage.removeItem(LISTS_KEY);
      await loadListsFromServer();
    } catch { /* migration silencieuse */ }
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await favoritesApi.list();
      const data: FavoriteProperty[] = res?.data?.data ?? res?.data ?? [];
      setFavorites(data);
    } catch { /* keep stale */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Migration puis chargement depuis le serveur
    migrateLocalLists().then(() => loadListsFromServer());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const handleRemove = async (propertyId: string) => {
    Alert.alert(
      'Retirer des favoris',
      'Voulez-vous retirer cette propriété de vos favoris ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer', style: 'destructive', onPress: async () => {
            try {
              await favoritesApi.remove(propertyId);
              setFavorites(prev => prev.filter(f => f.property.id !== propertyId));
              // Mettre à jour l'état local (pas besoin de ré-appeler le serveur)
              setLists(prev => prev.map(l => ({ ...l, propertyIds: l.propertyIds.filter(id => id !== propertyId) })));
            } catch {
              Alert.alert('Erreur', 'Impossible de retirer le favori.');
            }
          },
        },
      ],
    );
  };

  const handleCreateList = async () => {
    const name = newListName.trim();
    if (!name) return;
    try {
      const res = await favoritesApi.createList(name);
      const created = res?.data?.data ?? res?.data;
      if (created?.id) {
        setLists(prev => [...prev, { id: created.id, name, propertyIds: [] }]);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de créer la liste.');
    }
    setNewListName('');
    setShowNewListModal(false);
  };

  const handleAddToList = async (listId: string) => {
    if (!addToListProperty) return;
    // Déduplication locale : ne pas ajouter si déjà présent
    const list = lists.find(l => l.id === listId);
    if (list?.propertyIds.includes(addToListProperty)) {
      setAddToListProperty(null);
      Alert.alert('Déjà dans la liste', 'Cette propriété est déjà dans cette liste.');
      return;
    }
    try {
      await favoritesApi.addItemToList(listId, addToListProperty);
      setLists(prev =>
        prev.map(l => l.id === listId ? { ...l, propertyIds: [...l.propertyIds, addToListProperty] } : l),
      );
      setAddToListProperty(null);
      Alert.alert('Ajouté', 'Propriété ajoutée à la liste.');
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ajouter à la liste.');
    }
  };

  const handleShareList = async (list: NamedList) => {
    const names = favorites
      .filter(f => list.propertyIds.includes(f.property.id))
      .map(f => `• ${f.property.name} (${f.property.city})`)
      .join('\n');
    await Share.share({
      title: `Ma liste "${list.name}" sur PRIMEO`,
      message: `Découvrez ma liste de logements "${list.name}" sur PRIMEO :\n\n${names}\n\nhttps://primeo.ci`,
    });
  };

  const activeList = lists.find(l => l.id === activeListId);
  const displayedFavorites = activeList
    ? favorites.filter(f => activeList.propertyIds.includes(f.property.id))
    : favorites;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><Text style={styles.title}>Favoris</Text></View>
        <View style={styles.centered}><ActivityIndicator size="large" color="#1056E0" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Favoris</Text>
        <Text style={styles.count}>{favorites.length} propriété{favorites.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Lists tabs */}
      <View style={styles.listsRow}>
        <TouchableOpacity
          style={[styles.listChip, !activeListId && styles.listChipActive]}
          onPress={() => setActiveListId(null)}
        >
          <Text style={[styles.listChipText, !activeListId && styles.listChipTextActive]}>Tous</Text>
        </TouchableOpacity>
        {lists.map(l => (
          <TouchableOpacity
            key={l.id}
            style={[styles.listChip, activeListId === l.id && styles.listChipActive]}
            onPress={() => setActiveListId(l.id === activeListId ? null : l.id)}
            onLongPress={() => handleShareList(l)}
          >
            <Text style={[styles.listChipText, activeListId === l.id && styles.listChipTextActive]}>
              {l.name}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.newListBtn} onPress={() => setShowNewListModal(true)}>
          <Text style={styles.newListBtnText}>+ Liste</Text>
        </TouchableOpacity>
      </View>

      {activeList && (
        <TouchableOpacity style={styles.shareListBtn} onPress={() => handleShareList(activeList)}>
          <Text style={styles.shareListText}>📤 Partager la liste "{activeList.name}"</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={displayedFavorites}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.cols}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#1056E0" />}
        contentContainerStyle={displayedFavorites.length === 0 && styles.emptyFlex}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Text style={styles.emptyIcon}>🏡</Text>
            <Text style={styles.emptyTitle}>
              {activeList ? `Aucune propriété dans "${activeList.name}"` : 'Aucun favori'}
            </Text>
            <Text style={styles.emptyMsg}>
              {activeList
                ? 'Appuyez longuement sur une propriété pour l\'ajouter à cette liste.'
                : 'Ajoutez des propriétés à vos favoris depuis la fiche détail.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.property.id })}
            onLongPress={() => setAddToListProperty(item.property.id)}
            activeOpacity={0.8}
          >
            {item.property.coverImage
              ? <Image source={{ uri: item.property.coverImage }} style={styles.cardImg} />
              : <View style={[styles.cardImg, styles.cardImgFallback]}><Text style={styles.cardImgIcon}>🏡</Text></View>
            }
            <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item.property.id)}>
              <Text style={styles.removeBtnText}>♥</Text>
            </TouchableOpacity>
            <View style={styles.cardBody}>
              <Text style={styles.cardName} numberOfLines={2}>{item.property.name}</Text>
              <Text style={styles.cardCity}>{item.property.city}</Text>
              <Text style={styles.cardPrice}>{item.property.pricePerNight?.toLocaleString()} FCFA/nuit</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* New list modal */}
      <Modal visible={showNewListModal} transparent animationType="slide" onRequestClose={() => setShowNewListModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nouvelle liste</Text>
            <TextInput
              style={styles.modalInput}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="Nom de la liste (ex: Vacances Abidjan)"
              autoFocus
              maxLength={40}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowNewListModal(false); setNewListName(''); }}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, !newListName.trim() && { opacity: 0.4 }]} onPress={handleCreateList} disabled={!newListName.trim()}>
                <Text style={styles.modalConfirmText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add to list modal */}
      <Modal visible={!!addToListProperty} transparent animationType="slide" onRequestClose={() => setAddToListProperty(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Ajouter à une liste</Text>
            {lists.length === 0
              ? <Text style={styles.noListsText}>Créez d'abord une liste via le bouton "+ Liste".</Text>
              : lists.map(l => (
                  <TouchableOpacity key={l.id} style={styles.listRow} onPress={() => handleAddToList(l.id)}>
                    <Text style={styles.listRowName}>{l.name}</Text>
                    {l.propertyIds.includes(addToListProperty!) && <Text style={styles.listRowCheck}>✓</Text>}
                  </TouchableOpacity>
                ))
            }
            <TouchableOpacity style={styles.modalCancel} onPress={() => setAddToListProperty(null)}>
              <Text style={styles.modalCancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  count: { fontSize: 14, color: '#9CA3AF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  listChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  listChipActive: { borderColor: '#1056E0', backgroundColor: '#F0FDF4' },
  listChipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  listChipTextActive: { color: '#1056E0' },
  newListBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#D67309', backgroundColor: '#FFFBEB' },
  newListBtnText: { fontSize: 13, color: '#D97706', fontWeight: '700' },
  shareListBtn: { marginHorizontal: 16, marginBottom: 8, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 8, alignItems: 'center' },
  shareListText: { fontSize: 13, color: '#1056E0', fontWeight: '600' },
  emptyFlex: { flex: 1 },
  emptyInner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyMsg: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  cols: { paddingHorizontal: 12, gap: 10 },
  card: { flex: 1, margin: 4, borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  cardImg: { width: '100%', height: 130 },
  cardImgFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  cardImgIcon: { fontSize: 36 },
  removeBtn: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: 16, color: '#EF4444' },
  cardBody: { padding: 10 },
  cardName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardCity: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  cardPrice: { fontSize: 13, fontWeight: '700', color: '#1056E0' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  modalCancelText: { fontWeight: '600', color: '#6B7280' },
  modalConfirm: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#1056E0', alignItems: 'center' },
  modalConfirmText: { fontWeight: '700', color: '#fff' },
  noListsText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  listRowName: { fontSize: 15, color: '#111827', fontWeight: '600' },
  listRowCheck: { fontSize: 16, color: '#1056E0', fontWeight: '700' },
});
