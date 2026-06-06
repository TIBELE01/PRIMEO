// Reusable button — premium animated press-scale, brand shadows, modern variants
import React, { useRef } from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet,
  Animated, ViewStyle, TextStyle, Platform,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radii, brandShadows } from '../../theme/elevation';

interface ButtonProps {
  label?: string;
  title?: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'cta' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  label, title, onPress, variant = 'primary',
  isLoading, loading, disabled, style, textStyle,
}: ButtonProps) {
  const displayLabel = label ?? title ?? '';
  const isLoadingState = isLoading ?? loading ?? false;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const native = Platform.OS !== 'web';

  const pressIn = () => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 0.96, useNativeDriver: native, speed: 60, bounciness: 0 }),
      Animated.timing(opacity, { toValue: 0.88, useNativeDriver: native, duration: 60 }),
    ]).start();
  };
  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: native, speed: 40, bounciness: 4 }),
      Animated.timing(opacity, { toValue: 1, useNativeDriver: native, duration: 120 }),
    ]).start();
  };

  const hasShadow = (variant === 'primary' || variant === 'cta' || variant === 'secondary') && !disabled;

  return (
    <Animated.View
      style={[
        { transform: [{ scale }], opacity },
        hasShadow && brandShadows[variant as 'primary' | 'cta' | 'secondary'],
        style,
      ]}
    >
      <TouchableOpacity
        style={[styles.base, styles[variant], disabled && styles.disabled]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || isLoadingState}
        activeOpacity={1}
      >
        {isLoadingState ? (
          <ActivityIndicator
            color={variant === 'outline' || variant === 'ghost' ? colors.primary[600] : '#fff'}
            size="small"
          />
        ) : (
          <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles], textStyle]}>
            {displayLabel}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary:   { backgroundColor: colors.primary[600] },
  cta:       { backgroundColor: colors.cta[500] },
  secondary: { backgroundColor: colors.secondary[600] },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary[600],
  },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.48 },

  text:          { fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },
  primaryText:   { color: '#fff' },
  ctaText:       { color: '#fff' },
  secondaryText: { color: '#fff' },
  outlineText:   { color: colors.primary[600] },
  ghostText:     { color: colors.primary[600] },
});
