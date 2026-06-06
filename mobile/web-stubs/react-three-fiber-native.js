import React from 'react';
import { View, Text } from 'react-native';
export const Canvas = ({ style }) =>
  React.createElement(View, { style: [{ backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', minHeight: 200 }, style] },
    React.createElement(Text, { style: { color: '#aaa', fontSize: 14 } }, 'Visite 3D non disponible sur web')
  );
export const useFrame = () => {};
export const useThree = () => ({});
export const useLoader = () => null;
