/**
 * VirtualTourScreen — Visite virtuelle 360° (panoramas équirectangulaires).
 *
 * Implémentation robuste basée sur une WebView + Pannellum (rendu WebGL navigateur)
 * plutôt que sur @react-three/fiber/native + expo-gl, dont le pipeline de texture
 * natif s'avérait fragile sur appareil (échecs de chargement / GL).
 *
 *  • La WebView charge les images distantes comme un navigateur — CORS géré par
 *    l'hébergeur (Access-Control-Allow-Origin: *), aucun téléchargement manuel.
 *  • Pannellum gère nativement : rotation (drag), zoom (pinch/molette), multi-scènes
 *    et hotspots de navigation entre pièces.
 *  • Communication WebView → RN via postMessage : 'ready' | 'scene' | 'error'.
 *  • Aucune fuite : la WebView est démontée avec l'écran ; un re-essai recharge la page.
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet,
  Dimensions, PixelRatio,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ClientScreenProps } from '@navigation/types';
import { panoramaTargetWidth } from '../../../utils/panorama';
import { buildTourHtml } from './panoramaTourHtml';

const _targetWidth = panoramaTargetWidth(Dimensions.get('screen').width * PixelRatio.get());
const LOAD_TIMEOUT_MS = 25000;

type Props = ClientScreenProps<'VirtualTour'>;

export function VirtualTourScreen({ navigation, route }: Props) {
  const params = route.params ?? ({} as Props['route']['params']);
  const panoramas = Array.isArray(params.panoramas) ? params.panoramas : [];
  const propertyName = params.propertyName ?? 'Visite virtuelle';
  const initialPanoramaIndex = params.initialPanoramaIndex ?? 0;

  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(0, initialPanoramaIndex), Math.max(0, panoramas.length - 1)),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const webRef = useRef<WebView>(null);
  const currentPanorama = panoramas[currentIndex];
  const firstSceneId = currentPanorama?.id ?? '';

  // Garde-fou anti-blocage : bascule sur le repli si rien n'est prêt après le délai.
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => { setIsLoading(false); setLoadError(true); }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLoading, retryKey]);

  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    let msg: { type?: string; sceneId?: string } = {};
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (msg.type === 'ready') {
      setIsLoading(false);
      setLoadError(false);
    } else if (msg.type === 'error') {
      setIsLoading(false);
      setLoadError(true);
    } else if (msg.type === 'scene' && msg.sceneId) {
      const idx = panoramas.findIndex(p => p.id === msg.sceneId);
      if (idx >= 0) setCurrentIndex(idx);
    }
  }, [panoramas]);

  const goToScene = useCallback((index: number) => {
    const target = panoramas[index];
    if (!target) return;
    setCurrentIndex(index);
    webRef.current?.injectJavaScript(
      `window.__viewer && window.__viewer.loadScene(${JSON.stringify(target.id)}); true;`,
    );
  }, [panoramas]);

  const retry = useCallback(() => {
    setLoadError(false);
    setIsLoading(true);
    setRetryKey(k => k + 1); // remonte la WebView
  }, []);

  // Aucun panorama exploitable → écran de repli (pas de crash).
  if (!currentPanorama) {
    return (
      <SafeAreaView style={[styles.safe, styles.emptyWrap]} edges={['top']}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backArrow}>{'←'}</Text>
        </TouchableOpacity>
        <View style={styles.emptyContent}>
          <Text style={styles.emptyIcon}>🔭</Text>
          <Text style={styles.emptyTitle}>Visite indisponible</Text>
          <Text style={styles.emptyText}>
            Les panoramas de cette propriété ne sont pas disponibles pour le moment.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const html = buildTourHtml(panoramas, firstSceneId, _targetWidth);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backArrow}>{'←'}</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{propertyName}</Text>
          <Text style={styles.headerRoom} numberOfLines={1}>{currentPanorama.roomName ?? ''}</Text>
        </View>
        <View style={styles.roomCounter}>
          <Text style={styles.roomCounterText}>{currentIndex + 1}/{panoramas.length}</Text>
        </View>
      </View>

      {/* ── Panorama (WebView + Pannellum) ── */}
      <View style={styles.canvasWrap}>
        <WebView
          key={`tour-${retryKey}`}
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          androidLayerType="hardware"
          onMessage={handleMessage}
          onError={() => { setIsLoading(false); setLoadError(true); }}
          onHttpError={() => { setIsLoading(false); setLoadError(true); }}
          // Évite d'ouvrir des liens externes hors du viewer
          onShouldStartLoadWithRequest={(req) => req.url === 'about:blank' || req.url.startsWith('data:') || req.url.startsWith('about:')}
        />

        {/* Loading overlay */}
        {isLoading && !loadError && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#D67309" />
            <Text style={styles.loadingText}>Chargement de la visite…</Text>
          </View>
        )}

        {/* Error overlay (interactif — Réessayer) */}
        {loadError && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorIcon}>🛰️</Text>
            <Text style={styles.errorTitle}>Visite momentanément indisponible</Text>
            <Text style={styles.errorText}>
              Impossible de charger la visite 360°. Vérifiez votre connexion internet puis réessayez.
            </Text>
            <TouchableOpacity onPress={retry} style={styles.retryBtn} activeOpacity={0.85}>
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Room selector ── */}
      {panoramas.length > 1 && (
        <View style={styles.roomBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomList} bounces={false}>
            {panoramas.map((p, i) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, i === currentIndex && styles.chipActive]}
                onPress={() => goToScene(i)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, i === currentIndex && styles.chipTextActive]}>{p.roomName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },

  emptyWrap:    { paddingTop: 48 },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyIcon:    { fontSize: 56 },
  emptyTitle:   { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  emptyText:    { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 21 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.85)', gap: 10,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 26, color: '#fff', fontWeight: '300', lineHeight: 28 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: 0.2 },
  headerRoom: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  roomCounter: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  roomCounterText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  canvasWrap: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center', alignItems: 'center', gap: 14,
  },
  loadingText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },

  errorOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 10,
  },
  errorIcon:  { fontSize: 48 },
  errorTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  errorText:  { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  retryBtn:   { backgroundColor: '#D67309', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  roomBar: {
    backgroundColor: 'rgba(0,0,0,0.88)', paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  roomList: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  chipActive: { backgroundColor: '#D67309', borderColor: '#D67309' },
  chipText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#000', fontWeight: '700' },
});
