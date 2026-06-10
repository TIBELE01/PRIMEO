// Google Sign-In via Supabase Auth (OAuth 2.0) — réservé aux comptes CLIENTS.
//
// Flux :
//   1. Ouvre le navigateur sur {SUPABASE_URL}/auth/v1/authorize?provider=google
//      avec redirection vers l'app (deep link primeo://auth-callback, ou
//      l'origine courante sur le web).
//   2. Supabase gère l'OAuth Google puis redirige avec les tokens de session
//      dans le fragment de l'URL (#access_token=…&refresh_token=…).
//   3. On appelle POST /api/auth/google pour synchroniser la table `users`
//      (création du compte client au premier login) et récupérer le profil.
//   4. Les tokens sont stockés comme pour un login classique (SecureStore).
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL } from '../constants/config';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { authApi } from './api/endpoints/auth';
import { useAuthStore } from '../store/authStore';

// Sur le web, finalise la session OAuth quand la page de redirection se recharge.
WebBrowser.maybeCompleteAuthSession();

export type GoogleSignInResult =
  | { status: 'success'; isNewUser: boolean }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

function parseSessionFromUrl(url: string): { accessToken: string; refreshToken: string } | null {
  // Supabase renvoie les tokens dans le fragment (#…) ; certains navigateurs
  // les replacent en query (?…) — on tente les deux.
  const raw = url.split('#')[1] ?? url.split('?')[1] ?? '';
  const params = new URLSearchParams(raw);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    const redirectUrl = Linking.createURL('auth-callback');
    const authUrl =
      `${SUPABASE_URL}/auth/v1/authorize?provider=google` +
      `&redirect_to=${encodeURIComponent(redirectUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type !== 'success' || !result.url) {
      return { status: 'cancelled' };
    }

    const session = parseSessionFromUrl(result.url);
    if (!session) {
      return { status: 'error', message: 'Connexion Google interrompue. Réessayez.' };
    }

    // Synchronisation backend : crée le compte client si premier login Google
    const { data } = await authApi.google(session.accessToken, session.refreshToken);

    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken as string);
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken as string);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.user));

    const { setTokens, setUser } = useAuthStore.getState();
    setTokens(data.accessToken as string, data.refreshToken as string);
    setUser(data.user);

    return { status: 'success', isNewUser: Boolean(data.isNewUser) };
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string; message?: string } } };
    const message =
      e?.response?.data?.error ??
      e?.response?.data?.message ??
      'Impossible de se connecter avec Google. Réessayez.';
    return { status: 'error', message };
  }
}
