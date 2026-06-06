// BackButton: left-arrow button for navigation headers
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export const BackButton: React.FC<{ color?: string }> = ({ color = '#1056E0' }) => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
      <Text style={[styles.icon, { color }]}>←</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { padding: 8 },
  icon: { fontSize: 24 },
});
