import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { PropertyOwner } from '@/types/property';
import { num } from '@/utils/normalizeProperty';

interface Props { owner: PropertyOwner; }

export function HostSection({ owner }: Props) {
  const fullName = `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() || 'Hôte';
  const initial = owner.firstName?.[0] ?? '?';

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          {owner.avatarUrl ? (
            <Image source={{ uri: owner.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          {owner.isSuperHost && (
            <View style={styles.superHostBadge}>
              <Text style={styles.superHostBadgeText}>⭐</Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{fullName}</Text>
          {owner.isSuperHost && <Text style={styles.superHost}>Super Hôte</Text>}
          {owner.memberSince && (
            <Text style={styles.since}>Membre depuis {new Date(owner.memberSince).getFullYear()}</Text>
          )}
          <View style={styles.stats}>
            {owner.totalReviews != null && (
              <View style={styles.stat}>
                <Text style={styles.statNum}>{owner.totalReviews}</Text>
                <Text style={styles.statLabel}>Avis</Text>
              </View>
            )}
            {owner.overallRating != null && (
              <View style={styles.stat}>
                <Text style={styles.statNum}>★ {num(owner.overallRating).toFixed(1)}</Text>
                <Text style={styles.statLabel}>Note</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 14 },
  card: { flexDirection: 'row', gap: 14, backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { backgroundColor: '#1056E0', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#fff', fontSize: 24, fontWeight: '700' },
  superHostBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#fff', borderRadius: 10, padding: 2 },
  superHostBadgeText: { fontSize: 14 },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  superHost: { fontSize: 12, color: '#D67309', fontWeight: '600', marginTop: 2 },
  since: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 8 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#9CA3AF' },
});
