// SafeAreaWrapper: thin wrapper around SafeAreaView that applies theme background
import React from 'react';
import { SafeAreaView, StyleSheet, ViewStyle } from 'react-native';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
}

export const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({ children, style, backgroundColor = '#fff' }) => (
  <SafeAreaView style={[styles.container, { backgroundColor }, style]}>{children}</SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
});
