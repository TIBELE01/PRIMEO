import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { useProTheme } from '../../../hooks/useProTheme';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { statusStyle } from './propertyStatus';

// ── Écran principal ──────────────────────────────────────────────────────────

export default function PropertyManagementScreen({ navigation, route }: any) {
  const theme = useProTheme();
  const propertyId: string = route?.params?.propertyId;

  const [property, setProperty] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    visible: boolean; action: 'publish' | 'suspend' | 'delete' | null;
  }>({ visible: false, action: null });

  const load = useCallback(async () => {
    // Garde : sans identifiant valide, inutile d'appeler /properties/undefined.
    if (!propertyId) {
      setIsLoading(false);
      setErrorMsg('Annonce introuvable (identifiant manquant).');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [propRes, statsRes] = await Promise.allSettled([
        propertiesApi.getById(propertyId),
        propertiesApi.getStats(propertyId),
      ]);
      if (propRes.status === 'fulfilled') {
        setProperty(propRes.value.data?.data ?? propRes.value.data);
      } else {
        setErrorMsg("Impossible de charger l'annonce.");
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data ?? statsRes.value.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  // Recharger chaque fois que l'écran reprend le focus (après modification, etc.)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doAction = async (action: 'publish' | 'suspend' | 'delete') => {
    setConfirm({ visible: false, action: null });
    setIsBusy(true);
    setErrorMsg(null);
    try {
      if (action === 'publish') {
        await propertiesApi.publish(propertyId);
      } else if (action === 'suspend') {
        await propertiesApi.suspend(propertyId);
      } else if (action === 'delete') {
        await propertiesApi.delete(propertyId);
        // Suppression réussie : revenir à la liste si une route précédente
        // existe. canGoBack() évite l'exception « no route to go back to »
        // qui, non gardée, était capturée et affichée comme un faux échec.
        if (navigation.canGoBack()) navigation.goBack();
        return;
      }
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? 'Une erreur est survenue';
      setErrorMsg(msg);
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMsg ?? "Annonce introuvable."}</Text>
          <TouchableOpacity style={[styles.retryBtn, { borderColor: theme.primary }]} onPress={load}>
            <Text style={[styles.retryBtnText, { color: theme.primary }]}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = statusStyle(property.status);
  const imageUrl = property.mainImageUrl ?? property.images?.[0]?.url ?? property.media?.[0]?.url;
  const canPublish  = ['draft', 'rejected', 'suspended'].includes(property.status);
  const canSuspend  = property.status === 'active';
  const isPending   = property.status === 'pending';

  const confirmConfig = {
    publish: {
      title: 'Soumettre pour validation',
      message: 'Votre annonce sera transmise à notre équipe pour approbation. Vous serez notifié dès sa mise en ligne.',
      confirmLabel: 'Soumettre',
      confirmColor: '#059669',
    },
    suspend: {
      title: 'Suspendre l\'annonce',
      message: 'L\'annonce ne sera plus visible par les clients. Vous pourrez la réactiver à tout moment.',
      confirmLabel: 'Suspendre',
      confirmColor: '#D97706',
    },
    delete: {
      title: 'Supprimer l\'annonce',
      message: `Voulez-vous vraiment supprimer "${property.title ?? property.name}" ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer définitivement',
      confirmColor: '#DC2626',
    },
  };

  const activeConfirm = confirm.action ? confirmConfig[confirm.action] : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Aperçu de l'annonce */}
        <View style={styles.previewCard}>
          {imageUrl
            ? <Image source={{ uri: imageUrl }} style={styles.previewImage} />
            : <View style={[styles.previewImage, styles.previewFallback]}><Text style={styles.previewEmoji}>🏠</Text></View>
          }
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle} numberOfLines={2}>{property.title ?? property.name}</Text>
            <Text style={styles.previewCity}>{property.city}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        {/* Mini tableau de bord de l'annonce */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.primary }]}>{stats.viewsCount ?? 0}</Text>
                <Text style={styles.statLabel}>Vues</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#059669' }]}>{stats.bookingsCount ?? 0}</Text>
                <Text style={styles.statLabel}>Réservations</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#7C3AED' }]}>
                  {stats.netRevenue != null ? `${Math.round(stats.netRevenue).toLocaleString('fr-CI')}` : '—'}
                </Text>
                <Text style={styles.statLabel}>Revenu net (FCFA)</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                  {stats.rating ? stats.rating.toFixed(1) : '—'}
                </Text>
                <Text style={styles.statLabel}>Note ⭐</Text>
              </View>
            </View>
          </View>
        )}

        {/* Message d'erreur */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{errorMsg}</Text>
          </View>
        )}

        {/* Message informatif si en attente */}
        {isPending && (
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              ⏳ Cette annonce est en cours de validation par notre équipe. Vous serez notifié dès son approbation.
            </Text>
          </View>
        )}

        {/* Actions */}
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.primary }]}
          onPress={() => navigation.navigate('EditProperty', { propertyId })}
          disabled={isBusy}
        >
          <Text style={styles.actionIcon}>✏️</Text>
          <View style={styles.actionTextBlock}>
            <Text style={[styles.actionLabel, { color: theme.primary }]}>Modifier les détails</Text>
            <Text style={styles.actionDesc}>Modifier les informations, photos, tarifs…</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        {(property?.mediaType === 'threed' || property?.hasVirtualTour) && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: theme.primary }]}
            onPress={() => navigation.navigate('Scene3dEditor', { propertyId })}
            disabled={isBusy}
          >
            <Text style={styles.actionIcon}>🥽</Text>
            <View style={styles.actionTextBlock}>
              <Text style={[styles.actionLabel, { color: theme.primary }]}>Visite 3D & navigation</Text>
              <Text style={styles.actionDesc}>Renommer les pièces, ajouter des liens entre elles</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        )}

        {canPublish && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#059669' }]}
            onPress={() => setConfirm({ visible: true, action: 'publish' })}
            disabled={isBusy}
          >
            <Text style={styles.actionIcon}>🚀</Text>
            <View style={styles.actionTextBlock}>
              <Text style={[styles.actionLabel, { color: '#059669' }]}>
                {property.status === 'suspended' ? 'Réactiver l\'annonce' : 'Soumettre pour validation'}
              </Text>
              <Text style={styles.actionDesc}>Envoyer l&apos;annonce à l&apos;équipe de modération</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        )}

        {canSuspend && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#D97706' }]}
            onPress={() => setConfirm({ visible: true, action: 'suspend' })}
            disabled={isBusy}
          >
            <Text style={styles.actionIcon}>⏸️</Text>
            <View style={styles.actionTextBlock}>
              <Text style={[styles.actionLabel, { color: '#D97706' }]}>Suspendre l&apos;annonce</Text>
              <Text style={styles.actionDesc}>Masquer temporairement votre annonce aux clients</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDanger]}
          onPress={() => setConfirm({ visible: true, action: 'delete' })}
          disabled={isBusy}
        >
          <Text style={styles.actionIcon}>🗑️</Text>
          <View style={styles.actionTextBlock}>
            <Text style={[styles.actionLabel, { color: '#DC2626' }]}>Supprimer l&apos;annonce</Text>
            <Text style={styles.actionDesc}>Action irréversible — toutes les données seront perdues</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        {isBusy && (
          <View style={styles.busyOverlay}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}

      </ScrollView>

      {activeConfirm && (
        <ConfirmModal
          visible={confirm.visible}
          title={activeConfirm.title}
          message={activeConfirm.message}
          confirmLabel={activeConfirm.confirmLabel}
          confirmColor={activeConfirm.confirmColor}
          onConfirm={() => doAction(confirm.action!)}
          onCancel={() => setConfirm({ visible: false, action: null })}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },

  previewCard: {
    backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row',
    overflow: 'hidden', elevation: 2, marginBottom: 4,
  },
  previewImage:    { width: 100, height: 100 },
  previewFallback: { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  previewEmoji:    { fontSize: 36 },
  previewInfo: { flex: 1, padding: 12, gap: 6 },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  previewCity:  { fontSize: 12, color: '#6B7280' },
  statusBadge:  { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText:   { fontSize: 12, fontWeight: '700' },

  errorText:   { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  retryBtn:    { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText:{ fontWeight: '700', fontSize: 14 },

  errorBox:     { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12 },
  errorBoxText: { fontSize: 13, color: '#DC2626' },

  infoBox:     { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12 },
  infoBoxText: { fontSize: 13, color: '#92400E', lineHeight: 18 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },

  actionBtn: {
    backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 12,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  actionBtnDanger: { borderColor: '#DC2626' },
  actionIcon:  { fontSize: 24 },
  actionTextBlock: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '700' },
  actionDesc:  { fontSize: 12, color: '#6B7280', marginTop: 2 },
  actionArrow: { fontSize: 20, color: '#9CA3AF', fontWeight: '700' },

  busyOverlay: { alignItems: 'center', paddingVertical: 20 },

  statsCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    gap: 10,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },
});
