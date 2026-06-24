// User avatar with image or initials fallback
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppImage } from './AppImage';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

export function Avatar({ uri, name, size = 44 }: AvatarProps) {
  // Garde défensif : name peut être vide / undefined
  const initials = (name ?? '')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
  const a11yLabel = name ? `Photo de profil de ${name}` : 'Photo de profil';
  if (uri) {
    return (
      <AppImage
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityRole="image"
        accessibilityLabel={a11yLabel}
        recyclingKey={uri}
      />
    );
  }
  return (
    <View
      style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
    >
      <Text style={[styles.initials, { fontSize: size * 0.35 }]} accessibilityElementsHidden importantForAccessibility="no">{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: '#1056E0', justifyContent: 'center', alignItems: 'center' },
  initials: { color: '#fff', fontWeight: '700' },
});
