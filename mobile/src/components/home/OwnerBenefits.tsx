// « Vous êtes propriétaire ? » — 4 cartes PUREMENT INFORMATIVES (aucun lien, bouton ni action),
// même contenu que la section du site vitrine. Styles identiques aux cartes « Nos innovations »
// de l'accueil (fond blanc, rayon 16, padding 16, même ombre), grille 2 × 2.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OWNER_BENEFITS: Array<{ icon: React.ComponentProps<typeof Ionicons>['name']; title: string; desc: string }> = [
  { icon: 'add-circle-outline', title: 'Publication simplifiée', desc: 'Publiez vos biens en quelques clics et gérez vos annonces facilement.' },
  { icon: 'eye-outline',        title: 'Visibilité accrue',      desc: 'Bénéficiez d\'une mise en avant dans les résultats de recherche.' },
  { icon: 'locate-outline',     title: 'Audience ciblée',        desc: 'Touchez les voyageurs et professionnels qui correspondent à vos offres.' },
  { icon: 'grid-outline',       title: 'Gestion centralisée',    desc: 'Suivez vos réservations, vos revenus et vos performances depuis un seul tableau de bord.' },
];

// Ombre commune des cartes de l'accueil (identique à CARD_SHADOW de HomeScreen / PublicHomeScreen)
const CARD_SHADOW = {
  shadowColor: '#0B3DA8',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.20,
  shadowRadius: 18,
  elevation: 10,
};

export function OwnerBenefits() {
  return (
    <>
      <Text style={s.sub}>Découvrez comment Primeo vous aide à gérer et valoriser vos biens.</Text>
      <View style={s.grid}>
        {OWNER_BENEFITS.map((item) => (
          <View key={item.title} style={s.card} accessible accessibilityLabel={`${item.title}. ${item.desc}`}>
            <View style={s.iconBox}>
              <Ionicons name={item.icon} size={22} color="#1056E0" />
            </View>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.desc}>{item.desc}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  sub: { fontSize: 13, color: '#6B7280', lineHeight: 19, paddingHorizontal: 16, marginTop: -4, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  card: {
    width: '47%', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, gap: 6,
    ...CARD_SHADOW,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(16,86,224,0.10)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title: { fontSize: 13, fontWeight: '800', color: '#111827' },
  desc: { fontSize: 11.5, color: '#6B7280', lineHeight: 17 },
});
