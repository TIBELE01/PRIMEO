// En-tête des pages : bleu Primeo, titre et icônes en blanc — source unique pour toute l'application
// (en-têtes natifs de la navigation, PageHeader et en-têtes propres à certains écrans).
export const HEADER_BG = '#0055FF';
export const HEADER_FG = '#FFFFFF';
/** Fond translucide des boutons ronds posés sur l'en-tête bleu (retour, actions) */
export const HEADER_BUTTON_BG = 'rgba(255,255,255,0.18)';
/** Texte secondaire (sous-titre) sur l'en-tête bleu */
export const HEADER_SUBTLE = 'rgba(255,255,255,0.82)';

/** Options des en-têtes natifs (react-navigation) */
export const NATIVE_HEADER_OPTIONS = {
  headerStyle: { backgroundColor: HEADER_BG },
  headerTintColor: HEADER_FG,
  headerTitleAlign: 'center' as const,
  headerTitleStyle: { fontWeight: '800' as const, fontSize: 20, color: HEADER_FG },
  headerShadowVisible: true,
};
