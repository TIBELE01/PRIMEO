// Divider: thin horizontal line for visual separation
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface DividerProps {
  color?: string;
  thickness?: number;
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({ color = '#eee', thickness = 1, style }) => (
  <View style={[styles.divider, { borderTopColor: color, borderTopWidth: thickness }, style]} />
);

const styles = StyleSheet.create({
  divider: { width: '100%', marginVertical: 8 },
});
