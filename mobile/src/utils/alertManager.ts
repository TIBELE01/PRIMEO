// Gestionnaire d'alertes global — permet d'afficher des modales stylées et
// cohérentes (web + natif) à la place des dialogues système. Un hôte unique
// (`AlertHost`) monté à la racine s'abonne via `registerAlertListener` ; tous
// les appels `Alert.alert(...)` de l'application sont redirigés ici par le
// polyfill, sans avoir à modifier chaque écran.

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AlertButton {
  text?: string;
  onPress?: (value?: string) => void;
  style?: AlertButtonStyle;
}

export interface AlertConfig {
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  /** Ton visuel de la modale — déduit automatiquement si absent. */
  tone?: 'info' | 'success' | 'error' | 'warning';
  /** Si vrai, affiche un champ de saisie ; la valeur est passée à onPress. */
  prompt?: boolean;
  promptPlaceholder?: string;
  promptDefaultValue?: string;
}

type Listener = (cfg: AlertConfig) => void;

let listener: Listener | null = null;

export function registerAlertListener(fn: Listener | null): void {
  listener = fn;
}

// Déduit le ton à partir du titre/message quand il n'est pas fourni explicitement.
function inferTone(cfg: AlertConfig): AlertConfig['tone'] {
  if (cfg.tone) return cfg.tone;
  const haystack = `${cfg.title ?? ''} ${cfg.message ?? ''}`.toLowerCase();
  if (/(erreur|échec|impossible|invalide|refus)/.test(haystack)) return 'error';
  if (/(succès|réussi|confirmé|enregistré|envoyé|validé|bravo|merci)/.test(haystack)) return 'success';
  if (/(attention|supprimer|annuler|irréversible|êtes-vous)/.test(haystack)) return 'warning';
  return 'info';
}

export function showStyledAlert(cfg: AlertConfig): void {
  const enriched: AlertConfig = { ...cfg, tone: inferTone(cfg) };
  if (listener) {
    listener(enriched);
  } else if (typeof window !== 'undefined') {
    // Filet de sécurité si l'hôte n'est pas encore monté.
    window.alert([cfg.title, cfg.message].filter(Boolean).join('\n\n'));
    cfg.buttons?.find((b) => b.style !== 'cancel')?.onPress?.();
  }
}
