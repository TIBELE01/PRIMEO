/**
 * Lecteur vidéo de la fiche d'un bien.
 *  • Version allégée Cloudinary (1280 px, H.264) avec repli automatique sur le
 *    fichier d'origine, image d'aperçu pendant le chargement, message si échec.
 *  • Contrôles : lecture/pause, −10 s / +10 s, barre de progression (toucher ou
 *    glisser pour se positionner), temps écoulé / durée, son, plein écran.
 *  • Les contrôles s'affichent au toucher et se masquent seuls pendant la lecture.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet,
  ActivityIndicator, ImageBackground, PanResponder, type LayoutChangeEvent,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface Props {
  uri: string;
  fallbackUri?: string;
  posterUri?: string | null;
  isVisible: boolean;
  width: number;
  height: number;
}

const HIDE_DELAY_MS = 3000;

export function formatVideoTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function PropertyVideoPlayer({ uri, fallbackUri, posterUri, isVisible, width, height }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;                 // son coupé par défaut (autoplay)
    p.timeUpdateEventInterval = 0.25;
  });
  const viewRef = useRef<VideoView>(null);
  const usedFallback = useRef(false);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controls, setControls] = useState(true);
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const [trackW, setTrackW] = useState(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userPaused = useRef(false);

  // ── Événements du lecteur ──────────────────────────────────────────────────
  useEffect(() => {
    if (!player) return;
    const subs = [
      player.addListener('statusChange', ({ status: st }) => {
        if (st === 'readyToPlay') {
          setStatus('ready');
          try { setDuration(player.duration || 0); } catch { /* lecteur libéré */ }
        } else if (st === 'error') {
          if (fallbackUri && fallbackUri !== uri && !usedFallback.current) {
            usedFallback.current = true;
            try { player.replace(fallbackUri); setStatus('loading'); return; } catch { /* message ci-dessous */ }
          }
          setStatus('error');
        }
      }),
      player.addListener('playingChange', ({ isPlaying }) => setPlaying(isPlaying)),
      player.addListener('timeUpdate', ({ currentTime }) => {
        setTime(currentTime);
        try { if (player.duration && player.duration !== duration) setDuration(player.duration); } catch { /* no-op */ }
      }),
    ];
    return () => subs.forEach((s) => { try { s.remove(); } catch { /* déjà libéré */ } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, uri, fallbackUri]);

  // Lecture/pause selon la visibilité de la carte (sauf pause demandée par l'utilisateur)
  useEffect(() => {
    if (!player) return;
    try {
      if (isVisible && !userPaused.current) player.play();
      else if (!isVisible) player.pause();
    } catch { /* lecteur libéré pendant une transition */ }
  }, [isVisible, player]);

  // ── Affichage des contrôles ────────────────────────────────────────────────
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), HIDE_DELAY_MS);
  }, []);
  useEffect(() => {
    if (controls && playing && scrubbing === null) scheduleHide();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [controls, playing, scrubbing, scheduleHide]);

  const showControls = () => { setControls(true); scheduleHide(); };

  // ── Actions ────────────────────────────────────────────────────────────────
  const togglePlay = () => {
    try {
      if (playing) { userPaused.current = true; player.pause(); }
      else { userPaused.current = false; player.play(); }
    } catch { /* no-op */ }
    showControls();
  };
  const seekBy = (sec: number) => {
    try {
      const target = Math.max(0, Math.min((duration || 0) - 0.2, time + sec));
      player.currentTime = target;
      setTime(target);
    } catch { /* no-op */ }
    showControls();
  };
  const toggleMute = () => {
    const next = !muted;
    try { player.muted = next; } catch { /* no-op */ }
    setMuted(next);
    showControls();
  };
  const fullscreen = () => { viewRef.current?.enterFullscreen().catch(() => {}); };

  // ── Barre de progression : toucher / glisser pour se positionner ───────────
  const ratioFromX = (x: number) => Math.max(0, Math.min(1, x / trackW));
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => setScrubbing(e.nativeEvent.locationX),
    onPanResponderMove: (e) => setScrubbing(e.nativeEvent.locationX),
    onPanResponderRelease: (e) => commitSeek(e.nativeEvent.locationX),
    onPanResponderTerminate: () => setScrubbing(null),
  })).current;
  // commitSeek lit l'état courant via des refs (le PanResponder est créé une seule fois)
  const durRef = useRef(0); durRef.current = duration;
  const trackRef = useRef(1); trackRef.current = trackW;
  const commitSeek = (x: number) => {
    const r = Math.max(0, Math.min(1, x / trackRef.current));
    const target = r * (durRef.current || 0);
    try { player.currentTime = target; setTime(target); } catch { /* no-op */ }
    setScrubbing(null);
  };

  const progress = scrubbing !== null ? ratioFromX(scrubbing) : duration > 0 ? Math.min(1, time / duration) : 0;
  const shownTime = scrubbing !== null ? ratioFromX(scrubbing) * duration : time;

  return (
    <View style={[styles.wrap, { width, height }]}>
      <VideoView
        ref={viewRef}
        player={player}
        style={{ width, height }}
        nativeControls={false}
        contentFit="cover"
        allowsFullscreen
        accessibilityLabel="Vidéo de présentation du bien"
      />

      {/* Chargement / erreur avec image d'aperçu */}
      {status !== 'ready' && (
        <View style={styles.overlay} pointerEvents="none">
          {posterUri ? <ImageBackground source={{ uri: posterUri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          {status === 'loading'
            ? <ActivityIndicator size="large" color="#fff" />
            : <Text style={styles.error}>Vidéo momentanément indisponible</Text>}
        </View>
      )}

      {/* Zone de toucher : affiche / masque les contrôles */}
      {status === 'ready' && (
        <TouchableWithoutFeedback onPress={() => (controls ? setControls(false) : showControls())} accessibilityLabel="Afficher les commandes de la vidéo">
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      )}

      {status === 'ready' && controls && (
        <View style={styles.controls} pointerEvents="box-none">
          {/* Centre : −10 s / lecture-pause / +10 s */}
          <View style={styles.centerRow} pointerEvents="box-none">
            <TouchableOpacity style={styles.skipBtn} onPress={() => seekBy(-10)} accessibilityRole="button" accessibilityLabel="Reculer de 10 secondes" hitSlop={8}>
              <Text style={styles.skipIcon}>↺</Text><Text style={styles.skipText}>10</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playBtn} onPress={togglePlay} accessibilityRole="button" accessibilityLabel={playing ? 'Mettre en pause' : 'Lire la vidéo'} testID="video-play-toggle">
              <Text style={styles.playIcon}>{playing ? '❚❚' : '▶'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={() => seekBy(10)} accessibilityRole="button" accessibilityLabel="Avancer de 10 secondes" hitSlop={8}>
              <Text style={styles.skipIcon}>↻</Text><Text style={styles.skipText}>10</Text>
            </TouchableOpacity>
          </View>

          {/* Bas : temps, barre de progression, son, plein écran */}
          <View style={styles.bottomBar}>
            <Text style={styles.time} testID="video-time">{formatVideoTime(shownTime)}</Text>
            <View
              style={styles.trackHit}
              onLayout={(e: LayoutChangeEvent) => setTrackW(Math.max(1, e.nativeEvent.layout.width))}
              {...pan.panHandlers}
              accessibilityRole="adjustable"
              accessibilityLabel="Position de lecture"
              accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(time) }}
              testID="video-progress"
            >
              {/* pointerEvents none : la position du doigt est toujours mesurée sur la zone de la barre */}
              <View style={styles.track} pointerEvents="none">
                <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={[styles.thumb, { left: `${progress * 100}%` }]} pointerEvents="none" />
            </View>
            <Text style={styles.time}>{formatVideoTime(duration)}</Text>
            <TouchableOpacity onPress={toggleMute} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={muted ? 'Activer le son' : 'Couper le son'} hitSlop={8}>
              <Text style={styles.iconText}>{muted ? '🔇' : '🔊'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={fullscreen} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Plein écran" hitSlop={8}>
              <Text style={styles.iconText}>⛶</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Badge « Vidéo » (en bas à gauche, masqué quand la barre est affichée) */}
      {!(status === 'ready' && controls) && (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>▶ Vidéo</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#000', overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  error: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 24, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },

  controls: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.28)' },
  centerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  playBtn: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(16,86,224,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  playIcon: { color: '#fff', fontSize: 22, fontWeight: '800', marginLeft: 2 },
  skipBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  skipIcon: { color: '#fff', fontSize: 18, lineHeight: 20 },
  skipText: { color: '#fff', fontSize: 9, fontWeight: '800', marginTop: -2 },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.55)',
  },
  time: { color: '#fff', fontSize: 11.5, fontWeight: '600', minWidth: 32, textAlign: 'center', fontVariant: ['tabular-nums'] },
  trackHit: { flex: 1, height: 28, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  trackFill: { height: 4, backgroundColor: '#1056E0' },
  thumb: { position: 'absolute', width: 14, height: 14, borderRadius: 7, marginLeft: -7, backgroundColor: '#fff', top: 7 },
  iconBtn: { paddingHorizontal: 2 },
  iconText: { color: '#fff', fontSize: 16 },

  badge: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
});
