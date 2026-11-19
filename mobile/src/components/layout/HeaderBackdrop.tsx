import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HEADER_GRADIENT, HEADER_RADIUS } from '../../theme/header';

/**
 * Fond décoratif des en-têtes bleus : dégradé diagonal + halos lumineux discrets,
 * découpé aux coins bas arrondis. À placer en premier enfant d'un en-tête (position absolue).
 */
export function HeaderBackdrop({ radius = HEADER_RADIUS }: { radius?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, { borderBottomLeftRadius: radius, borderBottomRightRadius: radius }]}>
      <LinearGradient
        colors={HEADER_GRADIENT as unknown as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.halo, styles.haloTop]} />
      <View style={[styles.halo, styles.haloBottom]} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  halo: { position: 'absolute', borderRadius: 999, backgroundColor: '#FFFFFF' },
  haloTop: { width: 220, height: 220, top: -130, right: -60, opacity: 0.1 },
  haloBottom: { width: 140, height: 140, bottom: -90, left: -30, opacity: 0.07 },
});
