import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '../../../theme/ThemeProvider';
import type { ClientScreenProps } from '../../../navigation/types';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';
import { foodOrdersApi, type CartItem, type FoodOrderDeliveryType } from '../../../services/api/endpoints/foodOrdersApi';

type Props = ClientScreenProps<'RestaurantOrderCart'>;

const DELIVERY_LABELS: Record<FoodOrderDeliveryType, string> = {
  dine_in:  '🍽️ Sur place',
  takeaway: '🥡 À emporter',
  delivery: '🛵 Livraison',
};

export default function RestaurantOrderCartScreen({ navigation, route }: Props) {
  const { propertyId, propertyName } = route.params ?? ({} as Partial<Props['route']['params']>);
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [deliveryType, setDeliveryType] = useState<FoodOrderDeliveryType>('dine_in');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    restaurantApi.getMenuItems(propertyId)
      .then(res => setMenuItems((res.data as any).data ?? []))
      .catch(() => Alert.alert('Erreur', 'Impossible de charger le menu'))
      .finally(() => setLoading(false));
  }, [propertyId]);

  const sections = [...new Set(menuItems.map(i => i.section))];

  const getQty = (menuItemId: string) =>
    cart.find(c => c.menuItemId === menuItemId)?.quantity ?? 0;

  const changeQty = useCallback((item: any, delta: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (!existing) {
        if (delta < 1) return prev;
        return [...prev, {
          menuItemId: item.id, name: item.name, section: item.section,
          unitPrice: item.price, quantity: 1, photoUrl: item.photoUrl,
        }];
      }
      const newQty = existing.quantity + delta;
      if (newQty <= 0) return prev.filter(c => c.menuItemId !== item.id);
      return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: newQty } : c);
    });
  }, []);

  const total = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);

  const handleOrder = async () => {
    if (cart.length === 0) return Alert.alert('Panier vide', 'Ajoutez des articles avant de commander');
    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      return Alert.alert('Adresse requise', "Veuillez saisir l'adresse de livraison");
    }
    setSubmitting(true);
    try {
      const res = await foodOrdersApi.create({
        propertyId,
        items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
        deliveryType,
        deliveryAddress: deliveryAddress.trim() || undefined,
        specialInstructions: instructions.trim() || undefined,
      });
      const orderId = res.data?.data?.id;
      if (!orderId) {
        Alert.alert('Erreur', "La commande n'a pas pu être confirmée. Réessayez.");
        return;
      }
      Alert.alert('Commande passée !', 'Votre commande a été envoyée au restaurant.', [
        { text: 'Suivre ma commande', onPress: () => navigation.replace('RestaurantOrderTracking', { orderId }) },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Impossible de passer la commande');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={s.safe}><ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{propertyName}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
        {/* Delivery type selector */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Type de commande</Text>
          <View style={s.deliveryRow}>
            {(Object.keys(DELIVERY_LABELS) as FoodOrderDeliveryType[]).map(dt => (
              <TouchableOpacity
                key={dt}
                style={[s.deliveryBtn, deliveryType === dt && s.deliveryBtnActive]}
                onPress={() => setDeliveryType(dt)}
              >
                <Text style={[s.deliveryBtnText, deliveryType === dt && s.deliveryBtnTextActive]}>
                  {DELIVERY_LABELS[dt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {deliveryType === 'delivery' && (
            <TextInput
              style={[s.input, { marginTop: 8 }]}
              placeholder="Adresse de livraison"
              placeholderTextColor={theme.colors.textDisabled}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
            />
          )}
        </View>

        {/* Menu by section */}
        {menuItems.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🍽️</Text>
            <Text style={s.emptyTitle}>Menu non disponible</Text>
            <Text style={s.emptyDesc}>Ce restaurant n'a pas encore configuré son menu. Revenez plus tard ou contactez le restaurant directement.</Text>
          </View>
        ) : (
          sections.map(section => (
            <View key={section as string} style={s.section}>
              <Text style={s.sectionTitle}>{section as string}</Text>
              {menuItems.filter(i => i.section === section).map(item => {
                const qty = getQty(item.id);
                const unavailable = !item.isAvailable;
                return (
                  <View key={item.id} style={[s.menuItem, unavailable && s.menuItemUnavailable]}>
                    <View style={s.menuItemInfo}>
                      <View style={s.menuItemNameRow}>
                        <Text style={[s.menuItemName, unavailable && s.menuItemTextFaded]}>{item.name}</Text>
                        {unavailable && <Text style={s.unavailableBadge}>Indisponible</Text>}
                      </View>
                      {item.description ? <Text style={[s.menuItemDesc, unavailable && s.menuItemTextFaded]} numberOfLines={2}>{item.description}</Text> : null}
                      <Text style={[s.menuItemPrice, unavailable && s.menuItemTextFaded]}>{(item.price ?? 0).toLocaleString()} FCFA</Text>
                    </View>
                    {unavailable ? (
                      <View style={s.unavailableSlot} />
                    ) : (
                      <View style={s.qtyRow}>
                        <TouchableOpacity style={s.qtyBtn} onPress={() => changeQty(item, -1)}>
                          <Text style={s.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={s.qtyText}>{qty}</Text>
                        <TouchableOpacity style={s.qtyBtn} onPress={() => changeQty(item, 1)}>
                          <Text style={s.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))
        )}

        {/* Instructions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Instructions spéciales</Text>
          <TextInput
            style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Allergies, demandes particulières..."
            placeholderTextColor={theme.colors.textDisabled}
            multiline
            value={instructions}
            onChangeText={setInstructions}
          />
        </View>
      </ScrollView>

      {/* Bottom bar */}
      {cart.length > 0 && (
        <View style={s.bottomBar}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>{cart.reduce((s, c) => s + c.quantity, 0)} article(s)</Text>
            <Text style={s.totalAmount}>{(total ?? 0).toLocaleString()} FCFA</Text>
          </View>
          <TouchableOpacity style={s.orderBtn} onPress={handleOrder} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.orderBtnText}>Commander maintenant</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe:               { flex: 1, paddingTop: 16, backgroundColor: t.colors.background },
    header:             { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: t.colors.border },
    backBtn:            { marginRight: 12 },
    backText:           { fontSize: 16, color: t.colors.primary },
    title:              { flex: 1, fontSize: 17, fontWeight: '700', color: t.colors.text },
    section:            { marginTop: 12, paddingHorizontal: 16 },
    sectionTitle:       { fontSize: 13, fontWeight: '700', color: t.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    deliveryRow:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    deliveryBtn:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: t.colors.border },
    deliveryBtnActive:  { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    deliveryBtnText:    { fontSize: 13, fontWeight: '600', color: t.colors.textSecondary },
    deliveryBtnTextActive: { color: '#fff' },
    input:              { borderWidth: 1.5, borderColor: t.colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: t.colors.text, backgroundColor: t.colors.surface },
    emptyState:         { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
    emptyIcon:          { fontSize: 48, marginBottom: 12 },
    emptyTitle:         { fontSize: 16, fontWeight: '700', color: t.colors.text, marginBottom: 8, textAlign: 'center' },
    emptyDesc:          { fontSize: 13, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    menuItem:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.colors.border, gap: 12 },
    menuItemUnavailable: { opacity: 0.45 },
    menuItemInfo:       { flex: 1 },
    menuItemNameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    menuItemName:       { fontSize: 14, fontWeight: '600', color: t.colors.text },
    menuItemTextFaded:  { color: t.colors.textSecondary },
    unavailableBadge:   { fontSize: 10, fontWeight: '600', color: '#9CA3AF', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    unavailableSlot:    { width: 80 },
    menuItemDesc:       { fontSize: 12, color: t.colors.textSecondary, marginTop: 2 },
    menuItemPrice:      { fontSize: 13, fontWeight: '700', color: t.colors.primary, marginTop: 4 },
    qtyRow:             { flexDirection: 'row', alignItems: 'center', gap: 10 },
    qtyBtn:             { width: 30, height: 30, borderRadius: 15, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    qtyBtnText:         { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
    qtyText:            { fontSize: 16, fontWeight: '700', color: t.colors.text, minWidth: 20, textAlign: 'center' },
    bottomBar:          { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: t.colors.surface, padding: 16, borderTopWidth: 1, borderTopColor: t.colors.border, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
    totalRow:           { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    totalLabel:         { fontSize: 14, color: t.colors.textSecondary },
    totalAmount:        { fontSize: 18, fontWeight: '800', color: t.colors.text },
    orderBtn:           { backgroundColor: t.colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    orderBtnText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
