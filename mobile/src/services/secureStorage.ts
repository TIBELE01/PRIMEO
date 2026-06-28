// Stockage sécurisé multiplateforme.
// Sur natif (iOS/Android) : délègue à expo-secure-store (Keychain/Keystore).
// Sur web (react-native-web) : expo-secure-store n'est PAS supporté et lève
// « Unavailable » → on bascule sur localStorage. Cela permet à la version web
// de test (déployée sur Render) de stocker les jetons et de faire des appels API.
// L'API expose exactement les mêmes méthodes que SecureStore (getItemAsync,
// setItemAsync, deleteItemAsync) pour rester un drop-in (import inchangé ailleurs).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const webStore = {
  async getItemAsync(key: string): Promise<string | null> {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    try { globalThis.localStorage?.setItem(key, value); } catch { /* quota/privé : ignore */ }
  },
  async deleteItemAsync(key: string): Promise<void> {
    try { globalThis.localStorage?.removeItem(key); } catch { /* ignore */ }
  },
};

// Sur natif, on réexporte l'objet SecureStore tel quel (comportement identique).
export const secureStore = Platform.OS === 'web' ? webStore : SecureStore;
