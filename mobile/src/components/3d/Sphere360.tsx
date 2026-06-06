// Sphere360: 360° panoramic image viewer rendered on a Three.js sphere
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Sphere360Props {
  imageUri: string;
}

export const Sphere360: React.FC<Sphere360Props> = ({ imageUri }) => {
  return <View style={styles.container} />;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
});
