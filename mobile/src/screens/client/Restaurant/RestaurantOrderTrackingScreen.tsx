import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useTheme, type Theme } from '../../../theme/ThemeProvider';
import type { ClientScreenProps } from '../../../navigation/types';
import { foodOrdersApi, type FoodOrder, type FoodOrderStatus } from '../../../services/api/endpoints/foodOrdersApi';

type Props = ClientScreenProps<'RestaurantOrderTracking'>;

const STATUS_CONFIG: Record<FoodOrderStatus, { label: string; color: string; icon: string; desc: string }> = {
  pending:   { label: 'En attente',      color: '#F59E0B', icon: '⏳', desc: 'Votre commande est envoyée au restaurant' },
  confirmed: { label: 'Confirmée',        color: '#3B82F6', icon: '✅', desc: 'Le restaurant a accepté votre commande' },
  preparing: { label: 'En préparation',   color: '#8B5CF6', icon: '👨‍🍳', desc: 'Votre commande est en cours de préparation' },
  ready:     { label: 'Prête',            color: '#10B981', icon: '🎉', desc: 'Votre commande est prête !' },
  delivered: { label: 'Livrée',           color: '#6B7280', icon: '📦', desc: 'Commande livrée avec succès' },
  cancelled: { label: 'Annulée',          color: '#EF4444', icon: '❌', desc: 'Cette commande a été annulée' },
};

const STATUS_ORDER: FoodOrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

export default function RestaurantOrderTrackingScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [order, setOrder] = useState<FoodOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await foodOrdersApi.getById(orderId);
      setOrder(res.data.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la commande');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Poll every 20s for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (order && !['delivered', 'cancelled'].includes(order.status)) fetchOrder();
    }, 20000);
    return () => clearInterval(interval);
  }, [order, fetchOrder]);

  const handleCancel = () => {
    Alert.alert('Annuler la commande', 'Voulez-vous vraiment annuler cette commande ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler', style: 'destructive', onPress: async () => {
          setCancelling(true);
          try {
            const res = await foodOrdersApi.cancelOrder(orderId, 'Annulé par le client');
            setOrder(res.data.data);
          } catch (err: any) {
            Alert.alert('Erreur', err?.response?.data?.message ?? "Impossible d'annuler");
          } finally { setCancelling(false); }
        },
      },
    ]);
  };

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} /></SafeAreaView>;
  if (!order) return <SafeAreaView style={s.safe}><Text style={s.emptyText}>Commande introuvable</Text></SafeAreaView>;

  const config = STATUS_CONFIG[order.status];
  const currentIdx = STATUS_ORDER.indexOf(order.status);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={s.title}>Commande #{order.id.slice(-6).toUpperCase()}</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrder(true)} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Status banner */}
        <View style={[s.statusBanner, { backgroundColor: config.color + '18', borderColor: config.color }]}>
          <Text style={s.statusIcon}>{config.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.statusLabel, { color: config.color }]}>{config.label}</Text>
            <Text style={s.statusDesc}>{config.desc}</Text>
          </View>
        </View>

        {/* ETA */}
        {order.estimatedMinutes != null && order.status === 'preparing' && (
          <View style={s.etaBox}>
            <Text style={s.etaText}>⏱️ Temps estimé : ~{order.estimatedMinutes} min</Text>
          </View>
        )}

        {/* Progress steps */}
        {order.status !== 'cancelled' && (
          <View style={s.progressBox}>
            {STATUS_ORDER.map((st, idx) => {
              const stConfig = STATUS_CONFIG[st];
              const done = idx <= currentIdx;
              return (
                <View key={st} style={s.progressStep}>
                  <View style={[s.stepDot, done ? { backgroundColor: stConfig.color } : {}]}>
                    {done && <Text style={s.stepDotText}>✓</Text>}
                  </View>
                  {idx < STATUS_ORDER.length - 1 && (
                    <View style={[s.stepLine, done && idx < currentIdx ? { backgroundColor: config.color } : {}]} />
                  )}
                  <Text style={[s.stepLabel, done ? { color: stConfig.color, fontWeight: '700' } : {}]}>{stConfig.label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Order items */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Articles commandés</Text>
          {order.items.map(item => (
            <View key={item.id} style={s.itemRow}>
              <Text style={s.itemQty}>{item.quantity}×</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{item.menuItem.name}</Text>
                {item.notes ? <Text style={s.itemNotes}>{item.notes}</Text> : null}
              </View>
              <Text style={s.itemPrice}>{item.totalPrice.toLocaleString()} FCFA</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalAmount}>{order.totalAmount.toLocaleString()} FCFA</Text>
          </View>
        </View>

        {/* Instructions */}
        {order.specialInstructions ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Instructions</Text>
            <Text style={s.instructions}>{order.specialInstructions}</Text>
          </View>
        ) : null}

        {/* Cancel button */}
        {['pending', 'confirmed'].includes(order.status) && (
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} disabled={cancelling}>
            {cancelling
              ? <ActivityIndicator color="#EF4444" />
              : <Text style={s.cancelBtnText}>Annuler la commande</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe:         { flex: 1, backgroundColor: t.colors.background },
    header:       { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: t.colors.border },
    backBtn:      { marginRight: 12 },
    backText:     { fontSize: 16, color: t.colors.primary },
    title:        { fontSize: 17, fontWeight: '700', color: t.colors.text },
    emptyText:    { textAlign: 'center', marginTop: 40, color: t.colors.textSecondary },
    statusBanner: { margin: 16, borderRadius: 14, borderWidth: 1.5, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    statusIcon:   { fontSize: 32 },
    statusLabel:  { fontSize: 16, fontWeight: '700' },
    statusDesc:   { fontSize: 13, color: t.colors.textSecondary, marginTop: 2 },
    etaBox:       { marginHorizontal: 16, marginBottom: 8, backgroundColor: t.colors.surface, borderRadius: 10, padding: 12 },
    etaText:      { fontSize: 14, fontWeight: '600', color: t.colors.text, textAlign: 'center' },
    progressBox:  { margin: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    progressStep: { alignItems: 'center', flex: 1 },
    stepDot:      { width: 28, height: 28, borderRadius: 14, backgroundColor: t.colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    stepDotText:  { color: '#fff', fontWeight: '700', fontSize: 12 },
    stepLine:     { position: 'absolute', top: 13, left: '50%', right: '-50%', height: 2, backgroundColor: t.colors.border, zIndex: -1 },
    stepLabel:    { fontSize: 10, color: t.colors.textSecondary, textAlign: 'center' },
    section:      { margin: 16, backgroundColor: t.colors.surface, borderRadius: 14, padding: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: t.colors.textSecondary, textTransform: 'uppercase', marginBottom: 12 },
    itemRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.colors.border },
    itemQty:      { fontSize: 14, fontWeight: '700', color: t.colors.primary, minWidth: 28 },
    itemName:     { fontSize: 14, fontWeight: '600', color: t.colors.text },
    itemNotes:    { fontSize: 12, color: t.colors.textSecondary, fontStyle: 'italic' },
    itemPrice:    { fontSize: 13, fontWeight: '700', color: t.colors.text },
    totalRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12 },
    totalLabel:   { fontSize: 15, fontWeight: '700', color: t.colors.text },
    totalAmount:  { fontSize: 17, fontWeight: '800', color: t.colors.primary },
    instructions: { fontSize: 14, color: t.colors.textSecondary, lineHeight: 20 },
    cancelBtn:    { margin: 16, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 12, padding: 14, alignItems: 'center' },
    cancelBtnText:{ fontSize: 15, fontWeight: '600', color: '#EF4444' },
  });
}
