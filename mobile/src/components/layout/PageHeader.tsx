import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PageHeaderProps {
  title: string;
  /** Élément optionnel aligné à droite (bouton d'action, etc.). */
  right?: React.ReactNode;
}

/**
 * En-tête uniforme de l'application.
 * — Fond gris doux et professionnel
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
    backgroundColor: '#808080',
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E2E6',
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
    color: '#111111',
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
