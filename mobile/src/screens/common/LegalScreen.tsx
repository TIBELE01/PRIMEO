// LegalScreen: affiche le centre légal (https://legal.primeo.ci) dans une WebView.
// URL configurable via EXPO_PUBLIC_LEGAL_URL. Gère le chargement et l'absence de réseau.
import React, { useState } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform, Linking,
} from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';

// Import conditionnel : react-native-webview n'existe pas sur le web.
let WebView: React.ComponentType<{
  source: { uri: string };
  onLoadEnd?: () => void;
  onError?: () => void;
  onHttpError?: () => void;
  startInLoadingState?: boolean;
  style?: object;
}> | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebView = require('react-native-webview').WebView;
}

const LEGAL_URL =
  (process.env.EXPO_PUBLIC_LEGAL_URL as string | undefined)?.replace(/\/+$/, '') ||
  'https://legal.primeo.ci';

export default function LegalScreen() {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const openExternally = () => { Linking.openURL(LEGAL_URL).catch(() => null); };

  // Repli (web ou erreur réseau) : lien d'ouverture externe + message clair.
  const Fallback = ({ offline }: { offline?: boolean }) => (
    <View style={s.center}>
      <Text style={s.icon}>📄</Text>
      <Text style={s.title} accessibilityRole="header">Centre légal Primeo</Text>
      <Text style={s.body}>
        {offline
          ? 'Connexion indisponible. Vérifiez votre réseau puis réessayez, ou ouvrez le centre légal dans votre navigateur.'
          : 'Consultez l’ensemble de nos documents juridiques sur notre centre légal.'}
      </Text>
      <TouchableOpacity
        style={s.btn}
        onPress={offline ? () => { setFailed(false); setLoading(true); } : openExternally}
        accessibilityRole="button"
        accessibilityLabel={offline ? 'Réessayer' : 'Ouvrir le centre légal'}
      >
        <Text style={s.btnText}>{offline ? 'Réessayer' : 'Ouvrir le centre légal'}</Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'web' || !WebView) {
    return <ScreenWrapper><Fallback /></ScreenWrapper>;
  }
  if (failed) {
    return <ScreenWrapper><Fallback offline /></ScreenWrapper>;
  }

  const WV = WebView;
  return (
    <ScreenWrapper>
      <View style={s.flex}>
        <WV
          source={{ uri: LEGAL_URL }}
          startInLoadingState
          onLoadEnd={() => setLoading(false)}
          onError={() => { setFailed(true); setLoading(false); }}
          onHttpError={() => { setFailed(true); setLoading(false); }}
          style={s.flex}
        />
        {loading && (
          <View style={s.loaderOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#1056E0" />
            <Text style={s.loaderText}>Chargement du centre légal…</Text>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', gap: 10 },
  loaderText: { fontSize: 14, color: '#475569' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  icon: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '800', color: '#1056E0' },
  body: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 21 },
  btn: { marginTop: 8, backgroundColor: '#1056E0', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
