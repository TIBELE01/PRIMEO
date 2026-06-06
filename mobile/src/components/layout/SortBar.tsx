// SortBar: sort order selector row
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface SortOption {
  key: string;
  label: string;
}

interface SortBarProps {
  options: SortOption[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export const SortBar: React.FC<SortBarProps> = ({ options, activeKey, onSelect }) => {
  return (
    <View style={styles.container}>
      {options.map(opt => (
        <TouchableOpacity key={opt.key} style={[styles.btn, activeKey === opt.key && styles.active]} onPress={() => onSelect(opt.key)}>
          <Text style={[styles.text, activeKey === opt.key && styles.activeText]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingVertical: 6 },
  btn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  active: { borderColor: '#D67309', backgroundColor: '#FFF8E1' },
  text: { fontSize: 12, color: '#666' },
  activeText: { color: '#D67309', fontWeight: '600' },
});
