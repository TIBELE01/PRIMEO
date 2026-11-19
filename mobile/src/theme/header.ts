// En-tête des pages : bleu Primeo, titre et icônes en blanc — source unique pour toute l'application
// (en-têtes natifs de la navigation, PageHeader et en-têtes propres à certains écrans).
export const HEADER_BG = '#0055FF';
export const HEADER_FG = '#FFFFFF';
/** Fond translucide des boutons ronds posés sur l'en-tête bleu (retour, actions) */
export const HEADER_BUTTON_BG = 'rgba(255,255,255,0.18)';
/** Texte secondaire (sous-titre) sur l'en-tête bleu */
export const HEADER_SUBTLE = 'rgba(255,255,255,0.82)';
/** Dégradé de l'en-tête (diagonale bleu profond → bleu lumineux) */
export const HEADER_GRADIENT = ['#0047D9', '#0055FF', '#3B82FF'] as const;
/** Arrondi des coins bas de l'en-tête */
export const HEADER_RADIUS = 28;

/** Forme commune des en-têtes : coins bas arrondis + ombre bleutée */
export const HEADER_SHAPE = {
  backgroundColor: HEADER_BG,
  borderBottomLeftRadius: HEADER_RADIUS,
  borderBottomRightRadius: HEADER_RADIUS,
  borderBottomWidth: 0,
  shadowColor: '#0B3BB0',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.28,
  shadowRadius: 16,
  elevation: 10,
  zIndex: 10,
} as const;
