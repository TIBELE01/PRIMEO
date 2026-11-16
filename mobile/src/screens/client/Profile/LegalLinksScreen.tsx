// LegalLinksScreen: links to terms of service, privacy policy, and legal notices
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { legalUrl, openExternal } from '../../../constants/externalLinks';

const LINKS = [
  { label: 'Conditions Générales d\'Utilisation (CGU)', url: legalUrl('cgu/') },
  { label: 'Conditions Générales de Vente (CGV)', url: legalUrl('conditions-vente/') },
  { label: 'Conditions professionnels', url: legalUrl('professionnels/') },
  { label: 'Politique de confidentialité', url: legalUrl('confidentialite/') },
  { label: 'Mentions légales', url: legalUrl('mentions-legales/') },
  { label: 'Règlement intérieur', url: legalUrl('reglement-interieur/') },
  { label: 'Charte de protection des données (RGPD)', url: legalUrl('charte-donnees/') },
  { label: 'Litiges & Médiation', url: legalUrl('litiges-mediation/') },
  { label: 'Propriété intellectuelle', url: legalUrl('propriete-intellectuelle/') },
  { label: 'Signalement de contenus', url: legalUrl('signalement/') },
  { label: 'Charte de la communauté', url: legalUrl('charte-communaute/') },
  { label: 'Politique de parrainage', url: legalUrl('parrainage/') },
  { label: 'Avis juridique', url: legalUrl('disclaimer/') },
  { label: 'Tous les documents légaux', url: legalUrl('') },
];

export default function LegalLinksScreen() {
  return (
    <ScreenWrapper>
      <View style={styles.list}>
        {LINKS.map((link, i) => (
          <TouchableOpacity key={i} style={styles.item} onPress={() => openExternal(link.url)}>
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
