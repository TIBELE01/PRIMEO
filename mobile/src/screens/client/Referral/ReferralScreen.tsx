import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, Linking, Share, FlatList, Clipboard,
} from 'react-native';
import type { ClientScreenProps } from '../../../navigation/types';
import { referralsApi } from '../../../services/api/endpoints/referrals';
import { ReferralHistoryItem } from '../../../components/referral/ReferralHistoryItem';

interface ReferralCode {
  code: string;
  referralUrl: string;
}

interface ReferralStats {
  totalReferrals: number;
  rewardedCount: number;
  pendingCount: number;
  totalRewardsFcfa: number;
}

interface ReferralEntry {
  id: string;
  refereeName: string;
  joinedAt: string;
  earnedAmount: number;
  status: 'pending' | 'credited';
}

interface RewardEntry {
  id: string;
  amount: number;
  notes: string;
  earnedAt: string;
}

type ActiveTab = 'filleuls' | 'recompenses';
type Props = ClientScreenProps<'Referral'>;

export function ReferralScreen({ navigation }: Props) {
  const [codeData, setCodeData] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralEntry[]>([]);
  const [rewards, setRewards] = useState<RewardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('filleuls');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [codeRes, statsRes, histRes, rewardsRes] = await Promise.allSettled([
        referralsApi.getCode(),
        referralsApi.getStats(),
        referralsApi.listHistory(),
        referralsApi.listRewards(),
      ]);
      if (codeRes.status === 'fulfilled') {
        setCodeData(codeRes.value?.data?.data ?? codeRes.value?.data);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value?.data?.data ?? statsRes.value?.data);
      }
      if (histRes.status === 'fulfilled') {
        setHistory(histRes.value?.data?.data ?? histRes.value?.data ?? []);
      }
      if (rewardsRes.status === 'fulfilled') {
        setRewards(rewardsRes.value?.data?.data ?? rewardsRes.value?.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCopy = () => {
    if (!codeData?.code) return;
    Clipboard.setString(codeData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareMessage = codeData
    ? `Rejoins PRIMEO avec mon code ${codeData.code} et bénéficie d'une réduction sur ta première réservation !\n${codeData.referralUrl}`
    : '';

  const handleShareNative = async () => {
    if (!shareMessage) return;
    await Share.share({ message: shareMessage, title: 'Inviter sur PRIMEO' });
  };

  const handleShareWhatsApp = async () => {
    if (!shareMessage) return;
    const url = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp non installé', 'Veuillez installer WhatsApp pour partager.');
    }
  };

  const handleShareSMS = async () => {
    if (!shareMessage) return;
    const url = `sms:?body=${encodeURIComponent(shareMessage)}`;
    await Linking.openURL(url);
  };

  const handleShareEmail = async () => {
    if (!shareMessage) return;
    const url = `mailto:?subject=${encodeURIComponent('Rejoins PRIMEO !')}&body=${encodeURIComponent(shareMessage)}`;
    await Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><Text style={styles.title}>Parrainage</Text></View>
        <View style={styles.centered}><ActivityIndicator size="large" color="#1056E0" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Parrainage</Text>
          <Text style={styles.subtitle}>Invitez vos proches et gagnez des récompenses</Text>
        </View>

        {/* Reward info card */}
        <View style={styles.rewardCard}>
          <Text style={styles.rewardAmount}>2 000 FCFA</Text>
          <Text style={styles.rewardLabel}>par filleul après sa première réservation</Text>
        </View>

        {/* Code card */}
        {codeData && (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Votre code de parrainage</Text>
            <View style={styles.codeRow}>
              <Text style={styles.code}>{codeData.code}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                <Text style={styles.copyBtnText}>{copied ? '✓ Copié' : 'Copier'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats.totalReferrals}</Text>
              <Text style={styles.statLbl}>Filleuls</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats.rewardedCount}</Text>
              <Text style={styles.statLbl}>Récompensés</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: '#1056E0' }]}>{stats.totalRewardsFcfa.toLocaleString()}</Text>
              <Text style={styles.statLbl}>FCFA gagnés</Text>
            </View>
          </View>
        )}

        {/* Share buttons */}
        <Text style={styles.sectionTitle}>Partager</Text>
        <View style={styles.shareGrid}>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#25D366' }]} onPress={handleShareWhatsApp}>
            <Text style={styles.shareBtnIcon}>💬</Text>
            <Text style={styles.shareBtnLabel}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#2563EB' }]} onPress={handleShareSMS}>
            <Text style={styles.shareBtnIcon}>📱</Text>
            <Text style={styles.shareBtnLabel}>SMS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#DC2626' }]} onPress={handleShareEmail}>
            <Text style={styles.shareBtnIcon}>✉️</Text>
            <Text style={styles.shareBtnLabel}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#1056E0' }]} onPress={handleShareNative}>
            <Text style={styles.shareBtnIcon}>📤</Text>
            <Text style={styles.shareBtnLabel}>Autre</Text>
          </TouchableOpacity>
        </View>

        {/* History tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'filleuls' && styles.tabActive]}
            onPress={() => setActiveTab('filleuls')}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabLabel, activeTab === 'filleuls' && styles.tabLabelActive]}>
              Filleuls
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recompenses' && styles.tabActive]}
            onPress={() => setActiveTab('recompenses')}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabLabel, activeTab === 'recompenses' && styles.tabLabelActive]}>
              Récompenses {rewards.length > 0 ? `(${rewards.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'filleuls' ? (
          history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>Aucun filleul pour le moment. Partagez votre code !</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {history.map(entry => (
                <ReferralHistoryItem
                  key={entry.id}
                  refereeName={entry.refereeName}
                  joinedAt={new Date(entry.joinedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  earnedAmount={entry.earnedAmount}
                  status={entry.status}
                />
              ))}
            </View>
          )
        ) : (
          rewards.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>Aucune récompense reçue pour le moment.</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {rewards.map((reward) => (
                <View key={reward.id} style={styles.rewardItem}>
                  <View style={styles.rewardIconWrap}>
                    <Text style={styles.rewardIcon}>🎉</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rewardItemAmount}>+{reward.amount.toLocaleString('fr-CI')} FCFA</Text>
                    <Text style={styles.rewardItemNote} numberOfLines={1}>{reward.notes ?? 'Récompense parrainage'}</Text>
                  </View>
                  <Text style={styles.rewardItemDate}>
                    {reward.earnedAt
                      ? new Date(reward.earnedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                      : '—'}
                  </Text>
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rewardCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: '#F0FDF4',
    borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#A7F3D0',
  },
  rewardAmount: { fontSize: 36, fontWeight: '900', color: '#1056E0' },
  rewardLabel: { fontSize: 14, color: '#065F46', marginTop: 4, textAlign: 'center' },
  codeCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff',
    borderRadius: 14, padding: 18, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
  },
  codeLabel: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { fontSize: 28, fontWeight: '900', color: '#1056E0', letterSpacing: 4 },
  copyBtn: { backgroundColor: '#1056E0', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  copyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 20, gap: 10 },
  statBox: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statLbl: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginHorizontal: 16, marginBottom: 12, marginTop: 4 },
  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 16, marginBottom: 20 },
  shareBtn: { flex: 1, minWidth: '44%', borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 },
  shareBtnIcon: { fontSize: 22 },
  shareBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyHistory: { marginHorizontal: 16, padding: 20, backgroundColor: '#F9FAFB', borderRadius: 12, alignItems: 'center' },
  emptyHistoryText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center' },
  historyList: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },

  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#F3F4F6', borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  tabLabelActive: { color: '#1056E0' },

  rewardItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rewardIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  rewardIcon: { fontSize: 18 },
  rewardItemAmount: { fontSize: 15, fontWeight: '700', color: '#059669' },
  rewardItemNote: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  rewardItemDate: { fontSize: 12, color: '#6B7280' },
});
