// WelcomeScreen — design néo-/glassmorphique aux couleurs Primeo (fond dégradé, formes
// abstraites, logo en carte flottante, boutons pilule). Navigation inchangée.
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, StatusBar, Image, ScrollView, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LottieView = require('lottie-react-native').default as React.ComponentType<{
  source: unknown; autoPlay?: boolean; loop?: boolean; style?: unknown; accessibilityLabel?: string;
}>;
import type { AuthScreenProps } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { AuthBackground, AuthButtonGradient, Neu, useAuthPalette, BLUE, ORANGE, type AuthPalette } from './authDesign';
import { LogoTile } from '../../components/common/Logo';

const { width } = Dimensions.get('window');
type Props = AuthScreenProps<'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { P, isDark, toggle } = useAuthPalette();
  const { height: winH } = useWindowDimensions();
  const sc = Math.min(1, Math.max(0.62, (winH - 70) / 800));
  const s = makeStyles(P, sc);

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={P.bg[0]} />
      <AuthBackground />

      <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} bounces={false}>
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
            <LogoTile size={Math.round(Number(s.logoInner.width) * 0.76)} shadow />
          </Neu>
          <Text style={s.tagline}>RÉSERVEZ · ACHETEZ · VIVEZ</Text>
        </View>

        {/* Illustration centrale */}
        {winH >= 720 && (
        <View style={s.animArea}>
          <LottieView
            source={require('../../../assets/lottie/loading.json')}
            autoPlay
            loop
            style={s.lottie}
            accessibilityLabel="Animation de bienvenue Primeo"
          />
        </View>
        )}

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
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(P: AuthPalette, sc: number) {
  const z = (n: number) => Math.round(n * sc);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: P.bg[1] },
    safe: { flex: 1, paddingTop: 8, width: '100%', maxWidth: 520, alignSelf: 'center' },
    scroll: { flexGrow: 1, justifyContent: 'center', gap: z(8), paddingTop: z(30), paddingBottom: z(16) },

    topBar: { position: 'absolute', top: z(6), right: 20, zIndex: 5 },
    roundInner: { width: z(46), height: z(46), alignItems: 'center', justifyContent: 'center' },

    brandArea: { alignItems: 'center', paddingTop: z(8), gap: z(12) },
    logoInner: { width: z(110), height: z(110), alignItems: 'center', justifyContent: 'center' },
    tagline: { fontSize: 12, fontWeight: '700', color: P.muted, letterSpacing: 2.2 },

    animArea: { alignItems: 'center', justifyContent: 'center' },
    lottie: { width: Math.min(width * 0.4, z(150)), height: Math.min(width * 0.4, z(150)) },

    cardWrap: { marginHorizontal: 16, marginBottom: 12 },
    card: { paddingTop: z(20), paddingHorizontal: 22, paddingBottom: z(16) },
    cardTitle: { fontSize: z(23), fontWeight: '900', color: P.text, marginBottom: 6, letterSpacing: -0.3 },
    cardSub: { fontSize: 13.5, color: P.muted, lineHeight: 20, marginBottom: z(14) },

    actions: { gap: z(10), marginBottom: z(12) },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE, paddingVertical: z(14), borderRadius: 36, minHeight: z(54), shadowColor: '#3B6BFF', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
    primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
    arrowCircle: { position: 'absolute', right: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    outlineInner: { alignItems: 'center', paddingVertical: z(13) },
    outlineBtnText: { fontSize: 16, fontWeight: '800', color: BLUE },
    proBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: ORANGE, borderRadius: 36, paddingVertical: z(11), backgroundColor: P.surface },
    proBtnText: { fontSize: 15, fontWeight: '800', color: ORANGE },

    legal: { textAlign: 'center', color: P.muted, fontSize: 11.5, lineHeight: 17 },
    legalLink: { color: BLUE, fontWeight: '600' },
  });
}
