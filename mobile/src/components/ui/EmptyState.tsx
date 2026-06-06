// Empty state with icon, title, and optional CTA
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: string; // accepted but rendered as emoji prefix when provided
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, subtitle, icon, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} style={styles.btn} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#212121', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#757575', textAlign: 'center', marginBottom: 24 },
  btn: { minWidth: 160 },
});
