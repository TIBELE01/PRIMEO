import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: string;
}

const TREND_CONFIG = {
  up:      { icon: '↑', color: '#469A0E', bg: '#F3FCE8' },
  down:    { icon: '↓', color: '#D41313', bg: '#FEF2F2' },
  neutral: { icon: '→', color: '#64748B', bg: '#F1F5F9' },
};

export const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, trend, trendValue, icon }) => {
  const t = trend ? TREND_CONFIG[trend] : null;

  return (
    <View style={styles.card}>
      {icon && (
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {t && trendValue && (
        <View style={[styles.trendBadge, { backgroundColor: t.bg }]}>
          <Text style={[styles.trendTxt, { color: t.color }]}>{t.icon} {trendValue}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    flex: 1,
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: { fontSize: 22 },
  title: { fontSize: 12, color: '#64748B', fontWeight: '600', letterSpacing: 0.4, marginBottom: 4, textTransform: 'uppercase' },
  value: { fontSize: 26, fontWeight: '800', color: '#0F1729', marginBottom: 2 },
  subtitle: { fontSize: 12, color: '#94A3B8', marginBottom: 8 },
  trendBadge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  trendTxt: { fontSize: 12, fontWeight: '700' },
});
