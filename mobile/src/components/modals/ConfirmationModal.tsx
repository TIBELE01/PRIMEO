// ConfirmationModal: yes/no dialog for destructive actions
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ visible, title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', onConfirm, onCancel, destructive }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>{cancelLabel}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.confirm, destructive && styles.destructive]} onPress={onConfirm}><Text style={styles.confirmText}>{confirmLabel}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#1056E0' },
  message: { fontSize: 14, color: '#555', marginBottom: 20, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 12 },
  cancel: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, alignItems: 'center' },
  cancelText: { color: '#555', fontWeight: '600' },
  confirm: { flex: 1, backgroundColor: '#1056E0', borderRadius: 10, padding: 12, alignItems: 'center' },
  destructive: { backgroundColor: '#B71C1C' },
  confirmText: { color: '#fff', fontWeight: '700' },
});
