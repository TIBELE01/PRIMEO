// Selectable chip for filters and tags
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, selected, onPress, style }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected ? styles.selected : null, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
    >
      <Text style={[styles.text, selected ? styles.selectedText : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1.5, borderColor: '#D3DAE6', marginRight: 8, backgroundColor: '#fff' },
  selected: { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  text: { fontSize: 13, color: '#475569', fontWeight: '500' },
  selectedText: { color: '#fff', fontWeight: '700' },
});
