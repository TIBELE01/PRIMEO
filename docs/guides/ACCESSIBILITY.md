# Accessibilité — Application mobile Primeo

Référentiel cible : **WCAG 2.1 niveau AA**.
- Texte normal (< 18px / < 14px gras) : contraste **≥ 4,5:1**
- Grand texte (≥ 18px ou ≥ 14px gras) : contraste **≥ 3:1**
- Éléments interactifs : rôle + libellé annoncés par les lecteurs d'écran (VoiceOver / TalkBack)

## 1. Attributs d'accessibilité

Les composants partagés portent désormais les attributs a11y, ce qui les propage à tous les écrans :

| Composant | Attributs ajoutés |
|---|---|
| `Button` | `accessibilityRole="button"`, label (texte du bouton), `accessibilityHint`, `accessibilityState` (disabled/busy) |
| `Input` | `accessibilityLabel` (libellé du champ), toggle mot de passe roled + labellé |
| `Chip` | role button + `state.selected` + label |
| `RatingStars` | affichage : « Note X sur 5 » (étoiles masquées) ; interactif : boutons « Noter N étoiles » |
| `Avatar` | role image + « Photo de profil de … » (initiales masquées) |
| `LanguageSelector` | role button + `state.selected` |
| `ImageUploader` | boutons ajouter/supprimer roled + labellés |
| `FullscreenImageViewer` | compteur, bouton fermer, images labellées |

Écrans prioritaires traités directement : Login, Search, Conversations, Settings, Legal.

## 2. Contraste des couleurs (analyse + corrections)

Ratios calculés selon la formule WCAG (luminance relative).

### Thème clair (texte sur fond)
| Couleur | Sur | Ratio | Verdict |
|---|---|---|---|
| text `#0F1729` | surface `#FFFFFF` | ~17:1 | ✅ |
| textSecondary `#475569` | `#FFFFFF` | ~7.5:1 | ✅ |
| primary `#1056E0` | `#FFFFFF` | ~5.0:1 | ✅ |
| tabBarInactive `#64748B` | `#FFFFFF` | ~4.7:1 | ✅ |
| textDisabled `#9AA6B8` | `#FFFFFF` | ~2.3:1 | ⚠️ exempté (texte désactivé/placeholder — hors champ WCAG) |

### Thème sombre
| Couleur | Sur | Ratio | Verdict |
|---|---|---|---|
| text `#F8FAFC` | surface `#1E293B` | ~14:1 | ✅ |
| textSecondary `#9AA6B8` | `#1E293B` | ~5.6:1 | ✅ |
| ~~tabBarInactive `#64748B`~~ | `#1E293B` | ~2.8:1 | ❌ **corrigé** → `#9AA6B8` (~5.6:1) ✅ |

### Thème bleu
| Couleur | Sur | Ratio | Verdict |
|---|---|---|---|
| text `#0D1B4B` | background `#F0F4FF` | ~14.5:1 | ✅ |
| textSecondary `#37474F` | `#F0F4FF` | ~8.1:1 | ✅ |
| ~~tabBarInactive `#78909C`~~ | `#FFFFFF` | ~3.4:1 | ❌ **corrigé** → `#64748B` (~4.7:1) ✅ |

### Corrections appliquées
- `theme/themes/dark.ts` : `tabBarInactive` `neutral[500]` (#64748B) → `neutral[400]` (#9AA6B8).
- `theme/themes/blue.ts` : `tabBarInactive` `#78909C` → `#64748B`.
- `SettingsScreen` : titres de section `#999` → `#6B7280` (4.6:1).

> **Texte désactivé / placeholder** (`textDisabled`) : volontairement atténué pour
> signaler l'état inactif. Exempté par WCAG (§1.4.3). Non modifié pour préserver
> la sémantique visuelle « désactivé ».

## 3. État focus / sélection
Les éléments interactifs exposent `accessibilityState` (`selected`, `disabled`, `busy`)
afin que VoiceOver/TalkBack annoncent l'état courant (onglets, chips, langue, étoiles).

## 4. Validation manuelle recommandée
Avant publication, valider sur appareil réel :
- **iOS** : Réglages → Accessibilité → VoiceOver.
- **Android** : Paramètres → Accessibilité → TalkBack.
Parcourir : connexion, recherche, fiche détail (galerie plein écran), réservation, messagerie.
