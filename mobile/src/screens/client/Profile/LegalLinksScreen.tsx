// LegalLinksScreen: links to terms of service, privacy policy, and legal notices
import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';

const LINKS = [
  { label: 'Conditions générales d\'utilisation', url: 'https://primeo.ci/legal/cgu' },
  { label: 'Politique de confidentialité', url: 'https://primeo.ci/legal/confidentialite' },
  { label: 'Mentions légales', url: 'https://primeo.ci/legal/mentions-legales' },
  { label: 'Conditions de vente & remboursement', url: 'https://primeo.ci/legal/conditions-vente' },
  { label: 'Conditions professionnels', url: 'https://primeo.ci/legal/professionnels' },
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
