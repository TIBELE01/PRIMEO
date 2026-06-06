// Hotspot: interactive 3D hotspot overlaid on a virtual tour scene
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface HotspotProps {
  label: string;
  position: { x: number; y: number };
  onPress: () => void;
}

export const Hotspot: React.FC<HotspotProps> = ({ label, position, onPress }) => {
  return (
    <TouchableOpacity style={[styles.hotspot, { left: position.x, top: position.y }]} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  hotspot: { position: 'absolute', backgroundColor: 'rgba(27,94,32,0.8)', borderRadius: 20, padding: 8 },
  label: { color: '#fff', fontSize: 12 },
});
