// ThemeToggle: switch between light and dark theme
import React from 'react';
import { Switch, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();
  const isDark = themeMode === 'dark';
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{isDark ? '🌙 Sombre' : '☀️ Clair'}</Text>
      <Switch
        value={isDark}
        onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')}
        trackColor={{ true: '#1056E0' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 14, color: '#333' },
});
