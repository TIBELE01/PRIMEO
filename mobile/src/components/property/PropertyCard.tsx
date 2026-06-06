import React, { useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { BoostBadge } from '../boost/BoostBadge';
import { useCurrency } from '../../hooks/useCurrency';
import { num } from '../../utils/normalizeProperty';

interface PropertyCardProps {
  property: { id: string; title: string; city: string; pricePerNight: number; mainImageUrl?: string; rating?: number; reviewCount?: number; isBoosted?: boolean; boostExpiresAt?: string; badgeType?: 'verified' | 'premium' };
  onPress: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onPress, onFavorite, isFavorite }) => {
  const { formatPrice } = useCurrency();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, speed: 50, bounciness: 2, useNativeDriver: Platform.OS !== 'web' }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 2, useNativeDriver: Platform.OS !== 'web' }).start();

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <View style={styles.imgBox}>
          {property.mainImageUrl ? (
            <Image source={{ uri: property.mainImageUrl }} style={styles.img} />
          ) : (
            <View style={[styles.img, styles.imgFallback]} />
          )}

          <View style={styles.grad1} />
          <View style={styles.grad2} />
          <View style={styles.grad3} />
          <View style={styles.grad4} />

          {property.isBoosted && property.boostExpiresAt && (
            <View style={styles.boostWrap}>
              <BoostBadge expiresAt={property.boostExpiresAt} />
            </View>
          )}

          {property.badgeType === 'premium' && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>★ Premium</Text>
            </View>
          )}
          {property.badgeType === 'verified' && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓ Vérifié</Text>
            </View>
          )}

          {onFavorite && (
            <TouchableOpacity style={styles.favBtn} onPress={onFavorite} activeOpacity={0.8}>
              <Text style={styles.favIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.row}>
            <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
            {property.rating != null && (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingTxt}>{num(property.rating).toFixed(1)}</Text>
                {property.reviewCount != null && (
                  <Text style={styles.reviewTxt}>({num(property.reviewCount)})</Text>
                )}
              </View>
            )}
          </View>
          <Text style={styles.city} numberOfLines={1}>📍 {property.city}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(property.pricePerNight)}</Text>
            <Text style={styles.perNight}>/nuit</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  imgBox: { height: 200, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  imgFallback: { backgroundColor: '#CBD5E1' },
  grad1: { position: 'absolute', bottom: 90, left: 0, right: 0, height: 30, backgroundColor: 'rgba(0,0,0,0.06)' },
  grad2: { position: 'absolute', bottom: 60, left: 0, right: 0, height: 30, backgroundColor: 'rgba(0,0,0,0.14)' },
  grad3: { position: 'absolute', bottom: 30, left: 0, right: 0, height: 30, backgroundColor: 'rgba(0,0,0,0.24)' },
  grad4: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, backgroundColor: 'rgba(0,0,0,0.38)' },
  boostWrap: { position: 'absolute', top: 12, left: 12 },
  premiumBadge: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: '#7C3AED', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  premiumBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  verifiedBadge: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: '#1056E0', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  verifiedBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  favBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  favIcon: { fontSize: 20 },
  info: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0F1729', marginRight: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingStar: { fontSize: 12, color: '#F59E0B' },
  ratingTxt: { fontSize: 13, fontWeight: '700', color: '#0F1729' },
  reviewTxt: { fontSize: 11, color: '#94A3B8' },
  city: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  price: { fontSize: 16, fontWeight: '800', color: '#1056E0' },
  perNight: { fontSize: 12, color: '#94A3B8' },
});
