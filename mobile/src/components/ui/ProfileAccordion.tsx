// ProfileAccordion — controlled collapsible section used by the client and
// professional profile screens. Unlike the PropertyDetail Accordion (which owns
// its open state), this one is *controlled*: the parent decides which section is
// open. That makes the "only one section open at a time" behaviour trivial — the
// parent keeps a single `openKey` and toggles it.
//
// Smooth open/close via LayoutAnimation. Use the `useSingleAccordion` hook below
// to wire the single-open behaviour with the animation already configured.
import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Single-open accordion state. `toggle(key)` opens the section, or closes it if
 * it is already open, animating the layout change. Pass the key of the section
 * that should be expanded on mount (or null for all-collapsed).
 */
export function useSingleAccordion(initial: string | null) {
  const [openKey, setOpenKey] = useState<string | null>(initial);
  const toggle = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setOpenKey((prev) => (prev === key ? null : key));
  }, []);
  return { openKey, toggle };
}

interface ProfileAccordionProps {
  title: string;
  icon: IoniconsName;
  color?: string;
  open: boolean;
  onToggle: () => void;
  danger?: boolean;
  subtitle?: string;
  children: React.ReactNode;
}

export function ProfileAccordion({
  title, icon, color = '#1056E0', open, onToggle, danger = false, subtitle, children,
}: ProfileAccordionProps) {
  const accent = danger ? '#DC2626' : color;
  return (
    <View style={[styles.wrap, open && styles.wrapOpen]}>
      <TouchableOpacity style={styles.header} onPress={onToggle} activeOpacity={0.7} accessibilityRole="button">
        <View style={[styles.iconBox, { backgroundColor: accent + '18' }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, danger && styles.titleDanger]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#9CA3AF" />
      </TouchableOpacity>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

/** Tappable action row (navigation / action) used inside accordion bodies. */
export function ProfileActionRow({
  icon, label, value, onPress, danger = false, color = '#1056E0', last = false,
}: {
  icon: IoniconsName;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  color?: string;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? '#FEF2F2' : color + '14' }]}>
        <Ionicons name={icon} size={16} color={danger ? '#DC2626' : color} />
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowDanger]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={15} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

/** Read-only information row used inside accordion bodies. */
export function ProfileInfoRow({
  icon, label, value, color = '#1056E0', last = false,
}: {
  icon: IoniconsName;
  label: string;
  value?: string | null;
  color?: string;
  last?: boolean;
}) {
  if (!value) return null;
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.rowIcon, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EEF0F3',
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  wrapOpen: { borderColor: '#E5E7EB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 14, gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  titleDanger: { color: '#DC2626' },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  body: { paddingBottom: 6 },

  // Rows
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F4F6FB' },
  rowIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 14.5, fontWeight: '500', color: '#111827' },
  rowValue: { fontSize: 13, color: '#94A3B8', marginRight: 4 },
  rowDanger: { color: '#DC2626' },

  // Info rows
  infoText: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  infoValue: { fontSize: 14.5, color: '#111827', fontWeight: '500' },
});
