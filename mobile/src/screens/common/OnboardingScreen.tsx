// OnboardingScreen — premium redesign: dark canvas, ambient glow, rich slides
import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, Dimensions, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    number: '01',
    icon: '🏡',
    category: 'Hébergement',
    title: 'Trouvez le\nlogement idéal',
    desc: 'Résidences meublées, hôtels et appartements de luxe partout en Côte d\'Ivoire.',
    accent: '#4A8FFF',
    glow: 'rgba(74,143,255,0.20)',
  },
  {
    id: '2',
    number: '02',
    icon: '🏢',
    category: 'Immobilier & Restauration',
    title: 'Achetez, louez\nou réservez',
    desc: 'Propriétés à vendre et tables de restaurant — tout en une seule application.',
    accent: '#FFAB4A',
    glow: 'rgba(255,171,74,0.20)',
  },
  {
    id: '3',
    number: '03',
    icon: '💳',
    category: 'Paiement sécurisé',
    title: 'Payez en toute\nconfiance',
    desc: 'Genius Pay intégré : 10 % en ligne, le reste à l\'arrivée. Simple et sécurisé.',
    accent: '#4ADE80',
    glow: 'rgba(74,222,128,0.20)',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const slide = SLIDES[index];

  const handleNext = () => {
    if (index < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
    } else {
      navigation.replace('Auth');
    }
  };

  const handleSkip = () => navigation.replace('Auth');

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />

      {/* Ambient glow circles that shift per slide */}
      <View style={[s.glow1, { backgroundColor: slide.glow }]} />
      <View style={[s.glow2, { backgroundColor: slide.glow }]} />

      <SafeAreaView style={s.safe}>
        {/* ── Top bar ── */}
        <View style={s.topBar}>
          <View style={s.counter}>
            <Text style={s.counterCurrent}>{slide.number}</Text>
            <Text style={s.counterTotal}>/ {String(SLIDES.length).padStart(2, '0')}</Text>
          </View>
          <TouchableOpacity onPress={handleSkip} style={s.skipBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.skipText}>Passer</Text>
          </TouchableOpacity>
        </View>

        {/* ── Slides ── */}
        <FlatList
          ref={flatRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, i) => item.id ?? String(i)}
          onMomentumScrollEnd={e =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item }) => (
            <View style={s.slide}>
              {/* Illustration container */}
              <View style={[s.iconOuter, { backgroundColor: item.glow, borderColor: item.accent + '30' }]}>
                <View style={[s.iconInner, { backgroundColor: item.accent + '18' }]}>
                  <Text style={s.icon}>{item.icon}</Text>
                </View>
                <View style={[s.iconRing, { borderColor: item.accent + '25' }]} />
              </View>

              {/* Category badge */}
              <View style={[s.badge, { backgroundColor: item.accent + '18', borderColor: item.accent + '35' }]}>
                <Text style={[s.badgeText, { color: item.accent }]}>{item.category}</Text>
              </View>

              {/* Title */}
              <Text style={s.title}>{item.title}</Text>

              {/* Description */}
              <Text style={s.desc}>{item.desc}</Text>
            </View>
          )}
        />

        {/* ── Bottom navigation ── */}
        <View style={s.bottomNav}>
          {/* Progress dots */}
          <View style={s.dotsRow}>
            {SLIDES.map((sl, i) => (
              <TouchableOpacity
                key={sl.id}
                onPress={() => {
                  flatRef.current?.scrollToIndex({ index: i, animated: true });
                  setIndex(i);
                }}
                style={[
                  s.dot,
                  i === index
                    ? { backgroundColor: slide.accent, width: 28, borderRadius: 4 }
                    : { backgroundColor: 'rgba(255,255,255,0.22)', width: 8, borderRadius: 4 },
                ]}
              />
            ))}
          </View>

          {/* CTA button */}
          <TouchableOpacity
            style={[s.cta, { backgroundColor: slide.accent }]}
            onPress={handleNext}
            activeOpacity={0.82}
          >
            <Text style={s.ctaText}>
              {index === SLIDES.length - 1 ? 'Commencer  →' : 'Suivant  →'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  safe: { flex: 1, paddingTop: 16 },

  // Ambient glows
  glow1: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
    top: -100, right: -80,
  },
  glow2: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    bottom: 80, left: -80,
  },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12,
  },
  counter: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  counterCurrent: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  counterTotal:   { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  skipBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.09)',
  },
  skipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.50)' },

  // Slide
  slide: {
    width,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 0,
  },

  // Icon illustration
  iconOuter: {
    width: 180, height: 180, borderRadius: 56,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: 36,
    position: 'relative',
  },
  iconInner: {
    width: 130, height: 130, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 68, lineHeight: 80 },
  iconRing: {
    position: 'absolute',
    width: 210, height: 210, borderRadius: 105,
    borderWidth: 1,
    top: -16, left: -16,
  },

  // Badge
  badge: {
    borderRadius: 100, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 6,
    marginBottom: 20,
  },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },

  // Text
  title: {
    fontSize: 34, fontWeight: '900', color: '#FFFFFF',
    textAlign: 'center', lineHeight: 42, marginBottom: 16,
    letterSpacing: -0.6,
  },
  desc: {
    fontSize: 15, color: 'rgba(255,255,255,0.52)',
    textAlign: 'center', lineHeight: 24, paddingHorizontal: 4,
  },

  // Bottom nav
  bottomNav: {
    paddingHorizontal: 24, paddingBottom: 12, gap: 22,
  },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8,
  },
  dot: { height: 6 },

  // CTA
  cta: {
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30, shadowRadius: 12, elevation: 8,
  },
  ctaText: { color: '#0A0F1E', fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },
});
