import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Easing, Platform,
} from 'react-native';

const native = Platform.OS !== 'web';

/* ── Fond "vidéo" : cross-fade + Ken Burns ── */
const BACKDROP_IMAGES = [
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1280&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1280&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1280&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1280&q=80',
];

function VideoBackdrop() {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const zoom = useRef(new Animated.Value(0)).current;
  const pan  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const zLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
        Animated.timing(zoom, { toValue: 0, duration: 4500, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
      ]),
    );
    const pLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pan, { toValue: 1,  duration: 6000, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
        Animated.timing(pan, { toValue: -1, duration: 6000, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
      ]),
    );
    zLoop.start(); pLoop.start();
    return () => { zLoop.stop(); pLoop.stop(); };
  }, [zoom, pan]);

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 600, useNativeDriver: native }).start(() => {
        setIndex(i => (i + 1) % BACKDROP_IMAGES.length);
        Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: native }).start();
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [fade]);

  const scale = zoom.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1.32] });
  const tx    = pan.interpolate({ inputRange: [-1, 0, 1], outputRange: [-18, 0, 18] });
  const next  = (index + 1) % BACKDROP_IMAGES.length;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.Image
        source={{ uri: BACKDROP_IMAGES[next] }}
        style={[StyleSheet.absoluteFill, { transform: [{ scale }, { translateX: tx }] }]}
        resizeMode="cover"
      />
      <Animated.Image
        source={{ uri: BACKDROP_IMAGES[index] }}
        style={[StyleSheet.absoluteFill, { opacity: fade, transform: [{ scale }, { translateX: tx }] }]}
        resizeMode="cover"
      />
    </View>
  );
}

/* ── Props ── */
interface HomeHeaderProps {
  userName?: string;
  onNotificationsPress?: () => void;
  unreadCount?: number;
  onPressResidence?: () => void;
  onPressHotel?: () => void;
  onPressImmobilier?: () => void;
  onPressRestaurant?: () => void;
  loginButton?: { label: string; onPress: () => void };
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  userName, onNotificationsPress, unreadCount,
  onPressResidence, onPressHotel, onPressImmobilier, onPressRestaurant,
  loginButton,
}) => (
  <View style={s.container}>
    <VideoBackdrop />

    {/* voiles */}
    <View style={s.overlayMain} />
    <View style={s.overlayTop} />
    <View style={s.overlayBottom} />
    {/* halos */}
    <View style={s.glow1} />
    <View style={s.glow2} />

    <View style={s.inner}>

      {/* ── Salutation + cloche ou bouton connexion ── */}
      <View style={s.topBar}>
        <View>
          <Text style={s.greeting}>{loginButton ? 'Bienvenue 👋' : `Bonjour${userName ? `, ${userName}` : ''} 👋`}</Text>
          <Text style={s.subtitle}>Découvrez les meilleures propriétés</Text>
        </View>
        {loginButton ? (
          <TouchableOpacity style={s.loginBtn} onPress={loginButton.onPress} activeOpacity={0.85}
            accessibilityRole="button" accessibilityLabel={loginButton.label}>
            <Text style={s.loginBtnTxt}>{loginButton.label}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.notifBtn} onPress={onNotificationsPress} activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={unreadCount ? `Notifications — ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Notifications'}>
            <Text style={s.bell}>🔔</Text>
            {!!unreadCount && (
              <View style={s.badge}><Text style={s.badgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Badge premium ── */}
      <View style={s.premiumBadge}>
        <View style={s.premiumDot} />
        <Text style={s.premiumText}>Plateforme premium</Text>
      </View>

      {/* ── Encadré titre ── */}
      <View style={s.titleBox}>
        <Text style={s.heroTitle}>
          Choisissez votre expérience :{'\n'}Résidence ou Hôtel
        </Text>
      </View>

      {/* ── Encadré sous-titre ── */}
      <View style={s.subtitleBox}>
        <Text style={s.heroSub}>
          Une recherche fluide, des offres vérifiées et des paiements flexibles.
        </Text>
      </View>

      {/* ── 4 cartes en grille 2×2 ── */}
      <View style={s.cardGrid}>
        <TouchableOpacity style={s.card} onPress={onPressResidence} activeOpacity={0.85}
          accessibilityRole="button" accessibilityLabel="Résidences — Villas, appartements meublés">
          <Text style={s.cardIcon}>🏘️</Text>
          <Text style={s.cardTitle}>Résidences</Text>
          <Text style={s.cardDesc}>Villas, apparts meublés.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.card, s.cardB]} onPress={onPressHotel} activeOpacity={0.85}
          accessibilityRole="button" accessibilityLabel="Hôtels — Chambres et suites">
          <Text style={s.cardIcon}>🏨</Text>
          <Text style={s.cardTitle}>Hôtels</Text>
          <Text style={s.cardDesc}>Chambres et suites.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.card, s.cardC]} onPress={onPressImmobilier} activeOpacity={0.85}
          accessibilityRole="button" accessibilityLabel="Immobilier — Achat et location">
          <Text style={s.cardIcon}>🏢</Text>
          <Text style={s.cardTitle}>Immobilier</Text>
          <Text style={s.cardDesc}>Achat et location.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.card, s.cardD]} onPress={onPressRestaurant} activeOpacity={0.85}
          accessibilityRole="button" accessibilityLabel="Restaurants — Gastronomie ivoirienne">
          <Text style={s.cardIcon}>🍽️</Text>
          <Text style={s.cardTitle}>Restaurants</Text>
          <Text style={s.cardDesc}>Gastronomie CI.</Text>
        </TouchableOpacity>
      </View>

    </View>
  </View>
);

/* ── Styles ── */
const s = StyleSheet.create({
  container: {
    backgroundColor: '#03154A',
    overflow: 'hidden',
    paddingBottom: 24,
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 22,
  },

  /* voiles */
  overlayMain:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,10,48,0.87)' },
  overlayTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: 120, backgroundColor: 'rgba(1,6,30,0.48)' },
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, backgroundColor: 'rgba(1,6,30,0.55)' },
  glow1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(91,189,21,0.12)', top: -110, right: -90,
  },
  glow2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(16,86,224,0.22)', bottom: -60, left: -60,
  },

  inner: { paddingHorizontal: 18, paddingTop: 22 },

  /* top bar */
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  greeting: { fontSize: 21, fontWeight: '800', color: '#fff', marginBottom: 3 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.80)' },
  loginBtn: {
    borderWidth: 1.5, borderColor: '#fff',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  loginBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  bell: { fontSize: 19 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#D41313', borderRadius: 9,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

  /* badge premium */
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, marginBottom: 14,
  },
  premiumDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#5BBD15' },
  premiumText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  /* encadré titre */
  titleBox: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10,
  },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 28, letterSpacing: -0.3 },

  /* encadré sous-titre */
  subtitleBox: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18,
  },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.88)', lineHeight: 19 },

  /* grille 4 cartes 2×2 */
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14, padding: 14, gap: 5,
    /* ombre forte */
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 12,
  },
  cardB: { backgroundColor: '#EEF6FF' },
  cardC: { backgroundColor: '#FFFCEE' },
  cardD: { backgroundColor: '#FFF0F5' },
  cardIcon:  { fontSize: 24, marginBottom: 2 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#1056E0', lineHeight: 17 },
  cardDesc:  { fontSize: 11.5, color: '#6B7280', lineHeight: 15 },
});
