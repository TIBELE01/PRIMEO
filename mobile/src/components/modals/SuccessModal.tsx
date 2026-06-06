// SuccessModal: success confirmation overlay with animation
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ visible, title = 'Succès', message, onClose, actionLabel, onAction }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <Text style={styles.icon}>✅</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.row}>
          {onAction && actionLabel && (
            <TouchableOpacity style={styles.action} onPress={onAction}><Text style={styles.actionText}>{actionLabel}</Text></TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btn} onPress={onClose}><Text style={styles.btnText}>OK</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', alignItems: 'center' },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#1056E0', marginBottom: 8 },
  message: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12 },
  btn: { backgroundColor: '#1056E0', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
  action: { borderWidth: 1, borderColor: '#1056E0', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  actionText: { color: '#1056E0', fontWeight: '600' },
});
