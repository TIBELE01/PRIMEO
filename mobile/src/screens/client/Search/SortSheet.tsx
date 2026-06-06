// SortSheet: bottom sheet for search result sort order
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';

const SORT_OPTIONS: { key: string; label: string }[] = [
  { key: 'rating', label: 'Mieux notés' },
  { key: 'price_asc', label: 'Prix croissant' },
  { key: 'price_desc', label: 'Prix décroissant' },
  { key: 'newest', label: 'Nouveautés' },
  { key: 'distance', label: 'Distance' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  selected: string;
  onSelect: (key: string) => void;
}

export function SortSheet({ visible, onClose, selected, onSelect }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Fermer</Text></TouchableOpacity>
          <Text style={styles.title}>Trier par</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.body}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.option, selected === opt.key && styles.optionActive]}
              onPress={() => onSelect(opt.key)}
            >
              <Text style={[styles.optionText, selected === opt.key && styles.optionTextActive]}>
                {opt.label}
              </Text>
              {selected === opt.key && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  cancel: { fontSize: 15, color: '#6B7280', width: 60 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  body: { padding: 16, gap: 4 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12 },
  optionActive: { backgroundColor: '#F0FDF4' },
  optionText: { fontSize: 15, color: '#374151' },
  optionTextActive: { color: '#1056E0', fontWeight: '700' },
  check: { fontSize: 16, color: '#1056E0', fontWeight: '700' },
});
