// LegalLinksScreen: links to terms of service, privacy policy, and legal notices
import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';

const LINKS = [
  { label: 'Conditions Générales d\'Utilisation (CGU)', url: 'https://legal.primeo.ci/cgu/' },
  { label: 'Conditions Générales de Vente (CGV)', url: 'https://legal.primeo.ci/conditions-vente/' },
  { label: 'Conditions professionnels', url: 'https://legal.primeo.ci/professionnels/' },
  { label: 'Politique de confidentialité', url: 'https://legal.primeo.ci/confidentialite/' },
  { label: 'Mentions légales', url: 'https://legal.primeo.ci/mentions-legales/' },
  { label: 'Règlement intérieur', url: 'https://legal.primeo.ci/reglement-interieur/' },
  { label: 'Charte de protection des données (RGPD)', url: 'https://legal.primeo.ci/charte-donnees/' },
  { label: 'Litiges & Médiation', url: 'https://legal.primeo.ci/litiges-mediation/' },
  { label: 'Propriété intellectuelle', url: 'https://legal.primeo.ci/propriete-intellectuelle/' },
  { label: 'Signalement de contenus', url: 'https://legal.primeo.ci/signalement/' },
  { label: 'Charte de la communauté', url: 'https://legal.primeo.ci/charte-communaute/' },
  { label: 'Politique de parrainage', url: 'https://legal.primeo.ci/parrainage/' },
  { label: 'Avis juridique', url: 'https://legal.primeo.ci/disclaimer/' },
  { label: 'Tous les documents légaux', url: 'https://legal.primeo.ci/' },
];

export default function LegalLinksScreen() {
  return (
    <ScreenWrapper>
      <View style={styles.list}>
        {LINKS.map((link, i) => (
          <TouchableOpacity key={i} style={styles.item} onPress={() => Linking.openURL(link.url)}>
            <Text style={styles.text}>{link.label}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  text: { fontSize: 15, color: '#333' },
  arrow: { fontSize: 18, color: '#999' },
});
