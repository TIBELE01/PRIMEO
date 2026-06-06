// Icon: thin wrapper around @expo/vector-icons Ionicons
import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

// Uses emoji fallback — replace with Ionicons from @expo/vector-icons in full build
export const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#1056E0' }) => (
  <Text style={{ fontSize: size, color }}>{name}</Text>
);
