// React Native Web fournit un `Alert.alert` no-op, et le `window.alert/confirm`
// natif du navigateur est très peu professionnel. Ce module redirige TOUS les
// appels `Alert.alert(...)` de l'application vers une modale stylée et cohérente
// (`AlertHost`), sur web comme sur natif, sans modifier chaque écran.
//
// Importé une seule fois, au plus tôt, depuis App.tsx.
import { Alert } from 'react-native';
import { showStyledAlert, AlertButton } from './alertManager';

const alertFn = (
  title?: string,
  message?: string,
  buttons?: AlertButton[],
): void => {
  showStyledAlert({ title, message, buttons });
};
// Réassignation via cast (la signature locale d'AlertButton diffère de celle de RN).
(Alert as unknown as { alert: typeof alertFn }).alert = alertFn;

// Alert.prompt n'existe nativement que sur iOS — on le redirige vers la modale
// stylée avec champ de saisie pour un comportement uniforme web/Android/iOS.
// Signature : prompt(title, message, callbackOrButtons, type, defaultValue, keyboardType)
const promptFn = (
  title?: string,
  message?: string,
  callbackOrButtons?: ((value: string) => void) | AlertButton[],
  _type?: string,
  defaultValue?: string,
): void => {
  const buttons: AlertButton[] = typeof callbackOrButtons === 'function'
    ? [{ text: 'OK', onPress: (v?: string) => callbackOrButtons(v ?? '') }]
    : (callbackOrButtons ?? [{ text: 'OK' }]);

  showStyledAlert({
    title,
    message,
    buttons,
    prompt: true,
    promptPlaceholder: message,
    promptDefaultValue: defaultValue,
  });
};
(Alert as unknown as { prompt: typeof promptFn }).prompt = promptFn;
