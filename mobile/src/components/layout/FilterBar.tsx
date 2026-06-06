// FilterBar: horizontal scrollable filter chip row for search/list screens
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Filter {
  key: string;
  label: string;
}

interface FilterBarProps {
  filters: Filter[];
  activeKey: string | null;
  onSelect: (key: string | null) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, activeKey, onSelect }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      <TouchableOpacity style={[styles.chip, !activeKey && styles.activeChip]} onPress={() => onSelect(null)}>
        <Text style={[styles.chipText, !activeKey && styles.activeText]}>Tous</Text>
      </TouchableOpacity>
      {filters.map(f => (
        <TouchableOpacity key={f.key} style={[styles.chip, activeKey === f.key && styles.activeChip]} onPress={() => onSelect(f.key)}>
          <Text style={[styles.chipText, activeKey === f.key && styles.activeText]}>{f.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff' },
  activeChip: { borderColor: '#1056E0', backgroundColor: '#1056E0' },
  chipText: { fontSize: 13, color: '#555' },
  activeText: { color: '#fff', fontWeight: '600' },
});
