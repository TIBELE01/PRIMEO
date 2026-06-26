// WelcomeScreen — premium redesign: dark hero, brand identity, floating bottom card
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

const { width, height } = Dimensions.get('window');
type Props = AuthScreenProps<'Welcome'>;

const BRAND_BLUE = '#1056E0';

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#040C1F" />

      {/* ── Background ambient glow ── */}
      <View style={s.glowTop} />
      <View style={s.glowMid} />

      {/* ── Grid dots pattern ── */}
      <View style={s.dotsOverlay} />

      <SafeAreaView style={s.safe}>
        {/* ── Top brand area ── */}
        <View style={s.brandArea}>
          {/* Logo */}
          <Image source={{ uri: PRIMEO_LOGO_URL }} resizeMode="contain" style={s.logoImg} />

          {/* Tagline */}
          <View style={s.taglineWrap}>
            <View style={s.taglineLine} />
            <Text style={s.tagline}>Réservez. Achetez. Vivez.</Text>
            <View style={s.taglineLine} />
          </View>
        </View>

        {/* ── Central illustration ── */}
        <View style={s.animArea}>
          <View style={s.animGlow} />
          <LottieView
            source={require('../../../assets/lottie/loading.json')}
            autoPlay
            loop
            style={s.lottie}
            accessibilityLabel="Animation de bienvenue Primeo"
          />
        </View>

        {/* ── Bottom card ── */}
        <View style={s.card}>
          {/* Card handle */}
          <View style={s.cardHandle} />

          <Text style={s.cardTitle}>Commençons ensemble</Text>
          <Text style={s.cardSub}>
            Accédez aux meilleures propriétés, restaurants et biens immobiliers en Côte d'Ivoire.
          </Text>

          {/* CTA buttons */}
          <View style={s.actions}>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="button"
              accessibilityLabel="Se connecter à votre compte Primeo"
              activeOpacity={0.88}
            >
              <Text style={s.primaryBtnText}>Se connecter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="go-register"
              style={s.outlineBtn}
              onPress={() => navigation.navigate('Register', { role: 'client' })}
              accessibilityRole="button"
              accessibilityLabel="Créer un nouveau compte Primeo"
              activeOpacity={0.88}
            >
              <Text style={s.outlineBtnText}>Créer un compte</Text>
            </TouchableOpacity>
          </View>

          {/* Legal */}
          <Text style={s.legal}>
            En continuant, vous acceptez nos{' '}
            <Text style={s.legalLink}>Conditions d'utilisation</Text>
            {' '}et notre{' '}
            <Text style={s.legalLink}>Politique de confidentialité</Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040C1F' },
  safe:      { flex: 1, paddingTop: 16, justifyContent: 'space-between' },

  // Background ambient glows
  glowTop: {
    position: 'absolute', width: 380, height: 380, borderRadius: 190,
    top: -120, left: -60,
    backgroundColor: 'rgba(16,86,224,0.18)',
  },
  glowMid: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    top: height * 0.28, right: -80,
    backgroundColor: 'rgba(16,86,224,0.10)',
  },

  // Subtle dot pattern (decorative)
  dotsOverlay: {
    position: 'absolute', inset: 0,
    opacity: 0.03,
  },

  // ── Brand area ──
  brandArea: {
    alignItems: 'center', paddingTop: 24, gap: 6,
  },
  logoImg: {
    width: 112, height: 112,
    marginBottom: 10,
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 10,
  },
  taglineWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4,
  },
  taglineLine: {
    flex: 1, height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)', maxWidth: 40,
  },
  tagline: {
    fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },

  // ── Animation area ──
  animArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  animGlow: {
    position: 'absolute',
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(16,86,224,0.14)',
  },
  lottie: { width: width * 0.62, height: width * 0.62 },

  // ── Bottom card ──
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 14, paddingHorizontal: 24, paddingBottom: 20,
    gap: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  cardHandle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22, fontWeight: '900', color: '#0F1729',
    marginBottom: 6, letterSpacing: -0.3,
  },
  cardSub: {
    fontSize: 14, color: '#64748B', lineHeight: 22,
    marginBottom: 22,
  },

  // Actions
  actions: { gap: 12, marginBottom: 16 },
  primaryBtn: {
    backgroundColor: BRAND_BLUE, paddingVertical: 17,
    borderRadius: 16, alignItems: 'center',
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  outlineBtn: {
    borderWidth: 2, borderColor: BRAND_BLUE,
    paddingVertical: 15, borderRadius: 16, alignItems: 'center',
  },
  outlineBtnText: { fontSize: 16, fontWeight: '700', color: BRAND_BLUE },

  // Legal
  legal: {
    textAlign: 'center', color: '#9CA3AF',
    fontSize: 11.5, lineHeight: 17,
  },
  legalLink: { color: BRAND_BLUE, fontWeight: '600' },
});
