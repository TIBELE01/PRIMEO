// ThreeViewer: renders a 3D scene using @react-three/fiber for virtual tours
import React, { Suspense } from 'react';
import { View, StyleSheet } from 'react-native';

interface ThreeViewerProps {
  modelUrl?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

export const ThreeViewer: React.FC<ThreeViewerProps> = ({ modelUrl, onLoadStart, onLoadEnd }) => {
  // Placeholder: actual Three.js canvas requires EAS build with react-three/fiber
  return <View style={styles.container} />;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
