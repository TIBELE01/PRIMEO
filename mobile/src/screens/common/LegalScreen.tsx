// LegalScreen: display legal document content in a scrollable view
import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';

export default function LegalScreen() {
  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mentions légales</Text>
        <Text style={styles.body}>Le contenu juridique complet sera chargé dynamiquement depuis le backend.</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#1056E0', marginBottom: 16 },
  body: { fontSize: 14, color: '#555', lineHeight: 22 },
});
