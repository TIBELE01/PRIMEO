import React from 'react';
import { Image, StyleSheet } from 'react-native';

// Logo officiel Primeo (hébergé sur Cloudinary). Format horizontal (677×369).
export const PRIMEO_LOGO_URL =
  'https://res.cloudinary.com/dlnnxvepd/image/upload/v1782345787/Logo_Primeo_1_gzcjq2.png';
const LOGO_ASPECT = 677 / 369;

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  const height = size === 'sm' ? 28 : size === 'lg' ? 56 : 40;
  return (
    <Image
      source={{ uri: PRIMEO_LOGO_URL }}
      resizeMode="contain"
      style={[styles.img, { height, width: height * LOGO_ASPECT }]}
    />
  );
};

const styles = StyleSheet.create({
  img: {},
});
