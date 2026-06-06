// SortBottomSheet: bottom sheet for selecting sort order
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SortOption { key: string; label: string }

interface SortBottomSheetProps {
  visible: boolean;
  options: SortOption[];
  activeKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

export const SortBottomSheet: React.FC<SortBottomSheetProps> = ({ visible, options, activeKey, onSelect, onClose }) => (
  <Modal transparent visible={visible} animationType="slide">
    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title}>Trier par</Text>
      {options.map(opt => (
        <TouchableOpacity key={opt.key} style={styles.option} onPress={() => { onSelect(opt.key); onClose(); }}>
          <Text style={[styles.optionText, activeKey === opt.key && styles.active]}>{opt.label}</Text>
          {activeKey === opt.key && <Text style={styles.check}>✓</Text>}
        </TouchableOpacity>
      ))}
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  title: { fontSize: 18, fontWeight: '700', padding: 16 },
  option: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  optionText: { fontSize: 15, color: '#333' },
  active: { color: '#1056E0', fontWeight: '700' },
  check: { color: '#1056E0', fontSize: 18, fontWeight: '700' },
});
