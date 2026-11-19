import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_BUTTON_BG, HEADER_FG, HEADER_SHAPE } from '../../theme/header';
import { HeaderBackdrop } from './HeaderBackdrop';

/** En-tête des écrans de navigation (pile) : même design que PageHeader + bouton retour. */
export function BrandStackHeader({ navigation, options, route, back }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const title = typeof options.title === 'string' ? options.title : route.name;
  const right = typeof options.headerRight === 'function' ? options.headerRight({ tintColor: HEADER_FG, canGoBack: !!back }) : null;
  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <HeaderBackdrop />
      {back ? (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
      ) : <View style={styles.side} />}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...HEADER_SHAPE, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 20 },
  side: { width: 40, alignItems: 'flex-end' },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: HEADER_BUTTON_BG, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: HEADER_FG, fontSize: 30, lineHeight: 32, fontWeight: '600', marginTop: -3 },
  title: { flex: 1, textAlign: 'center', color: HEADER_FG, fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
});
