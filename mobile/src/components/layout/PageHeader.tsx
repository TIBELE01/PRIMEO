import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HEADER_BG, HEADER_FG } from '../../theme/header';

interface PageHeaderProps {
  title: string;
  /** Élément optionnel aligné à droite (bouton d'action, etc.). */
  right?: React.ReactNode;
}

/**
 * En-tête uniforme de l'application.
 * — Fond bleu Primeo, titre blanc
 * — Ombre portée marquée pour se détacher du contenu
 * — Titre centré, en gras
 * — Espace confortable en haut (le parent gère l'encoche via SafeAreaView)
 */
export function PageHeader({ title, right }: PageHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: HEADER_BG,
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HEADER_BG,
    // Ombre portée forte (iOS + Android)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: HEADER_FG,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  right: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
