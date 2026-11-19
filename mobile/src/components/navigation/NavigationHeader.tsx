// NavigationHeader: custom header bar with title and optional left/right actions
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { HEADER_BG, HEADER_FG, HEADER_SHAPE } from '../../theme/header';
import { HeaderBackdrop } from '../layout/HeaderBackdrop';

interface NavigationHeaderProps {
  title: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({ title, leftAction, rightAction, style }) => (
  <View style={[styles.header, style]}>
    <HeaderBackdrop />
    <View style={styles.side}>{leftAction}</View>
    <Text style={styles.title} numberOfLines={1}>{title}</Text>
    <View style={styles.side}>{rightAction}</View>
  </View>
);

const styles = StyleSheet.create({
  header: { ...HEADER_SHAPE, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, },
  side: { width: 40, alignItems: 'center' },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: HEADER_FG, textAlign: 'center' },
});
