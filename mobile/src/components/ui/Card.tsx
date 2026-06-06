// Base card container — premium layered shadow, clean border
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/elevation';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'flat';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return (
    <View style={[styles.base, variant === 'elevated' && styles.elevated, variant === 'flat' && styles.flat, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.neutral[0],
    borderRadius: radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    ...shadows.md,
  },
  elevated: {
    ...shadows.lg,
    borderColor: 'transparent',
  },
  flat: {
    shadowColor: 'transparent',
    elevation: 0,
    borderColor: colors.neutral[200],
  },
});
