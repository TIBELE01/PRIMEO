// AmenityIcon: icon + label chip for a single amenity
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AmenityIconProps {
  icon: string;
  label: string;
}

export const AmenityIcon: React.FC<AmenityIconProps> = ({ icon, label }) => (
  <View style={styles.chip}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF5FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  icon: { fontSize: 16 },
  label: { fontSize: 13, color: '#1056E0' },
});
