// TabButton: single tab bar item with icon and label
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

interface TabButtonProps {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
  badgeCount?: number;
}

export const TabButton: React.FC<TabButtonProps> = ({ label, icon, active, onPress, badgeCount }) => (
  <TouchableOpacity style={styles.btn} onPress={onPress}>
    <View>
      <Text style={[styles.icon, active && styles.activeIcon]}>{icon}</Text>
      {!!badgeCount && <View style={styles.badge}><Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text></View>}
    </View>
    <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  icon: { fontSize: 22, color: '#999', textAlign: 'center' },
  activeIcon: { color: '#1056E0' },
  label: { fontSize: 10, color: '#999', marginTop: 2 },
  activeLabel: { color: '#1056E0', fontWeight: '700' },
  badge: { position: 'absolute', top: -4, right: -8, backgroundColor: '#B71C1C', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
