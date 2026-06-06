// Accordion — reusable collapsible section used across the property detail sheet.
// Smooth height animation via LayoutAnimation; themed accent bar on the left of
// the header. `defaultOpen` controls the initial expanded state.
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  title: string;
  icon?: string;
  color?: string;
  defaultOpen?: boolean;
  subtitle?: string;
  children: React.ReactNode;
}

export function Accordion({ title, icon, color = '#1056E0', defaultOpen = false, subtitle, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
    setOpen(o => !o);
  }, []);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
        <View style={[styles.accent, { backgroundColor: color }]} />
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {icon ? `${icon}  ` : ''}{title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.chevronWrap, open && { backgroundColor: color }]}>
          <Text style={[styles.chevron, open && { color: '#fff', transform: [{ rotate: '180deg' }] }]}>⌄</Text>
        </View>
      </TouchableOpacity>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#EEF0F3' },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingRight: 14 },
  accent: { width: 4, alignSelf: 'stretch', borderTopRightRadius: 4, borderBottomRightRadius: 4, marginRight: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 15.5, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  chevronWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  chevron: { fontSize: 16, color: '#6B7280', lineHeight: 18, marginTop: -2 },
  body: { paddingBottom: 4 },
});
