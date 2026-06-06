import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useTheme, type Theme } from '../../../theme/ThemeProvider';
import { foodOrdersApi, type FoodOrder, type FoodOrderStatus } from '../../../services/api/endpoints/foodOrdersApi';
import { propertiesApi } from '../../../services/api/endpoints/properties';

const STATUS_COLOR: Record<string, string> = {
  pending:   '#F59E0B',
  confirmed: '#3B82F6',
  preparing: '#8B5CF6',
  ready:     '#10B981',
  delivered: '#6B7280',
  cancelled: '#EF4444',
};

const STATUS_LABEL: Record<string, string> = {
  pending:   '⏳ En attente',
  confirmed: '✅ Confirmée',
  preparing: '👨‍🍳 En préparation',
  ready:     '🎉 Prête',
  delivered: '📦 Livrée',
  cancelled: '❌ Annulée',
};

const DELIVERY_LABEL: Record<string, string> = {
  dine_in:  '🍽️ Sur place',
  takeaway: '🥡 À emporter',
  delivery: '🛵 Livraison',
};

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: '',          label: 'Toutes' },
  { key: 'pending',   label: 'En attente' },
  { key: 'confirmed', label: 'Confirmées' },
  { key: 'preparing', label: 'En préparation' },
  { key: 'ready',     label: 'Prêtes' },
  { key: 'delivered', label: 'Livrées' },
];

const NEXT_STATUS: Record<string, { status: FoodOrderStatus; label: string }> = {
  pending:   { status: 'confirmed', label: 'Confirmer' },
  confirmed: { status: 'preparing', label: 'Démarrer préparation' },
  preparing: { status: 'ready',     label: 'Marquer prête' },
  ready:     { status: 'delivered', label: 'Marquer livrée' },
};

export default function FoodOrdersScreen() {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [orders, setOrders]         = useState<FoodOrder[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  // Resolve propertyId once from the authenticated user's first property
  useEffect(() => {
    propertiesApi.getMyListings()
      .then(res => {
        const listings: any[] = res.data?.data ?? res.data ?? [];
        if (listings.length > 0) setPropertyId(listings[0].id as string);
      })
      .catch(() => null);
  }, []);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (!propertyId) return;
    if (isRefresh) setRefreshing(true);
    try {
      const res = await foodOrdersApi.getRestaurantOrders(
        propertyId,
        filter ? { status: filter as FoodOrderStatus } : undefined,
      );
      setOrders(res.data.data);
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId, filter]);

  useEffect(() => {
    if (propertyId) fetchOrders();
  }, [fetchOrders, propertyId]);

  // Refresh every 30s for new orders
  useEffect(() => {
    const interval = setInterval(() => { if (propertyId) fetchOrders(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders, propertyId]);

  const advance = async (order: FoodOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdatingId(order.id);
    try {
      await foodOrdersApi.updateStatus(order.id, next.status);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next.status } : o));
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Impossible de mettre à jour');
    } finally { setUpdatingId(null); }
  };

  const cancelOrder = (orderId: string) => {
    Alert.alert('Refuser la commande', 'Voulez-vous refuser cette commande ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Refuser', style: 'destructive', onPress: async () => {
          setUpdatingId(orderId);
          try {
            await foodOrdersApi.updateStatus(orderId, 'cancelled');
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
          } catch (err: any) {
            Alert.alert('Erreur', err?.response?.data?.message ?? "Impossible d'annuler");
          } finally { setUpdatingId(null); }
        },
      },
    ]);
  };

  const renderOrder = ({ item }: { item: FoodOrder }) => {
    const color = STATUS_COLOR[item.status] ?? '#6B7280';
    const next = NEXT_STATUS[item.status];
    const isUpdating = updatingId === item.id;
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.orderRef}>#{item.id.slice(-6).toUpperCase()}</Text>
          <View style={[s.statusBadge, { backgroundColor: color + '20', borderColor: color }]}>
            <Text style={[s.statusText, { color }]}>{STATUS_LABEL[item.status]}</Text>
          </View>
        </View>
        <View style={s.clientRow}>
          <Text style={s.clientName}>{item.client?.firstName} {item.client?.lastName}</Text>
          <Text style={s.deliveryType}>{DELIVERY_LABEL[item.deliveryType]}</Text>
        </View>
        <View style={s.itemsRow}>
          <Text style={s.itemsText}>
            {item.items.map(i => `${i.quantity}× ${i.menuItem.name}`).join(' · ')}
          </Text>
        </View>
        <View style={s.cardFooter}>
          <Text style={s.amount}>{item.totalAmount.toLocaleString()} FCFA</Text>
          <Text style={s.time}>{new Date(item.orderedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        {/* Action buttons */}
        {!['delivered', 'cancelled'].includes(item.status) && (
          <View style={s.actionsRow}>
            {next && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: color }]}
                onPress={() => advance(item)}
                disabled={isUpdating}
              >
                {isUpdating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.actionBtnText}>{next.label}</Text>}
              </TouchableOpacity>
            )}
            {['pending', 'confirmed'].includes(item.status) && (
              <TouchableOpacity style={s.refuseBtn} onPress={() => cancelOrder(item.id)} disabled={isUpdating}>
                <Text style={s.refuseBtnText}>Refuser</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading && !propertyId) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🍽️</Text>
          <Text style={s.emptyTitle}>Aucune propriété trouvée</Text>
          <Text style={s.emptyDesc}>Veuillez d'abord créer un établissement restaurant.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return <SafeAreaView style={s.safe}><ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Filter tabs */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={i => i.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.filterBtn, filter === item.key && s.filterBtnActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[s.filterBtnText, filter === item.key && s.filterBtnTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        renderItem={renderOrder}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🍽️</Text>
            <Text style={s.emptyTitle}>Aucune commande</Text>
            <Text style={s.emptyDesc}>Les nouvelles commandes apparaîtront ici en temps réel.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe:                { flex: 1, backgroundColor: t.colors.background },
    filterRow:           { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    filterBtn:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border },
    filterBtnActive:     { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    filterBtnText:       { fontSize: 13, fontWeight: '600', color: t.colors.textSecondary },
    filterBtnTextActive: { color: '#fff' },
    card:                { backgroundColor: t.colors.surface, borderRadius: 14, marginBottom: 10, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    orderRef:            { fontSize: 15, fontWeight: '800', color: t.colors.text },
    statusBadge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    statusText:          { fontSize: 12, fontWeight: '700' },
    clientRow:           { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    clientName:          { fontSize: 13, fontWeight: '600', color: t.colors.text },
    deliveryType:        { fontSize: 12, color: t.colors.textSecondary },
    itemsRow:            { marginBottom: 8 },
    itemsText:           { fontSize: 12, color: t.colors.textSecondary, lineHeight: 18 },
    cardFooter:          { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: t.colors.border, paddingTop: 8, marginTop: 4 },
    amount:              { fontSize: 15, fontWeight: '800', color: t.colors.primary },
    time:                { fontSize: 12, color: t.colors.textSecondary },
    actionsRow:          { flexDirection: 'row', gap: 10, marginTop: 10 },
    actionBtn:           { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    actionBtnText:       { color: '#fff', fontSize: 13, fontWeight: '700' },
    refuseBtn:           { paddingHorizontal: 16, borderRadius: 10, paddingVertical: 10, borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center' },
    refuseBtnText:       { fontSize: 13, fontWeight: '600', color: '#EF4444' },
    empty:               { alignItems: 'center', paddingTop: 80 },
    emptyIcon:           { fontSize: 48, marginBottom: 12 },
    emptyTitle:          { fontSize: 18, fontWeight: '700', color: t.colors.text, marginBottom: 6 },
    emptyDesc:           { fontSize: 14, color: t.colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  });
}
