// SettingsScreen: app settings (language, notifications, theme)
import React from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { changeAppLanguage } from '../../i18n';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section} accessibilityRole="header">{t('profile.appearance', 'Apparence')}</Text>
        <ThemeToggle />
        <Text style={styles.section} accessibilityRole="header">{t('profile.language', 'Langue')}</Text>
        <LanguageSelector currentLang={i18n.language} onSelect={(lang) => { changeAppLanguage(lang); }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  section: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
});
