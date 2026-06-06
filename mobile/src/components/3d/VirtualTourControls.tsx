// VirtualTourControls: gyroscope + touch controls overlay for 3D virtual tours
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface VirtualTourControlsProps {
  onClose: () => void;
  onToggleGyro: () => void;
  isGyroActive: boolean;
}

export const VirtualTourControls: React.FC<VirtualTourControlsProps> = ({ onClose, onToggleGyro, isGyroActive }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.btn} onPress={onClose}><Text style={styles.txt}>✕</Text></TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onToggleGyro}>
        <Text style={styles.txt}>{isGyroActive ? 'Gyro ON' : 'Gyro OFF'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 40, right: 16, gap: 8 },
  btn: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 10 },
  txt: { color: '#fff', fontSize: 13 },
});
