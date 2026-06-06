import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, Alert, Platform, Linking,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../../navigation/types';

// Import conditionnel : WebView n'existe pas sur le web (iframe bloqué par CSP Genius Pay)
let WebView: React.ComponentType<{
  source: { uri: string };
  onLoadStart: () => void;
  onLoadEnd: () => void;
  onNavigationStateChange: (s: { url: string }) => void;
  onError: () => void;
  onHttpError: (e: { nativeEvent: { statusCode: number } }) => void;
  style: object;
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  startInLoadingState?: boolean;
  allowsBackForwardNavigationGestures?: boolean;
}> | null = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebView = require('react-native-webview').WebView;
}

type Props = NativeStackScreenProps<ClientStackParamList, 'GeniusPayWebView'>;

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

type ScreenState = 'webview' | 'timeout' | 'error';

// ─── Composant page d'attente web ───────────────────────────────────────────

function WebPaymentWaitingScreen({
  checkoutUrl,
  onConfirmed,
  onCancel,
}: {
  checkoutUrl: string;
  onConfirmed: () => void;
  onCancel: () => void;
}) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const openPayment = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(checkoutUrl);
    }
  }, [checkoutUrl]);

  // Ouvre automatiquement l'onglet de paiement au montage
  useEffect(() => {
    openPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (showCancelConfirm) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stateScreen}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Abandonner le paiement ?</Text>
          <Text style={styles.stateBody}>
            Votre réservation sera annulée si le paiement n'est pas complété.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowCancelConfirm(false)}>
            <Text style={styles.primaryBtnText}>Continuer le paiement</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerBtn} onPress={onCancel}>
            <Text style={styles.dangerBtnText}>Abandonner</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.headerTitle}>Paiement sécurisé</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowCancelConfirm(true)}
          style={styles.closeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stateScreen}>
        <Text style={styles.stateIcon}>💳</Text>
        <Text style={styles.stateTitle}>Page de paiement ouverte</Text>
        <Text style={styles.stateBody}>
          La page de paiement Genius Pay a été ouverte dans un nouvel onglet.
          Complétez le paiement puis revenez ici pour confirmer votre réservation.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={openPayment}>
          <Text style={styles.primaryBtnText}>Rouvrir la page de paiement</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onConfirmed}>
          <Text style={styles.secondaryBtnText}>J'ai payé — Vérifier ma réservation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Écran principal ─────────────────────────────────────────────────────────

export function GeniusPayWebViewScreen({ route, navigation }: Props) {
  const { checkoutUrl, bookingId } = route.params;

  const [loading, setLoading] = useState(true);
  const [screenState, setScreenState] = useState<ScreenState>('webview');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigatedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!navigatedRef.current) setScreenState('timeout');
    }, TIMEOUT_MS);
    return () => clearTimer();
  }, [clearTimer]);

  const goToConfirmation = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    clearTimer();
    navigation.replace('BookingConfirmation', { bookingId });
  }, [navigation, bookingId, clearTimer]);

  const handleCancel = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    clearTimer();
    navigation.goBack();
  }, [navigation, clearTimer]);

  // Sur le web, on délègue à la page d'attente (pas d'iframe)
  if (Platform.OS === 'web') {
    return (
      <WebPaymentWaitingScreen
        checkoutUrl={checkoutUrl}
        onConfirmed={goToConfirmation}
        onCancel={handleCancel}
      />
    );
  }

  // ─── Gestion du timeout et des erreurs (natif seulement) ────────────────

  const handleClose = () => {
    Alert.alert(
      'Abandonner le paiement ?',
      "Votre réservation sera annulée si le paiement n'est pas complété.",
      [
        { text: 'Continuer le paiement', style: 'cancel' },
        { text: 'Abandonner', style: 'destructive', onPress: handleCancel },
      ],
    );
  };

  const handleNavigationStateChange = (navState: { url: string }) => {
    const { url } = navState;
    if (
      url.includes('/payment-status') ||
      url.startsWith('primeo://') ||
      url.includes('/payment/success')
    ) {
      goToConfirmation();
    } else if (url.includes('/payment/cancel') || url.includes('/payment/failure')) {
      handleCancel();
    }
  };

  const handleError = () => {
    setScreenState('error');
    clearTimer();
  };

  if (screenState === 'timeout') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stateScreen}>
          <Text style={styles.stateIcon}>⏱️</Text>
          <Text style={styles.stateTitle}>Le paiement a expiré</Text>
          <Text style={styles.stateBody}>
            La session de paiement a expiré après 10 minutes. Votre réservation reste en attente.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={goToConfirmation}>
            <Text style={styles.secondaryBtnText}>Vérifier ma réservation</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState === 'error') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stateScreen}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Erreur de chargement</Text>
          <Text style={styles.stateBody}>
            Impossible de charger la page de paiement. Vérifiez votre connexion et réessayez.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setScreenState('webview')}>
            <Text style={styles.primaryBtnText}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── WebView natif (iOS / Android) ───────────────────────────────────────

  if (!WebView) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.headerTitle}>Paiement sécurisé</Text>
        </View>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.webviewContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1056E0" />
            <Text style={styles.loadingText}>Chargement du paiement…</Text>
          </View>
        )}
        <WebView
          source={{ uri: checkoutUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.statusCode >= 500) handleError();
          }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          allowsBackForwardNavigationGestures={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockIcon: { fontSize: 16 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  closeText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  webviewContainer: { flex: 1 },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  loadingText: { fontSize: 14, color: '#6B7280' },
  stateScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  stateIcon: { fontSize: 52, marginBottom: 4 },
  stateTitle: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' },
  stateBody: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 8 },
  primaryBtn: {
    width: '100%', backgroundColor: '#1056E0',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#1056E0',
    borderRadius: 14, paddingVertical: 13, alignItems: 'center',
  },
  secondaryBtnText: { color: '#1056E0', fontSize: 15, fontWeight: '700' },
  dangerBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#EF4444',
    borderRadius: 14, paddingVertical: 13, alignItems: 'center',
  },
  dangerBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
});
