// i18n setup — react-i18next with French as default language
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { resources } from './resources';

const deviceLanguage = Localization.getLocales?.()?.[0]?.languageCode ?? 'fr';
const supportedLanguages = Object.keys(resources);
const lng = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'fr';

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

export default i18n;
