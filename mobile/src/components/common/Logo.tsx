import React from 'react';
import { Image, StyleSheet } from 'react-native';

// Logo officiel Primeo (hébergé sur Cloudinary). Rendu CARRÉ 1:1 via la
// transformation `c_pad` (logo centré, fond transparent) → aucun étirement.
export const PRIMEO_LOGO_URL =
  'https://res.cloudinary.com/dlnnxvepd/image/upload/c_pad,b_transparent,w_240,h_240/v1782345787/Logo_Primeo_1_gzcjq2.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 56 : 40;
  return (
    <Image
      source={{ uri: PRIMEO_LOGO_URL }}
      resizeMode="contain"
      style={[styles.img, { width: dim, height: dim }]}
    />
  );
};

const styles = StyleSheet.create({
  img: {},
});
