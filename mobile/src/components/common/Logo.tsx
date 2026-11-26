import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

// Logo officiel Primeo (Cloudinary, PNG transparent). `e_trim` retire les marges,
// `c_fit` conserve les proportions ; 480 px couvre les écrans haute densité.
export const PRIMEO_LOGO_URL =
  'https://res.cloudinary.com/dlnnxvepd/image/upload/e_trim/c_fit,w_480,h_480,f_png/v1795644228/primeo_logo_z7suoi.png';

/** Ratio largeur / hauteur du logo (jamais déformé). */
export const PRIMEO_LOGO_RATIO = 1949 / 1636;

interface LogoTileProps {
  /** Côté de la tuile blanche (px). Le logo occupe ~72 % de la largeur. */
  size?: number;
  radius?: number;
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Logo dans une tuile blanche : règle d'affichage Primeo — le logo n'est jamais posé
 * directement sur un fond coloré ou sombre (thèmes bleu et sombre, barres, pieds de page).
 */
export const LogoTile: React.FC<LogoTileProps> = ({ size = 48, radius, shadow = false, style }) => {
  const w = Math.round(size * 0.72);
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: radius ?? Math.round(size * 0.24) },
        shadow && styles.shadow,
        style,
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Logo Primeo"
    >
      <Image source={{ uri: PRIMEO_LOGO_URL }} resizeMode="contain" style={{ width: w, height: Math.round(w / PRIMEO_LOGO_RATIO) }} />
    </View>
  );
};

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

/** Logo compact (tuile blanche) en trois tailles. */
export const Logo: React.FC<LogoProps> = ({ size = 'md' }) => (
  <LogoTile size={size === 'sm' ? 28 : size === 'lg' ? 56 : 40} />
);

const styles = StyleSheet.create({
  tile: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shadow: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
});
