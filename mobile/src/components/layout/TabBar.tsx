// TabBar: custom bottom tab bar component
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Tab {
  key: string;
  label: string;
  icon: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeKey: string;
  onPress: (key: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeKey, onPress }) => {
  return (
    <View style={styles.container}>
      {tabs.map(tab => (
        <TouchableOpacity key={tab.key} style={styles.tab} onPress={() => onPress(tab.key)}>
          <Text style={styles.icon}>{tab.icon}</Text>
          <Text style={[styles.label, activeKey === tab.key && styles.active]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingBottom: 8, paddingTop: 4 },
  tab: { flex: 1, alignItems: 'center', paddingTop: 6 },
  icon: { fontSize: 22, marginBottom: 2 },
  label: { fontSize: 10, color: '#999' },
  active: { color: '#1056E0', fontWeight: '700' },
});
