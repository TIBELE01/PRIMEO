import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useTheme, type Theme } from '../../../theme/ThemeProvider';
import type { ClientScreenProps } from '../../../navigation/types';
import { foodOrdersApi, type FoodOrder, type FoodOrderStatus } from '../../../services/api/endpoints/foodOrdersApi';

type Props = ClientScreenProps<'MyRestaurantOrders'>;

const STATUS_COLOR: Record<FoodOrderStatus, string> = {
  pending:   '#F59E0B',
  confirmed: '#3B82F6',
  preparing: '#8B5CF6',
  ready:     '#10B981',
  delivered: '#6B7280',
  cancelled: '#EF4444',
};

const STATUS_LABEL: Record<FoodOrderStatus, string> = {
  pending:   '⏳ En attente',
  confirmed: '✅ Confirmée',
  preparing: '👨‍🍳 En préparation',
  ready:     '🎉 Prête',
  delivered: '📦 Livrée',
  cancelled: '❌ Annulée',
};

export default function MyRestaurantOrdersScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await foodOrdersApi.getMyOrders();
      setOrders(res.data.data);
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const renderItem = ({ item }: { item: FoodOrder }) => {
    const color = STATUS_COLOR[item.status];
    const isActive = !['delivered', 'cancelled'].includes(item.status);
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate('RestaurantOrderTracking', { orderId: item.id })}
        activeOpacity={0.7}
      >
        <View style={s.cardHeader}>
          <Text style={s.orderRef}>#{item.id.slice(-6).toUpperCase()}</Text>
          <View style={[s.statusBadge, { backgroundColor: color + '20', borderColor: color }]}>
            <Text style={[s.statusText, { color }]}>{STATUS_LABEL[item.status]}</Text>
          </View>
        </View>
        {item.property && (
          <Text style={s.propertyName}>{item.property.title}</Text>
        )}
        <Text style={s.itemsSummary} numberOfLines={1}>
          {item.items.map(i => `${i.quantity}× ${i.menuItem.name}`).join(' · ')}
        </Text>
        <View style={s.cardFooter}>
          <Text style={s.amount}>{item.totalAmount.toLocaleString()} FCFA</Text>
          <Text style={s.date}>
            {new Date(item.orderedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {isActive && (
          <View style={[s.activePill, { backgroundColor: color }]}>
            <Text style={s.activePillText}>Commande en cours — appuyer pour suivre</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={s.title}>Mes commandes</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🍽️</Text>
            <Text style={s.emptyTitle}>Aucune commande</Text>
            <Text style={s.emptyDesc}>Vos commandes passées dans les restaurants apparaîtront ici.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe:           { flex: 1, backgroundColor: t.colors.background },
    header:         { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: t.colors.border },
    backBtn:        { marginRight: 12 },
    backText:       { fontSize: 16, color: t.colors.primary },
    title:          { fontSize: 17, fontWeight: '700', color: t.colors.text },
    card:           { backgroundColor: t.colors.surface, borderRadius: 14, marginBottom: 10, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    orderRef:       { fontSize: 15, fontWeight: '800', color: t.colors.text },
    statusBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    statusText:     { fontSize: 12, fontWeight: '700' },
    propertyName:   { fontSize: 13, fontWeight: '600', color: t.colors.textSecondary, marginBottom: 4 },
    itemsSummary:   { fontSize: 12, color: t.colors.textSecondary, marginBottom: 8 },
    cardFooter:     { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: t.colors.border, paddingTop: 8 },
    amount:         { fontSize: 15, fontWeight: '800', color: t.colors.primary },
    date:           { fontSize: 12, color: t.colors.textSecondary },
    activePill:     { marginTop: 10, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
    activePillText: { fontSize: 12, color: '#fff', fontWeight: '600' },
    empty:          { alignItems: 'center', paddingTop: 80 },
    emptyIcon:      { fontSize: 48, marginBottom: 12 },
    emptyTitle:     { fontSize: 18, fontWeight: '700', color: t.colors.text, marginBottom: 6 },
    emptyDesc:      { fontSize: 14, color: t.colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  });
}
