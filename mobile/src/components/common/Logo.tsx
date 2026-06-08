import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 56 : 40;
  return <Image source={require('../../../assets/logo.png')} style={[styles.img, { width: dim, height: dim }]} />;
};

const styles = StyleSheet.create({
  img: { borderRadius: 8 },
});
