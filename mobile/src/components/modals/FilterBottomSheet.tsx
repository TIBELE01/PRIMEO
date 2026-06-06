// FilterBottomSheet: bottom sheet with search/filter controls
import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  children: React.ReactNode;
}

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({ visible, onClose, onApply, onReset, children }) => (
  <Modal transparent visible={visible} animationType="slide">
    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>Filtres</Text>
        <TouchableOpacity onPress={onReset}><Text style={styles.reset}>Réinitialiser</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>{children}</ScrollView>
      <TouchableOpacity style={styles.apply} onPress={onApply}><Text style={styles.applyText}>Appliquer</Text></TouchableOpacity>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 32 },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  reset: { color: '#B71C1C', fontSize: 14 },
  content: { paddingHorizontal: 16 },
  apply: { backgroundColor: '#1056E0', margin: 16, borderRadius: 12, padding: 14, alignItems: 'center' },
  applyText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
