// SettingsScreen: app settings (language, notifications, theme)
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { LanguageSelector } from '../../components/common/LanguageSelector';

export default function SettingsScreen() {
  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Apparence</Text>
        <ThemeToggle />
        <Text style={styles.section}>Langue</Text>
        <LanguageSelector currentLang="fr" onSelect={() => {}} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  section: { fontSize: 13, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
});
