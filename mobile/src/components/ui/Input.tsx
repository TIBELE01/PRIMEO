// Text input — animated focus glow, modern premium style, error feedback
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  TextInputProps, Animated, Platform,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radii } from '../../theme/elevation';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
  hint?: string;
}

export function Input({ label, error, isPassword, hint, style, onFocus, onBlur, accessibilityLabel, ...props }: InputProps) {
  const [showPwd, setShowPwd] = useState(false);
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    onFocus?.(e);
  };
  const handleBlur = (e: any) => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    onBlur?.(e);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? colors.status.error : colors.neutral[300], error ? colors.status.error : colors.primary[600]],
  });
  const bgColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.neutral[50], error ? colors.status.errorLight : colors.primary[50]],
  });

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, focused && styles.labelFocused, error ? styles.labelError : null]}>
          {label}
        </Text>
      )}
      <Animated.View style={[styles.container, { borderColor, backgroundColor: bgColor }]}>
        <TextInput
          style={[styles.input, style]}
          secureTextEntry={isPassword && !showPwd}
          placeholderTextColor={colors.neutral[400]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={accessibilityLabel ?? label}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPwd(v => !v)}
            activeOpacity={0.7}
            style={styles.toggleBtn}
            accessibilityRole="button"
            accessibilityLabel={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            <Text style={styles.toggle}>{showPwd ? 'Masquer' : 'Voir'}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:       { marginBottom: 18 },
  label:         { fontSize: 13, fontWeight: '600', color: colors.neutral[700], marginBottom: 8, letterSpacing: 0.1 },
  labelFocused:  { color: colors.primary[600] },
  labelError:    { color: colors.status.error },
  container: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: radii.md,
    paddingHorizontal: 16, minHeight: 52,
  },
  input:         { flex: 1, fontSize: 15, color: colors.neutral[900], paddingVertical: 14 },
  toggleBtn:     { paddingLeft: 10, paddingVertical: 4 },
  toggle:        { color: colors.primary[600], fontWeight: '700', fontSize: 13 },
  error:         { color: colors.status.error, fontSize: 12, marginTop: 6, fontWeight: '500' },
  hint:          { color: colors.neutral[500], fontSize: 12, marginTop: 6 },
});
