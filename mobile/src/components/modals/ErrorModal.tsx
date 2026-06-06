// ErrorModal: displays API or app errors in a modal dialog
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorModalProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ visible, title = 'Erreur', message, onClose }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <Text style={styles.icon}>❌</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity style={styles.btn} onPress={onClose}><Text style={styles.btnText}>Fermer</Text></TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', alignItems: 'center' },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#B71C1C', marginBottom: 8 },
  message: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#B71C1C', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
});
