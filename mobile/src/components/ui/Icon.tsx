// Icon: thin wrapper around @expo/vector-icons Ionicons
import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  /**
   * A11y : si l'icône porte un sens à elle seule (ex: bouton icône sans texte),
   * fournir un libellé. Par défaut l'icône est DÉCORATIVE et ignorée par le
   * lecteur d'écran (le texte/bouton adjacent porte déjà l'information).
   */
  accessibilityLabel?: string;
}

// Uses emoji fallback — replace with Ionicons from @expo/vector-icons in full build
export const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#1056E0', accessibilityLabel }) => (
  <Text
    style={{ fontSize: size, color }}
    accessibilityRole={accessibilityLabel ? 'image' : undefined}
    accessibilityLabel={accessibilityLabel}
    accessible={!!accessibilityLabel}
    // Décorative par défaut : masquée des lecteurs d'écran (iOS + Android)
    accessibilityElementsHidden={!accessibilityLabel}
    importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
  >
    {name}
  </Text>
);
