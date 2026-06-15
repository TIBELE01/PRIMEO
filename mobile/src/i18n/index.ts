// i18n setup — react-i18next, langue persistée (AsyncStorage), repli appareil → fr
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resources } from './resources';
import { STORAGE_KEYS } from '../constants/storageKeys';

const deviceLanguage = Localization.getLocales?.()?.[0]?.languageCode ?? 'fr';
export const SUPPORTED_LANGUAGES = Object.keys(resources);
const lng = SUPPORTED_LANGUAGES.includes(deviceLanguage) ? deviceLanguage : 'fr';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false, // React handles XSS
    },
    compatibilityJSON: 'v4',
  });

// Restaure la langue choisie par l'utilisateur (prioritaire sur la langue appareil).
AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE)
  .then((saved) => {
    if (saved && SUPPORTED_LANGUAGES.includes(saved) && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  })
  .catch(() => { /* repli silencieux sur la langue détectée */ });

/** Change la langue de l'app et la persiste. À utiliser depuis les écrans. */
export async function changeAppLanguage(lang: string): Promise<void> {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return;
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang).catch(() => null);
}

export default i18n;
