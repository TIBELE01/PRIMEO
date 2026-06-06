// Footer: bottom navigation bar with tab buttons
import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface FooterProps {
  children?: React.ReactNode;
}

export const Footer: React.FC<FooterProps> = ({ children }) => (
  <View style={styles.footer}>{children}</View>
);

const styles = StyleSheet.create({
  footer: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingBottom: 10, paddingHorizontal: 16 },
});
