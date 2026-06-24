// AppImage — wrapper expo-image partagé pour toutes les images distantes.
//
// Avantages vs <Image> de react-native :
//   • cache mémoire + disque (cachePolicy) → plus de re-téléchargements
//   • décodage WebP/AVIF natif → images plus légères
//   • placeholder blurhash + transition en fondu → perception de rapidité
//   • lazy par défaut (expo-image ne charge que ce qui est monté/visible)
//
// API alignée sur react-native pour faciliter la migration : on accepte aussi
// bien `source="https://…"` qu'`source={{ uri }}` ou `source={require(...)}`.
import React from 'react';
import { Image, type ImageProps, type ImageContentFit } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

// Placeholder neutre (dégradé gris clair) affiché pendant le chargement.
const BLURHASH = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

export interface AppImageProps extends Omit<ImageProps, 'style' | 'contentFit'> {
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Clé de recyclage pour les listes (réutilise le conteneur d'image au scroll). */
  recyclingKey?: string;
}

export function AppImage({
  style,
  contentFit = 'cover',
  transition = 200,
  ...props
}: AppImageProps) {
  return (
    <Image
      style={style}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      placeholder={BLURHASH}
      placeholderContentFit="cover"
      {...props}
    />
  );
}

export default AppImage;
