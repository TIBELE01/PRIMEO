// LanguageSelector: dropdown to switch app language (fr / en)
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const LANGS = [{ code: 'fr', label: '🇫🇷 Français' }, { code: 'en', label: '🇬🇧 English' }];

interface LanguageSelectorProps {
  currentLang: string;
  onSelect: (lang: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLang, onSelect }) => {
  return (
    <View style={styles.container}>
      {LANGS.map(lang => (
        <TouchableOpacity
          key={lang.code}
          style={[styles.btn, currentLang === lang.code && styles.active]}
          onPress={() => onSelect(lang.code)}
          accessibilityRole="button"
          accessibilityLabel={lang.label}
          accessibilityState={{ selected: currentLang === lang.code }}
        >
          <Text style={[styles.text, currentLang === lang.code && styles.activeText]}>{lang.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8 },
  btn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  active: { borderColor: '#1056E0', backgroundColor: '#EFF5FF' },
  text: { fontSize: 13, color: '#555' },
  activeText: { color: '#1056E0', fontWeight: '600' },
});
