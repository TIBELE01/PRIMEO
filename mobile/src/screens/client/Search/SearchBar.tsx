// SearchBar (Search screen): local search bar with debounced query
import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFilter: () => void;
  onSort: () => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText, onFilter, onSort, placeholder = 'Rechercher...' }) => (
  <View style={styles.container}>
    <View style={styles.inputRow}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} returnKeyType="search" />
    </View>
    <TouchableOpacity style={styles.iconBtn} onPress={onFilter}><Text>⚙️</Text></TouchableOpacity>
    <TouchableOpacity style={styles.iconBtn} onPress={onSort}><Text>↕️</Text></TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  inputRow: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 12, gap: 8 },
  searchIcon: { fontSize: 16 },
  input: { flex: 1, paddingVertical: 10, fontSize: 14 },
  iconBtn: { padding: 8, backgroundColor: '#f5f5f5', borderRadius: 10 },
});
