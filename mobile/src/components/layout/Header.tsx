import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HEADER_BG, HEADER_FG, HEADER_BUTTON_BG, HEADER_SHAPE } from '../../theme/header';
import { HeaderBackdrop } from './HeaderBackdrop';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: { label: string; onPress: () => void };
}

export function Header({ title, showBack = true, rightAction }: HeaderProps) {
  const navigation = useNavigation();
  return (
    <View style={styles.header}>
      <HeaderBackdrop />
      {showBack ? (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.side} />
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {rightAction ? (
        <TouchableOpacity onPress={rightAction.onPress} style={styles.side} activeOpacity={0.7}>
          <Text style={styles.rightTxt}>{rightAction.label}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.side} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { ...HEADER_SHAPE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10, },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: HEADER_BUTTON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  backArrow: { fontSize: 20, color: HEADER_FG, fontWeight: '700' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: HEADER_FG },
  side: { width: 56, paddingHorizontal: 8 },
  rightTxt: { color: HEADER_FG, fontWeight: '600', fontSize: 14, textAlign: 'right' },
});
