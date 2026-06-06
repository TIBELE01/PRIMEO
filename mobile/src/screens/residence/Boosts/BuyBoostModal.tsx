// BuyBoostModal: modal to purchase a property boost (2000 XOF/3 days)
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface BuyBoostModalProps {
  visible: boolean;
  propertyId: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const BuyBoostModal: React.FC<BuyBoostModalProps> = ({ visible, onConfirm, onClose }) => (
  <Modal transparent visible={visible} animationType="slide">
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Booster cette propriété</Text>
        <Text style={styles.desc}>2 000 XOF pour 3 jours de visibilité accrue</Text>
        <TouchableOpacity style={styles.confirm} onPress={onConfirm}><Text style={styles.confirmText}>Payer 2 000 XOF</Text></TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={onClose}><Text style={styles.cancelText}>Annuler</Text></TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#1056E0', marginBottom: 8 },
  desc: { fontSize: 14, color: '#555', marginBottom: 24 },
  confirm: { backgroundColor: '#1056E0', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancel: { padding: 12, alignItems: 'center' },
  cancelText: { color: '#999', fontSize: 14 },
});
