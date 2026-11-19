import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HEADER_FG, HEADER_SHAPE, HEADER_SUBTLE } from '../../theme/header';
import { HeaderBackdrop } from './HeaderBackdrop';

interface PageHeaderProps {
  title: string;
  /** Sous-titre facultatif affiché sous le titre */
  subtitle?: string;
  /** Élément optionnel aligné à droite (bouton d'action, etc.). */
  right?: React.ReactNode;
  /** Élément optionnel aligné à gauche (bouton retour, etc.). */
  left?: React.ReactNode;
  /** true : coins bas droits (quand un bloc bleu prolonge l'en-tête, ex. carte de profil) */
  flat?: boolean;
}

/**
 * En-tête uniforme de l'application.
 * — Dégradé bleu Primeo avec halos lumineux discrets
 * — Coins bas arrondis et ombre bleutée
 * — Titre centré, blanc, en gras (+ sous-titre facultatif)
 */
export function PageHeader({ title, subtitle, right, left, flat }: PageHeaderProps) {
  return (
    <View style={[styles.container, flat && styles.flat]}>
      <HeaderBackdrop radius={flat ? 0 : undefined} />
      {left ? <View style={styles.left}>{left}</View> : null}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...HEADER_SHAPE,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 56,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  flat: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, shadowOpacity: 0, elevation: 0, marginBottom: 0 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: HEADER_FG,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subtitle: { marginTop: 4, fontSize: 13, fontWeight: '500', color: HEADER_SUBTLE, textAlign: 'center' },
  left: { position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' },
  right: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
});
