// Application root — providers, session hydration, navigation container
import 'react-native-gesture-handler';
import './src/utils/webAlertPolyfill'; // Alert.alert → modale stylée (web + natif)
import * as Sentry from '@sentry/react-native';
import React, { useEffect, useRef, Component, ReactNode } from 'react';

Sentry.init({
  dsn: process.env['EXPO_PUBLIC_SENTRY_DSN'],
  // Disable in dev to avoid polluting Sentry with local errors
  enabled: !__DEV__ && !!process.env['EXPO_PUBLIC_SENTRY_DSN'],
  environment: process.env['EXPO_PUBLIC_ENV'] ?? (__DEV__ ? 'development' : 'production'),
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Strip auth tokens from captured request headers
    if (event.request?.headers) {
      delete (event.request.headers as Record<string, unknown>)['Authorization'];
      delete (event.request.headers as Record<string, unknown>)['authorization'];
    }
    return event;
  },
});
import { Platform, View, Text, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { AlertHost } from './src/components/ui/AlertHost';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useMaintenanceStore } from './src/store/maintenanceStore';
import MaintenanceScreen from './src/screens/common/MaintenanceScreen';
import AnalyticsConsentBanner from './src/components/common/AnalyticsConsentBanner';
import { useCurrencyStore } from './src/store/currencyStore';
import { currenciesApi } from './src/services/api/endpoints/currencies';
import { syncQueue } from './src/services/offline/syncQueue';
import { apiClient } from './src/services/api/client';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { navigationRef } from './src/navigation/navigationRef';

// Deep-link mapping
// Supabase password-reset redirects to:
//   - native : primeo://reset-password#access_token=xxx&type=recovery
//   - web    : https://primeo-mobile-web-xt9o.onrender.com/reset-password#access_token=xxx&type=recovery
const WEB_ORIGIN = 'https://primeo-mobile-web-xt9o.onrender.com';
const linking = {
  prefixes: ['primeo://', WEB_ORIGIN],
  config: {
    screens: {
      PublicTabs: {
        screens: {
          Connexion: {
            screens: {
              ResetPassword: {
                path: 'reset-password',
                parse: {
                  // Token is extracted from the URL fragment in getStateFromPath below
                  recoveryToken: (_: string) => '',
                },
              },
            },
          },
        },
      },
    },
  },
  getStateFromPath(path: string, options?: object) {
    // Supabase appends tokens in fragment or query-string:
    //   /reset-password#access_token=xxx&type=recovery  (native deep link / web initial URL)
    //   /reset-password?access_token=xxx&type=recovery  (query-string variant)
    // On web, React Navigation strips the hash before calling this function in some
    // scenarios, so also read window.location.hash directly as a fallback.
    const webHash =
      typeof window !== 'undefined' ? (window.location.hash ?? '').replace(/^#/, '') : '';
    const [pathPart, fragmentOrQuery] = path.split(/[#?]/);
    const params = new URLSearchParams(fragmentOrQuery || webHash);
    const accessToken = params.get('access_token');
    const type = params.get('type');

    if (pathPart.replace(/^\//, '') === 'reset-password' && accessToken && type === 'recovery') {
      // ResetPassword lives deep in the tree:
      // RootStack → PublicTabs (tab index 2: Connexion) → ConnexionStack → ResetPassword
      // The state must mirror this hierarchy or React Navigation falls back to home.
      return {
        routes: [
          {
            name: 'PublicTabs',
            state: {
              index: 2,
              routes: [
                { name: 'Accueil' },
                { name: 'Recherche' },
                {
                  name: 'Connexion',
                  state: {
                    routes: [{ name: 'ResetPassword', params: { recoveryToken: accessToken } }],
                  },
                },
              ],
            },
          },
        ],
      };
    }

    // Fallback to default React Navigation linking handler
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getStateFromPath: defaultParser } = require('@react-navigation/native');
    return defaultParser(path, options);
  },
};

// SplashScreen only makes sense on native — skip it on web to avoid blank screen
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => null);
}

// ── Error boundary — catches JS crashes and shows a message instead of blank ──

interface EBState { hasError: boolean; message: string; stack: string }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, message: '', stack: '' };
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err.message, stack: '' };
  }
  componentDidCatch(err: Error, info: { componentStack: string }) {
    this.setState({ stack: info.componentStack ?? '' });
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#1a1a1a', padding: 20 }}>
          <View style={{ backgroundColor: '#e53e3e', borderRadius: 8, padding: 16, marginTop: 60, marginBottom: 16 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
              💥 CRASH — copie ce message
            </Text>
            <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'monospace' }}>
              {this.state.message}
            </Text>
          </View>
          <View style={{ backgroundColor: '#2d2d2d', borderRadius: 8, padding: 12, flex: 1 }}>
            <Text style={{ color: '#ff9', fontSize: 10, fontFamily: 'monospace' }}>
              {this.state.stack.slice(0, 1200)}
            </Text>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Inner app ─────────────────────────────────────────────────────────────────

function InnerApp() {
  const { theme } = useTheme();
  const hydrate         = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const setCurrency = useCurrencyStore(s => s.setCurrency);
  const setRates    = useCurrencyStore(s => s.setRates);
  const maintenanceActive  = useMaintenanceStore((s) => s.active);
  const refreshMaintenance = useMaintenanceStore((s) => s.refresh);
  const wasOffline  = useRef(false);

  // Push notification registration + listeners
  usePushNotifications();

  useEffect(() => {
    hydrate().finally(() => {
      if (Platform.OS !== 'web') {
        SplashScreen.hideAsync().catch(() => null);
      }
    });
    // Vérification du mode maintenance au démarrage (l'intercepteur API couvre
    // ensuite toute bascule en cours de session via les réponses 503)
    refreshMaintenance().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('@primeo_currency')
      .then(v => { if (v) setCurrency(v); })
      .catch(() => null);
    currenciesApi.getRates()
      .then(res => {
        const d = res.data?.data ?? res.data;
        if (d?.rates) setRates(d.rates, d.updatedAt ?? new Date().toISOString());
      })
      .catch(() => null);
  }, [setCurrency, setRates]);

  // Offline queue auto-flush on reconnection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const isConnected = !!(state.isConnected && state.isInternetReachable !== false);

      if (!isConnected) {
        wasOffline.current = true;
        return;
      }

      if (!wasOffline.current) return; // was already online — nothing to flush
      wasOffline.current = false;

      const hasPending = await syncQueue.hasPending().catch(() => false);
      if (!hasPending) return;

      try {
        const { synced, failed } = await syncQueue.flush(apiClient);

        if (synced > 0 && failed === 0) {
          Alert.alert(
            'Synchronisation réussie',
            `${synced} action${synced > 1 ? 's' : ''} synchronisée${synced > 1 ? 's' : ''} avec succès.`,
          );
        } else if (synced > 0 && failed > 0) {
          Alert.alert(
            'Synchronisation partielle',
            `${synced} action${synced > 1 ? 's' : ''} synchronisée${synced > 1 ? 's' : ''}` +
            `, ${failed} en échec (sera réessayé${failed > 1 ? 's' : ''} à la prochaine connexion).`,
          );
        } else if (failed > 0) {
          Alert.alert(
            'Synchronisation échouée',
            `${failed} action${failed > 1 ? 's' : ''} n'ont pas pu être synchronisée${failed > 1 ? 's' : ''}. ` +
            'Elles seront réessayées à la prochaine connexion.',
          );
        }
      } catch (err) {
        console.warn('[SyncQueue] flush error:', err);
      }
    });

    return unsubscribe;
  }, []);

  // The key forces NavigationContainer to fully remount when the user logs
  // in or out.  Without this, React Navigation tries to reuse its internal
  // navigation state when swapping MainTabs ↔ PublicTabs, which causes the
  // navigator to appear frozen (the auth-state change is silently ignored).
  // Mode maintenance : remplace toute l'application par l'écran dédié
  if (maintenanceActive) {
    return <MaintenanceScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} key={isAuthenticated ? 'main' : 'auth'} linking={linking}>
      <StatusBar style={(theme.colors.statusBar as string) === 'light-content' ? 'light' : 'dark'} />
      <RootNavigator />
      {/* Hôte global des modales d'alerte stylées (remplace les dialogues système) */}
      <AlertHost />
      {/* Consentement analytics — affiché une seule fois, au premier lancement */}
      <AnalyticsConsentBanner />
    </NavigationContainer>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <InnerApp />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(App);
