import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, RefreshControl, ActivityIndicator,
  TextInput, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '@navigation/types';
import { propertiesApi } from '@services/api/endpoints/properties';
import { websiteApi } from '@services/api/endpoints/websiteApi';
import type { PlatformStats } from '@services/api/endpoints/websiteApi';
import type { Property } from '@/types/property';
import { normalizeProperties } from '@/utils/normalizeProperty';
import { useAuthStore } from '@store/authStore';
import { useOffline } from '@hooks/useOffline';
import { PropertyCard } from './PropertyCard';
import { HomeHeader } from './HomeHeader';
import { HomeFooter } from './HomeFooter';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

const { width: SCREEN_W } = Dimensions.get('window');

const CACHE_POPULAR = '@primeo_home_popular';
const CACHE_NEWEST  = '@primeo_home_newest';
const CACHE_FOR_YOU = '@primeo_home_foryou';
const CACHE_STATS   = '@primeo_home_stats';

// Stats par défaut neutres (zéro) — aucune donnée fictive en production.
// Les vraies valeurs proviennent de l'API websiteApi.getStats().
const DEFAULT_STATS: PlatformStats = { properties: 0, cities: 0, reservations: 0, clients: 0 };

const INNOVATIONS = [
  { icon: '🔭', title: 'Visite 3D',         desc: 'Explorez chaque propriété à 360° avant de réserver.' },
  { icon: '💳', title: 'Paiement flexible',  desc: '10% en ligne, 90% cash à l\'arrivée.' },
  { icon: '✅', title: 'Confiance vérifiée', desc: 'Hôtes validés, avis certifiés, litiges gérés.' },
  { icon: '🕐', title: 'Assistance 24h/7',   desc: 'Notre équipe disponible à tout moment.' },
];

const TESTIMONIALS = [
  { name: 'Kouamé A.', role: 'Voyageur d\'affaires', initials: 'KA', stars: 5, text: 'J\'ai trouvé une résidence parfaite à Cocody en moins de 10 minutes. La visite 3D m\'a convaincu.' },
  { name: 'Aminata S.', role: 'Étudiante',           initials: 'AS', stars: 5, text: 'Super plateforme ! L\'option paiement en cash a tout simplifié pour moi.' },
  { name: 'Paul K.',    role: 'Hôtelier',            initials: 'PK', stars: 4, text: 'Mes taux d\'occupation ont augmenté de 40% depuis que j\'utilise Primeo.' },
];

const PARTNERS = [
  { icon: '🟠', name: 'Orange CI',   desc: 'Paiement mobile' },
  { icon: '🟡', name: 'MTN',         desc: 'Mobile Money' },
  { icon: '🔵', name: 'Moov Africa', desc: 'Paiement mobile' },
  { icon: '💳', name: 'Genius Pay',  desc: 'Paiement en ligne' },
  { icon: '☁️', name: 'Cloudinary',  desc: 'Hébergement média' },
];

const FAQ_ITEMS = [
  { q: 'Comment réserver une propriété ?',       a: 'Sélectionnez votre destination, choisissez vos dates, puis appuyez sur « Réserver ».' },
  { q: 'Quelles sont les options de paiement ?',  a: '3 options : 100% en ligne via Genius Pay, 10%+90% cash, ou 100% cash directement.' },
  { q: 'Comment annuler une réservation ?',       a: 'Rendez-vous dans « Mes réservations » et appuyez sur « Annuler ».' },
  { q: 'Les avis sont-ils vérifiés ?',            a: 'Oui, seuls les clients ayant séjourné peuvent laisser un avis certifié.' },
  { q: 'Comment publier mon bien sur Primeo ?',   a: 'Créez un compte pro, choisissez votre abonnement. Votre annonce sera validée sous 24h.' },
];

/* ── Bannière de titre uniforme (pleine largeur, bleue, arrondie) ── */
function SectionTitle({ text, onSeeAll }: { text: string; onSeeAll?: () => void }) {
  return (
    <View style={s.secTitleBox}>
      <Text style={s.secTitleText}>{text.toUpperCase()}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.seeAll}>Voir tout →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Stars({ count }: { count: number }) {
  return <Text style={s.stars}>{'★'.repeat(count)}{'☆'.repeat(5 - count)}</Text>;
}

function FaqItem({ item }: { item: typeof FAQ_ITEMS[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.faqItem}>
      <TouchableOpacity style={s.faqQ} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <Text style={s.faqQText}>{item.q}</Text>
        <View style={[s.faqIconBox, open && s.faqIconBoxOpen]}>
          <Text style={[s.faqChevron, open && s.faqChevronOpen]}>{open ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {open && <Text style={s.faqA}>{item.a}</Text>}
    </View>
  );
}

/* ── Carrousel horizontal automatique (1 carte à la fois) ── */
function AutoCarousel({ count, interval = 3200, children }: { count: number; interval?: number; children: React.ReactNode }) {
  const ref = useRef<ScrollView>(null);
  const idx = useRef(0);
  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => {
      idx.current = (idx.current + 1) % count;
      ref.current?.scrollTo({ x: idx.current * SCREEN_W, animated: true });
    }, interval);
    return () => clearInterval(t);
  }, [count, interval]);
  return (
    <ScrollView
      ref={ref}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
    >
      {children}
    </ScrollView>
  );
}

/* ── Écran principal ── */
export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const user       = useAuthStore(s => s.user);
  const isOffline  = useOffline();

  const [popular,    setPopular]    = useState<Property[]>([]);
  const [newest,     setNewest]     = useState<Property[]>([]);
  const [forYou,     setForYou]     = useState<Property[]>([]);
  const [stats,      setStats]      = useState<PlatformStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [email,      setEmail]      = useState('');
  const [sent,       setSent]       = useState(false);

  const load = useCallback(async (fromRefresh = false) => {
    if (!fromRefresh) setLoading(true);
    if (!isOffline) {
      const [popRes, newRes, forRes, statRes] = await Promise.allSettled([
        propertiesApi.search({ sortBy: 'rating', limit: 8 }),
        propertiesApi.search({ sortBy: 'newest', limit: 6 }),
        propertiesApi.search({ sortBy: 'rating', limit: 6, page: 2 }),
        websiteApi.getStats(),
      ]);
      if (popRes.status  === 'fulfilled') { const d = normalizeProperties(popRes.value.data?.data?.properties ?? popRes.value.data?.data ?? []); setPopular(d); AsyncStorage.setItem(CACHE_POPULAR, JSON.stringify(d)).catch(() => null); }
      if (newRes.status  === 'fulfilled') { const d = normalizeProperties(newRes.value.data?.data?.properties ?? newRes.value.data?.data ?? []); setNewest(d);  AsyncStorage.setItem(CACHE_NEWEST,  JSON.stringify(d)).catch(() => null); }
      if (forRes.status  === 'fulfilled') { const d = normalizeProperties(forRes.value.data?.data?.properties ?? forRes.value.data?.data ?? []); setForYou(d);  AsyncStorage.setItem(CACHE_FOR_YOU, JSON.stringify(d)).catch(() => null); }
      if (statRes.status === 'fulfilled') { const st = (statRes.value.data as any)?.data ?? DEFAULT_STATS; setStats(st); AsyncStorage.setItem(CACHE_STATS, JSON.stringify(st)).catch(() => null); }
      else setStats(DEFAULT_STATS);
    } else {
      const [cp, cn, cf, cs] = await Promise.all([AsyncStorage.getItem(CACHE_POPULAR), AsyncStorage.getItem(CACHE_NEWEST), AsyncStorage.getItem(CACHE_FOR_YOU), AsyncStorage.getItem(CACHE_STATS)]);
      if (cp) setPopular(JSON.parse(cp)); if (cn) setNewest(JSON.parse(cn)); if (cf) setForYou(JSON.parse(cf));
      setStats(cs ? JSON.parse(cs) : DEFAULT_STATS);
    }
    setLoading(false); setRefreshing(false);
  }, [isOffline]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, [load]);

  const goSearch   = (p?: any) => navigation.navigate('Search', p ?? {});
  const goProperty = (id: string) => navigation.navigate('PropertyDetail', { propertyId: id });

  /* Données réelles uniquement — aucune propriété de démonstration */
  const forYouList  = forYou;
  const popularList = popular;
  const newestList  = newest;

  const displayStats = stats ?? DEFAULT_STATS;
  const statCards = [
    { icon: '🏠', label: 'Propriétés actives', value: displayStats.properties },
    { icon: '📍', label: 'Villes couvertes',   value: displayStats.cities },
    { icon: '📅', label: 'Réservations',        value: displayStats.reservations },
    { icon: '👥', label: 'Clients satisfaits',  value: displayStats.clients },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#03154A" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1056E0']} />}
      >
        {/* ── Hero bleu ── */}
        <HomeHeader
          userName={user?.firstName}
          onPressResidence={() => navigation.navigate('ResidencesCategory', { category: 'residence' })}
          onPressHotel={() => navigation.navigate('HotelsCategory', { category: 'hotel' })}
          onPressImmobilier={() => navigation.navigate('ImmobilierCategory', { category: 'immobilier' })}
          onPressRestaurant={() => navigation.navigate('RestaurantsCategory', { category: 'restaurant' })}
        />

        {/* ── Pour vous ── */}
        <View style={[s.section, { marginTop: 32 }]}>
          <SectionTitle text="Pour vous" onSeeAll={() => goSearch()} />
          {loading ? <ActivityIndicator color="#1056E0" style={s.loader} /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hList}>
              {forYouList.map(p => <PropertyCard key={p.id} property={p} onPress={() => goProperty(p.id)} style={s.hCard} />)}
            </ScrollView>
          )}
        </View>

        {/* ── Populaires ── */}
        <View style={s.section}>
          <SectionTitle text="Populaires dans votre région" onSeeAll={() => goSearch()} />
          {loading ? <ActivityIndicator color="#1056E0" style={s.loader} /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hList}>
              {popularList.map(p => <PropertyCard key={p.id} property={p} onPress={() => goProperty(p.id)} style={s.hCard} />)}
            </ScrollView>
          )}
        </View>

        {/* ── Primeo en chiffres ── */}
        <View style={s.statsSection}>
          <SectionTitle text="Primeo en chiffres" />
          <View style={s.statsGrid}>
            {statCards.map(card => (
              <View key={card.label} style={s.statCard}>
                <Text style={s.statIcon}>{card.icon}</Text>
                <Text style={s.statValue}>{card.value.toLocaleString('fr-FR')}+</Text>
                <Text style={s.statLabel}>{card.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Innovations ── */}
        <View style={s.section}>
          <SectionTitle text="Nos innovations" />
          <View style={s.innovGrid}>
            {INNOVATIONS.map(item => (
              <View key={item.title} style={s.innovCard}>
                <Text style={s.innovIcon}>{item.icon}</Text>
                <Text style={s.innovTitle}>{item.title}</Text>
                <Text style={s.innovDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Nouveautés ── */}
        <View style={s.section}>
          <SectionTitle text="Nouveautés" onSeeAll={() => goSearch()} />
          {loading ? <ActivityIndicator color="#1056E0" style={s.loader} /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hList}>
              {newestList.map(p => <PropertyCard key={p.id} property={p} onPress={() => goProperty(p.id)} style={s.hCard} />)}
            </ScrollView>
          )}
        </View>

        {/* ── Témoignages (carrousel auto, 1 carte) ── */}
        <View style={s.section}>
          <SectionTitle text="Témoignages" />
          <AutoCarousel count={TESTIMONIALS.length}>
            {TESTIMONIALS.map(t => (
              <View key={t.name} style={s.testimonialSlide}>
                <View style={s.testimonialCard}>
                  <Stars count={t.stars} />
                  <Text style={s.testimonialText}>"{t.text}"</Text>
                  <View style={s.testimonialFooter}>
                    <View style={s.avatar}><Text style={s.avatarText}>{t.initials}</Text></View>
                    <View>
                      <Text style={s.testimonialName}>{t.name}</Text>
                      <Text style={s.testimonialRole}>{t.role}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </AutoCarousel>
        </View>

        {/* ── Partenaires (carrousel auto, 1 carte) ── */}
        <View style={s.section}>
          <SectionTitle text="Nos partenaires" />
          <AutoCarousel count={PARTNERS.length} interval={2600}>
            {PARTNERS.map(p => (
              <View key={p.name} style={s.partnerSlide}>
                <View style={s.partnerCard}>
                  <Text style={s.partnerIcon}>{p.icon}</Text>
                  <Text style={s.partnerName}>{p.name}</Text>
                  <Text style={s.partnerDesc}>{p.desc}</Text>
                </View>
              </View>
            ))}
          </AutoCarousel>
        </View>

        {/* ── FAQ ── */}
        <View style={s.section}>
          <SectionTitle text="Questions fréquentes" />
          <View style={s.faqList}>
            {FAQ_ITEMS.map(item => <FaqItem key={item.q} item={item} />)}
          </View>
        </View>

        {/* ── Newsletter (fond orange) ── */}
        <View style={s.newsletterSection}>
          <View style={s.secTitleBoxOnOrange}>
            <Text style={s.secTitleTextOrange}>BULLETIN D'INFORMATION</Text>
          </View>
          <Text style={s.newsletterSub}>Recevez les meilleures offres et nouveautés directement dans votre boîte mail.</Text>
          {sent ? (
            <Text style={s.newsletterSuccess}>Merci ! Vous êtes inscrit(e). ✅</Text>
          ) : (
            <View style={s.newsletterRow}>
              <TextInput
                style={s.newsletterInput}
                placeholder="Votre adresse email"
                placeholderTextColor="#9A6A33"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={s.newsletterBtn} onPress={() => { if (email.includes('@')) setSent(true); }}>
                <Text style={s.newsletterBtnText}>S'inscrire</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ════════════ PIED DE PAGE (composant partagé) ════════════ */}
        <HomeFooter />

      </ScrollView>
    </SafeAreaView>
  );
}

/* ════════════════════════ STYLES ════════════════════════ */
const CARD_SHADOW = {
  shadowColor: '#0B3DA8',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.20,
  shadowRadius: 18,
  elevation: 10,
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },

  loader: { marginVertical: 24 },

  /* espace augmenté entre les sections */
  section: { marginBottom: 44 },
  hList:   { paddingHorizontal: 16, gap: 14 },
  hCard:   { width: 230 },

  /* slide carrousel = 1 page pleine largeur (cards narrowed by horizontal padding) */
  slide:            { width: SCREEN_W, paddingHorizontal: 16 },
  testimonialSlide: { width: SCREEN_W, paddingHorizontal: 36 },
  partnerSlide:     { width: SCREEN_W, paddingHorizontal: 52 },

  /* ── Bannière de titre : longue, pleine largeur, arrondie, gris-blanc ── */
  secTitleBox: {
    marginHorizontal: 16, marginBottom: 18,
    backgroundColor: '#F0F2F7',
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  secTitleBoxOnOrange: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.40)',
    paddingHorizontal: 16, paddingVertical: 13,
    marginBottom: 4,
    alignSelf: 'stretch',
  },
  secTitleText: { fontSize: 13, fontWeight: '800', color: '#1056E0', letterSpacing: 1.0 },
  secTitleTextOrange: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 1.0 },
  seeAll: { fontSize: 12.5, color: '#1056E0', fontWeight: '700' },

  /* ── Stats ── */
  statsSection: { backgroundColor: '#03154A', paddingVertical: 32, marginBottom: 44 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  statCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16, padding: 16, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  statIcon:  { fontSize: 28 },
  statValue: { fontSize: 22, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 11, color: '#93C5FD', textAlign: 'center' },

  /* ── Innovations ── */
  innovGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  innovCard: {
    width: '47%', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, gap: 6,
    ...CARD_SHADOW,
  },
  innovIcon:  { fontSize: 28 },
  innovTitle: { fontSize: 13, fontWeight: '800', color: '#111827' },
  innovDesc:  { fontSize: 11.5, color: '#6B7280', lineHeight: 17 },

  /* ── Témoignages (carte étroite et haute) ── */
  testimonialCard: {
    backgroundColor: '#fff',
    borderRadius: 20, paddingVertical: 36, paddingHorizontal: 22, gap: 14,
    ...CARD_SHADOW,
  },
  testimonialText:   { fontSize: 15, color: '#374151', fontStyle: 'italic', lineHeight: 24 },
  testimonialFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  avatar:      { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1056E0', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontWeight: '800', fontSize: 15 },
  testimonialName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  testimonialRole: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  stars: { color: '#F59E0B', fontSize: 16 },

  /* ── Partenaires (carte étroite et haute) ── */
  partnerCard: {
    backgroundColor: '#fff',
    borderRadius: 20, paddingVertical: 56, paddingHorizontal: 24,
    alignItems: 'center', gap: 10,
    ...CARD_SHADOW,
  },
  partnerIcon: { fontSize: 52 },
  partnerName: { fontSize: 18, color: '#111827', fontWeight: '800' },
  partnerDesc: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

  /* ── FAQ ── */
  faqList:  { marginHorizontal: 16 },
  faqItem:  {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden',
    ...CARD_SHADOW,
  },
  faqQ:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  faqQText: { flex: 1, fontSize: 13.5, fontWeight: '700', color: '#111827', marginRight: 10 },
  faqIconBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  faqIconBoxOpen: { backgroundColor: '#1056E0' },
  faqChevron: { fontSize: 10, color: '#1056E0' },
  faqChevronOpen: { color: '#fff' },
  faqA:     { fontSize: 13, color: '#6B7280', lineHeight: 20, paddingHorizontal: 15, paddingBottom: 15 },

  /* ── Newsletter (FOND ORANGE) ── */
  newsletterSection: { backgroundColor: '#F08A1D', marginBottom: 0, paddingVertical: 26, paddingHorizontal: 16, gap: 12 },
  newsletterSub:     { fontSize: 13.5, color: '#fff', lineHeight: 20, marginTop: 6, fontWeight: '500' },
  newsletterRow:     { flexDirection: 'row', gap: 10, marginTop: 6 },
  newsletterInput:   {
    flex: 1, backgroundColor: '#fff',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 6,
  },
  newsletterBtn:     {
    backgroundColor: '#03154A', borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 12, justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 6,
  },
  newsletterBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  newsletterSuccess: { fontSize: 15, color: '#fff', fontWeight: '800', marginTop: 6 },
});
