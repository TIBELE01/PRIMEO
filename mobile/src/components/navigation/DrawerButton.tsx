// DrawerButton: hamburger button to open the navigation drawer
import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';

interface DrawerButtonProps {
  onPress: () => void;
  color?: string;
}

export const DrawerButton: React.FC<DrawerButtonProps> = ({ onPress, color = '#1056E0' }) => (
  <TouchableOpacity style={styles.btn} onPress={onPress}>
    {[0, 1, 2].map(i => <View key={i} style={[styles.line, { backgroundColor: color }]} />)}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: { padding: 8, gap: 5 },
  line: { width: 22, height: 2, borderRadius: 1 },
});
