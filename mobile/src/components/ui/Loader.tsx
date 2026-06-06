// Loader — full-screen spinner shown during auth state resolution
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export function Loader() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1056E0" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
