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
 *  • Pannellum est embarqué dans l'app (aucun CDN) ; les panoramas sont livrés
 *    redimensionnés/compressés par Cloudinary (texture ≤ 2048/4096 px).
 *  • Le HTML n'est généré qu'une fois par montage : changer de pièce n'entraîne
 *    plus de rechargement complet de la WebView (navigation fluide, pas de pic mémoire).
 *  • Fermeture : destruction explicite du viewer + perte volontaire du contexte WebGL
 *    (libère la mémoire GPU), puis démontage de la WebView.
 *  • Crash du moteur web (mémoire) : rechargement automatique au lieu d'un crash app.
 */
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
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
const LOAD_TIMEOUT_MS = 30000;
const SCENE_TIMEOUT_MS = 25000;
const DESTROY_JS = 'window.__destroyTour && window.__destroyTour(); true;';

type Props = ClientScreenProps<'VirtualTour'>;

export function VirtualTourScreen({ navigation, route }: Props) {
  const params = route.params ?? ({} as Props['route']['params']);
  const panoramas = useMemo(
    () => (Array.isArray(params.panoramas) ? params.panoramas : []).filter(p => p && p.id && p.imageUrl),
    [params.panoramas],
  );
  const propertyName = params.propertyName ?? 'Visite virtuelle';
  const initialPanoramaIndex = params.initialPanoramaIndex ?? 0;

  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(0, initialPanoramaIndex), Math.max(0, panoramas.length - 1)),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [closing, setClosing] = useState(false);

  const webRef = useRef<WebView>(null);
  const indexRef = useRef(currentIndex);
  indexRef.current = currentIndex;
  const currentPanorama = panoramas[currentIndex];

  // HTML figé par montage/réessai : la pièce de départ est celle affichée au moment
  // du (re)chargement ; les changements de pièce passent ensuite par injectJavaScript.
  const html = useMemo(() => {
    const start = panoramas[indexRef.current] ?? panoramas[0];
    return start ? buildTourHtml(panoramas, start.id, _targetWidth) : '';
  }, [panoramas, retryKey]);

  // Garde-fou anti-blocage : bascule sur le repli si rien n'est prêt après le délai.
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => { setIsLoading(false); setLoadError(true); }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLoading, retryKey]);

  useEffect(() => {
    if (!sceneLoading) return;
    const t = setTimeout(() => { setSceneLoading(false); setSceneError(true); }, SCENE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [sceneLoading]);

  // Libération GPU à la fermeture (retour, geste, navigation) puis démontage de la WebView.
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      webRef.current?.injectJavaScript(DESTROY_JS);
      setClosing(true);
    });
    return () => {
      unsub();
      webRef.current?.injectJavaScript(DESTROY_JS);
    };
  }, [navigation]);

  const syncIndex = useCallback((sceneId?: string) => {
    if (!sceneId) return;
    const idx = panoramas.findIndex(p => p.id === sceneId);
    if (idx >= 0) setCurrentIndex(idx);
  }, [panoramas]);

  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    let msg: { type?: string; sceneId?: string } = {};
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    switch (msg.type) {
      case 'ready':
        setIsLoading(false); setLoadError(false); setSceneLoading(false); setSceneError(false);
        syncIndex(msg.sceneId);
        break;
      case 'error':
        setIsLoading(false); setSceneLoading(false); setLoadError(true);
        break;
      case 'scenechange':
        setSceneError(false); setSceneLoading(true); syncIndex(msg.sceneId);
        break;
      case 'sceneloaded':
        setSceneLoading(false); setSceneError(false); syncIndex(msg.sceneId);
        break;
      case 'sceneerror':
        setSceneLoading(false); setSceneError(true); syncIndex(msg.sceneId);
        break;
    }
  }, [syncIndex]);

  const goToScene = useCallback((index: number) => {
    const target = panoramas[index];
    if (!target) return;
    setCurrentIndex(index);
    setSceneError(false);
    if (isLoading) return; // la pièce sera prise en compte au prochain (re)chargement
    setSceneLoading(true);
    webRef.current?.injectJavaScript(
      `window.__goScene && window.__goScene(${JSON.stringify(target.id)}); true;`,
    );
  }, [panoramas, isLoading]);

  const retry = useCallback(() => {
    setLoadError(false);
    setSceneError(false);
    setSceneLoading(false);
    setIsLoading(true);
    setRetryKey(k => k + 1); // remonte la WebView sur la pièce courante
  }, []);

  const retryScene = useCallback(() => goToScene(indexRef.current), [goToScene]);

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
        {!closing && <WebView
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
          setSupportMultipleWindows={false}
          // Moteur web tué par le système (mémoire) : on recharge au lieu de laisser l'app planter.
          onContentProcessDidTerminate={retry}
          onRenderProcessGone={() => { retry(); }}
        />}

        {/* Changement de pièce en cours (non bloquant) */}
        {sceneLoading && !isLoading && !loadError && (
          <View style={styles.sceneLoading} pointerEvents="none">
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.sceneLoadingText}>Chargement de la pièce…</Text>
          </View>
        )}

        {/* Échec d'une pièce : le reste de la visite reste utilisable */}
        {sceneError && !loadError && (
          <View style={styles.sceneErrorBox}>
            <Text style={styles.sceneErrorText}>Impossible d'afficher « {currentPanorama.roomName} ».</Text>
            <TouchableOpacity onPress={retryScene} style={styles.sceneRetryBtn} activeOpacity={0.85}>
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

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

  sceneLoading: {
    position: 'absolute', top: 14, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  sceneLoadingText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sceneErrorBox: {
    position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(17,17,17,0.94)', borderRadius: 14, padding: 12,
  },
  sceneErrorText: { flex: 1, color: '#fff', fontSize: 13, lineHeight: 18 },
  sceneRetryBtn: { backgroundColor: '#D67309', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },

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
