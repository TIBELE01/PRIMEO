// Logo: app logotype with PRIMEO wordmark
import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', color = '#1056E0' }) => {
  const fontSize = size === 'sm' ? 20 : size === 'lg' ? 40 : 30;
  return <Text style={[styles.text, { fontSize, color }]}>PRIMEO</Text>;
};

const styles = StyleSheet.create({
  text: { fontWeight: '800', letterSpacing: 3 },
});
