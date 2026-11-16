// WelcomeScreen — design néo-/glassmorphique aux couleurs Primeo (fond dégradé, formes
// abstraites, logo en carte flottante, boutons pilule). Navigation inchangée.
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LottieView = require('lottie-react-native').default as React.ComponentType<{
  source: unknown; autoPlay?: boolean; loop?: boolean; style?: unknown; accessibilityLabel?: string;
}>;
import type { AuthScreenProps } from '../../navigation/types';
import { PRIMEO_LOGO_URL } from '../../components/common/Logo';
import { Ionicons } from '@expo/vector-icons';
import { AuthBackground, AuthButtonGradient, Neu, useAuthPalette, BLUE, ORANGE, type AuthPalette } from './authDesign';

const { width } = Dimensions.get('window');
type Props = AuthScreenProps<'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { P, isDark, toggle } = useAuthPalette();
  const s = makeStyles(P);

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={P.bg[0]} />
      <AuthBackground />

      <SafeAreaView style={s.safe}>
        {/* Bouton thème */}
        <View style={s.topBar}>
          <TouchableOpacity
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            activeOpacity={0.85}
          >
            <Neu radius={16} innerStyle={s.roundInner}>
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={isDark ? '#FFD76A' : '#0B1F4D'} />
            </Neu>
          </TouchableOpacity>
        </View>

        {/* Logo en carte flottante */}
        <View style={s.brandArea}>
          <Neu radius={46} depth={1.4} innerStyle={s.logoInner}>
            <Image source={{ uri: PRIMEO_LOGO_URL }} resizeMode="contain" style={s.logoImg} accessibilityLabel="Logo Primeo" />
          </Neu>
          <Text style={s.tagline}>RÉSERVEZ · ACHETEZ · VIVEZ</Text>
        </View>

        {/* Illustration centrale */}
        <View style={s.animArea}>
          <LottieView
            source={require('../../../assets/lottie/loading.json')}
            autoPlay
            loop
            style={s.lottie}
            accessibilityLabel="Animation de bienvenue Primeo"
          />
        </View>

        {/* Carte du bas */}
        <Neu radius={34} depth={1.2} style={s.cardWrap} innerStyle={s.card}>
          <Text style={s.cardTitle} accessibilityRole="header">Commençons ensemble</Text>
          <Text style={s.cardSub}>
            Accédez aux meilleures propriétés, restaurants et biens immobiliers en Côte d'Ivoire.
          </Text>

          <View style={s.actions}>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="button"
              accessibilityLabel="Se connecter à votre compte Primeo"
              activeOpacity={0.9}
            >
              <AuthButtonGradient />
              <Text style={s.primaryBtnText}>Se connecter</Text>
              <View style={s.arrowCircle}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              testID="go-register"
                            onPress={() => navigation.navigate('Register', { role: 'client' })}
              accessibilityRole="button"
              accessibilityLabel="Créer un nouveau compte Primeo"
              activeOpacity={0.88}
            >
              <Neu radius={36} innerStyle={s.outlineInner}>
                <Text style={s.outlineBtnText}>Créer un compte</Text>
              </Neu>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.proBtn}
              onPress={() => navigation.navigate('ProRegister')}
              accessibilityRole="button"
              accessibilityLabel="Inscription professionnelle"
              activeOpacity={0.88}
            >
              <Ionicons name="briefcase-outline" size={17} color={ORANGE} />
              <Text style={s.proBtnText}>Inscription professionnelle</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.legal}>
            En continuant, vous acceptez nos{' '}
            <Text style={s.legalLink}>Conditions d'utilisation</Text>
            {' '}et notre{' '}
            <Text style={s.legalLink}>Politique de confidentialité</Text>
          </Text>
        </Neu>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(P: AuthPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: P.bg[1] },
    safe: { flex: 1, paddingTop: 8, justifyContent: 'space-between', width: '100%', maxWidth: 520, alignSelf: 'center' },

    topBar: { alignItems: 'flex-end', paddingHorizontal: 24 },
    roundInner: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },

    brandArea: { alignItems: 'center', paddingTop: 8, gap: 16 },
    logoInner: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center' },
    logoImg: { width: 92, height: 92 },
    tagline: { fontSize: 12, fontWeight: '700', color: P.muted, letterSpacing: 2.2 },

    animArea: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
    lottie: { width: Math.min(width * 0.55, 240), height: Math.min(width * 0.55, 240) },

    cardWrap: { marginHorizontal: 16, marginBottom: 12 },
    card: { paddingTop: 24, paddingHorizontal: 22, paddingBottom: 20 },
    cardTitle: { fontSize: 24, fontWeight: '900', color: P.text, marginBottom: 6, letterSpacing: -0.3 },
    cardSub: { fontSize: 14, color: P.muted, lineHeight: 22, marginBottom: 20 },

    actions: { gap: 12, marginBottom: 16 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE, paddingVertical: 17, borderRadius: 36, minHeight: 58, shadowColor: '#3B6BFF', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
    primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
    arrowCircle: { position: 'absolute', right: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    outlineInner: { alignItems: 'center', paddingVertical: 16 },
    outlineBtnText: { fontSize: 16, fontWeight: '800', color: BLUE },
    proBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: ORANGE, borderRadius: 36, paddingVertical: 14, backgroundColor: P.surface },
    proBtnText: { fontSize: 15, fontWeight: '800', color: ORANGE },

    legal: { textAlign: 'center', color: P.muted, fontSize: 11.5, lineHeight: 17 },
    legalLink: { color: BLUE, fontWeight: '600' },
  });
}
