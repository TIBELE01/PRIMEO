import React, { useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import type { Property } from '@/types/property';
import { num } from '@/utils/normalizeProperty';
import { useCurrency } from '../../../hooks/useCurrency';

const DAYS_NEW = 30;
const isNewProp = (createdAt: string) =>
  (Date.now() - new Date(createdAt).getTime()) / 86_400_000 < DAYS_NEW;

interface Props {
  property: Property;
  onPress: () => void;
  style?: object;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

export function PropertyCard({ property, onPress, style, onFavorite, isFavorite = false }: Props) {
  const images = property.images ?? [];
  const mainImage = images.find(i => i.isPrimary)?.url ?? images[0]?.url;
  const showNew = isNewProp(property.createdAt);
  const { formatPrice } = useCurrency();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, speed: 50, bounciness: 2, useNativeDriver: Platform.OS !== 'web' }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 2, useNativeDriver: Platform.OS !== 'web' }).start();

  const price = property.pricePerNight != null
    ? formatPrice(property.pricePerNight)
    : property.priceForSale != null
    ? formatPrice(property.priceForSale)
    : null;

  const priceLabel = property.pricePerNight != null ? `${price} / nuit` : price;

  return (
    <Animated.View style={[styles.card, style, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>

        {/* ── Image section ── */}
        <View style={styles.imgWrap}>
          {mainImage ? (
            <Image source={{ uri: mainImage }} style={styles.img} resizeMode="cover" />
          ) : (
            <View style={[styles.img, styles.imgFallback]} />
          )}

          {/* 4-layer simulated gradient — bottom to mid */}
          <View style={styles.grad1} />
          <View style={styles.grad2} />
          <View style={styles.grad3} />
          <View style={styles.grad4} />

          {/* Badge pills — top left */}
          <View style={styles.badges}>
            {property.isBoosted && (
              <View style={[styles.badge, styles.bBoosted]}>
                <Text style={styles.badgeTxt}>⚡ Boosté</Text>
              </View>
            )}
            {property.virtualTour?.available && (
              <View style={[styles.badge, styles.b3D]}>
                <Text style={styles.badgeTxt}>🔭 3D</Text>
              </View>
            )}
            {(property.isSuperHost || property.owner?.isSuperHost) && (
              <View style={[styles.badge, styles.bHost]}>
                <Text style={styles.badgeTxt}>⭐ Super Hôte</Text>
              </View>
            )}
            {showNew && !property.isBoosted && (
              <View style={[styles.badge, styles.bNew]}>
                <Text style={styles.badgeTxt}>✨ Nouveau</Text>
              </View>
            )}
          </View>

          {/* Rating pill — top right */}
          <View style={styles.ratingPill}>
            <Text style={styles.ratingPillStar}>★</Text>
            <Text style={styles.ratingPillTxt}>{num(property.rating).toFixed(1)}</Text>
          </View>

          {/* Price overlay — bottom left */}
          {priceLabel && (
            <View style={styles.priceWrap}>
              <Text style={styles.priceOnImg}>{priceLabel}</Text>
            </View>
          )}
        </View>

        {/* ── Info section ── */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{property.name}</Text>
          <Text style={styles.location} numberOfLines={1}>📍 {property.city}</Text>
          {num(property.reviewCount) > 0 && (
            <Text style={styles.reviews}>{num(property.reviewCount)} avis</Text>
          )}
        </View>

      </TouchableOpacity>
      {/* Bouton favori — en dehors du TouchableOpacity pour ne pas déclencher onPress */}
      {onFavorite && (
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={onFavorite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Text style={[styles.heartIcon, isFavorite && styles.heartIconActive]}>
            {isFavorite ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /* ── Card shell ── */
  card: {
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },

  /* ── Image area ── */
  imgWrap: {
    height: 200,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  imgFallback: {
    backgroundColor: '#CBD5E1',
  },

  /* ── Gradient layers (bottom → top, progressively lighter) ── */
  grad1: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  grad2: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.26)',
  },
  grad3: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  grad4: {
    position: 'absolute',
    bottom: 95,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },

  /* ── Badge pills — top left ── */
  badges: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  badgeTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  bBoosted: { backgroundColor: 'rgba(245,158,11,0.90)' },
  b3D:      { backgroundColor: 'rgba(99,102,241,0.90)' },
  bHost:    { backgroundColor: 'rgba(214,115,9,0.90)' },
  bNew:     { backgroundColor: 'rgba(34,197,94,0.90)' },

  /* ── Rating pill — top right ── */
  ratingPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingPillStar: {
    fontSize: 11,
    color: '#F59E0B',
    lineHeight: 16,
  },
  ratingPillTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F1729',
    lineHeight: 16,
  },

  /* ── Price overlay — bottom left ── */
  priceWrap: {
    position: 'absolute',
    bottom: 12,
    left: 14,
  },
  priceOnImg: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  /* ── Info section below image ── */
  info: {
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 14,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F1729',
    marginBottom: 3,
    letterSpacing: 0.1,
  },
  location: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 3,
    fontWeight: '500',
  },
  reviews: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* ── Bouton favori (cœur) — positionné en bas-droit de l'image ── */
  heartBtn: {
    position: 'absolute',
    top: 156,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  heartIcon:       { fontSize: 18, color: '#9CA3AF' },
  heartIconActive: { color: '#EF4444' },
});
