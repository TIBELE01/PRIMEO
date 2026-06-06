import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { analyticsApi } from '../../../services/api/endpoints/analyticsApi';

interface OccupancyItem {
  id: string;
  title: string;
  propertyType: string;
  bookedDays: number;
  totalDays: number;
  occupancyRate: number;
}

const PERIODS = [
  { label: '30j', value: '30d' },
  { label: '90j', value: '90d' },
  { label: '1 an', value: '365d' },
];

export default function HotelStatsScreen() {
  const [data, setData] = useState<OccupancyItem[]>([]);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await analyticsApi.getOccupancyRate({ period });
      const all: OccupancyItem[] = res.data?.data ?? res.data ?? [];
      setData(all.filter((d) => d.propertyType === 'hotel'));
    } catch {
      setData([]);
    } finally {
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const avgOccupancy = data.length
    ? Math.round(data.reduce((s, d) => s + d.occupancyRate, 0) / data.length * 100)
    : 0;

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#1056E0']} tintColor="#1056E0" />}
      >
        <Text style={styles.screenTitle}>Statistiques Hôtel</Text>

        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <Text
              key={p.value}
              style={[styles.periodBtn, period === p.value && styles.periodBtnActive]}
              onPress={() => setPeriod(p.value)}
            >
              {p.label}
            </Text>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1056E0" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{avgOccupancy}%</Text>
                <Text style={styles.summaryLbl}>Taux d'occupation moyen</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{data.length}</Text>
                <Text style={styles.summaryLbl}>Hôtel{data.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            {data.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Aucune donnée disponible pour cette période.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Par établissement</Text>
                {data.map((item) => {
                  const pct = Math.round(item.occupancyRate * 100);
                  const color = pct >= 70 ? '#059669' : pct >= 40 ? '#D97706' : '#DC2626';
                  return (
                    <View key={item.id} style={styles.propertyCard}>
                      <Text style={styles.propertyTitle} numberOfLines={1}>{item.title}</Text>
                      <View style={styles.barRow}>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                        </View>
                        <Text style={[styles.barPct, { color }]}>{pct}%</Text>
                      </View>
                      <Text style={styles.propertyMeta}>
                        {item.bookedDays} j réservés / {item.totalDays} j total
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', fontSize: 13, fontWeight: '600', color: '#6B7280', overflow: 'hidden' },
  periodBtnActive: { backgroundColor: '#1056E0', color: '#fff' },
  summaryCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 28, fontWeight: '800', color: '#1056E0' },
  summaryLbl: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  propertyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  propertyTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barTrack: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barPct: { width: 36, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  propertyMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  empty: { padding: 30, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
