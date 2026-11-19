/**
 * VirtualTourScreen (web) — Visite virtuelle 3D immersive dans le navigateur.
 *
 * Contrairement à la version native (@react-three/fiber/native + expo-gl),
 * cette variante utilise Three.js « vanilla » directement sur un canvas DOM :
 * le navigateur fournit WebGL nativement, aucun stub n'est nécessaire.
 *
 * Interactions : glisser (souris/tactile) pour regarder autour, molette ou
 * pincement pour zoomer, chips en bas pour changer de pièce.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  SphereGeometry,
  MeshBasicMaterial,
  Mesh,
  TextureLoader,
  SRGBColorSpace,
  MathUtils,
  Texture,
  Vector3,
} from 'three';
import type { ClientScreenProps } from '@navigation/types';
import type { Panorama } from '../../../types/property';
import { optimizePanoramaUrl } from '../../../utils/panorama';

type Props = ClientScreenProps<'VirtualTour'>;

const MIN_FOV = 35;
const MAX_FOV = 95;
// lon = 180° ↔ centre de l'image équirectangulaire (= yaw 0 de Pannellum côté natif)
const CENTER_LON = 180;
const RAD2DEG = 180 / Math.PI;

/** Direction 3D d'un hotspot (theta = azimut rad, phi = angle polaire rad), même repère que Pannellum. */
function hotspotVector(theta: number, phi: number): Vector3 {
  const lon = MathUtils.degToRad((theta ?? 0) * RAD2DEG + CENTER_LON);
  const p = phi ?? Math.PI / 2;
  return new Vector3(500 * Math.sin(p) * Math.cos(lon), 500 * Math.cos(p), 500 * Math.sin(p) * Math.sin(lon));
}

export function VirtualTourScreen({ navigation, route }: Props) {
  // Garde défensif : params absents si navigation directe par URL
  const panoramas: Panorama[] = Array.isArray(route.params?.panoramas) ? route.params.panoramas : [];
  const propertyName = route.params?.propertyName ?? '';
  const initialIndex = Math.min(
    Math.max(route.params?.initialPanoramaIndex ?? 0, 0),
    Math.max(panoramas.length - 1, 0),
  );

  const [sceneIndex, setSceneIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const containerRef = useRef<View>(null);
  // Références Three.js persistantes entre les changements de scène
  const glRef = useRef<{
    renderer: WebGLRenderer;
    scene: Scene;
    camera: PerspectiveCamera;
    material: MeshBasicMaterial;
    frameId: number;
    maxWidth: number;
    hotspotLayer: HTMLDivElement;
    hotspots: { el: HTMLElement; vec: Vector3 }[];
  } | null>(null);
  const lookRef = useRef({ lon: CENTER_LON, lat: 0 });
  // Navigation depuis un hotspot DOM (fonction toujours à jour)
  const goToRef = useRef<(id: string) => void>(() => {});
  goToRef.current = (id: string) => {
    const idx = panoramas.findIndex(p => p.id === id);
    if (idx >= 0) setSceneIndex(idx);
  };

  // ── Initialisation du viewer (une seule fois) ───────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || panoramas.length === 0) return;
    // En React Native Web, la ref d'une View expose l'élément DOM sous-jacent
    const host = containerRef.current as unknown as HTMLElement | null;
    if (!host || typeof document === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none'; // gestes gérés manuellement
    canvas.style.cursor = 'grab';
    host.appendChild(canvas);

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true });
    } catch {
      canvas.remove();
      setError('Votre navigateur ne prend pas en charge la 3D (WebGL).');
      setLoading(false);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Texture bornée par la capacité GPU (et 4096 px max) : pas de texture géante
    const maxWidth = Math.min(4096, renderer.capabilities.maxTextureSize || 2048);

    // Calque DOM des hotspots (libellés cliquables projetés sur la sphère)
    const hotspotLayer = document.createElement('div');
    hotspotLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    host.appendChild(hotspotLayer);

    const scene = new Scene();
    const camera = new PerspectiveCamera(75, 1, 0.1, 1100);
    camera.position.set(0, 0, 0.1);

    // Sphère inversée : la texture équirectangulaire est plaquée à l'intérieur
    const geometry = new SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    const material = new MeshBasicMaterial();
    scene.add(new Mesh(geometry, material));

    glRef.current = { renderer, scene, camera, material, frameId: 0, maxWidth, hotspotLayer, hotspots: [] };
    const tmp = new Vector3();

    // ── Boucle de rendu : la caméra suit lon/lat ──────────────────────────────
    const animate = () => {
      const gl = glRef.current;
      if (!gl) return;
      const { lon, lat } = lookRef.current;
      const phi = MathUtils.degToRad(90 - lat);
      const theta = MathUtils.degToRad(lon);
      gl.camera.lookAt(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta),
      );
      gl.renderer.render(gl.scene, gl.camera);
      // Projection écran des hotspots ; masqués s'ils sont derrière la caméra
      if (gl.hotspots.length) {
        const w = host.clientWidth; const h = host.clientHeight;
        gl.camera.updateMatrixWorld();
        for (const hs of gl.hotspots) {
          tmp.copy(hs.vec).project(gl.camera);
          const visible = tmp.z < 1 && Math.abs(tmp.x) < 1.2 && Math.abs(tmp.y) < 1.2;
          hs.el.style.display = visible ? 'flex' : 'none';
          if (visible) hs.el.style.transform = `translate(${(tmp.x + 1) / 2 * w}px, ${(1 - tmp.y) / 2 * h}px) translate(-50%, -50%)`;
        }
      }
      gl.frameId = requestAnimationFrame(animate);
    };
    animate();

    // ── Redimensionnement ─────────────────────────────────────────────────────
    const resize = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(host);

    // ── Interactions : glisser pour regarder, molette pour zoomer ────────────
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pinchDist = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      // Sensibilité proportionnelle au fov : zoom serré = mouvement fin
      const k = camera.fov / 500;
      lookRef.current.lon -= (e.clientX - lastX) * k;
      lookRef.current.lat = Math.max(-85, Math.min(85, lookRef.current.lat + (e.clientY - lastY) * k));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerUp = () => {
      dragging = false;
      canvas.style.cursor = 'grab';
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, camera.fov + e.deltaY * 0.05));
      camera.updateProjectionMatrix();
    };
    // Pincement (deux doigts) pour zoomer sur tactile
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (pinchDist > 0) {
        camera.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, camera.fov + (pinchDist - dist) * 0.2));
        camera.updateProjectionMatrix();
      }
      pinchDist = dist;
    };
    const onTouchEnd = () => { pinchDist = 0; };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      observer?.disconnect();
      const gl = glRef.current;
      if (gl) cancelAnimationFrame(gl.frameId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      material.map?.dispose();
      material.dispose();
      geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss(); // libère immédiatement la mémoire GPU
      hotspotLayer.remove();
      canvas.remove();
      glRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Chargement de la texture à chaque changement de pièce ───────────────────
  useEffect(() => {
    const gl = glRef.current;
    const pano = panoramas[sceneIndex];
    if (!gl || !pano) return;

    setLoading(true);
    setError(null);
    let cancelled = false;

    const loader = new TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      optimizePanoramaUrl(pano.imageUrl, gl.maxWidth),
      (texture: Texture) => {
        if (cancelled) { texture.dispose(); return; }
        texture.colorSpace = SRGBColorSpace;
        gl.material.map?.dispose();
        gl.material.map = texture;
        gl.material.needsUpdate = true;
        // Réinitialise le regard au centre de la nouvelle pièce
        lookRef.current = { lon: CENTER_LON, lat: 0 };
        // Hotspots de navigation vers les autres pièces
        gl.hotspotLayer.innerHTML = '';
        const ids = new Set(panoramas.map(p => p.id));
        gl.hotspots = (pano.hotspots ?? [])
          .filter(hs => hs.targetPanoramaId && ids.has(hs.targetPanoramaId))
          .map(hs => {
            const el = document.createElement('button');
            el.type = 'button';
            el.setAttribute('data-hotspot', hs.targetPanoramaId);
            el.setAttribute('aria-label', hs.label || 'Pièce suivante');
            el.textContent = `➜ ${hs.label || 'Pièce suivante'}`;
            el.style.cssText = 'position:absolute;left:0;top:0;display:none;align-items:center;pointer-events:auto;cursor:pointer;'
              + 'background:rgba(16,86,224,.92);color:#fff;border:2px solid #fff;border-radius:999px;padding:7px 12px;'
              + 'font:600 13px system-ui,-apple-system,Roboto,sans-serif;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.35);';
            el.addEventListener('click', () => goToRef.current(hs.targetPanoramaId));
            gl.hotspotLayer.appendChild(el);
            return { el, vec: hotspotVector(hs.theta, hs.phi) };
          });
        gl.camera.fov = 75;
        gl.camera.updateProjectionMatrix();
        setLoading(false);
      },
      undefined,
      () => {
        if (!cancelled) {
          setError('Impossible de charger le panorama. Vérifiez votre connexion.');
          setLoading(false);
        }
      },
    );

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIndex, reloadKey]);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  // ── Aucun panorama : message explicite ───────────────────────────────────────
  if (panoramas.length === 0) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={goBack} accessibilityRole="button">
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.icon}>🔭</Text>
          <Text style={styles.title}>Visite virtuelle 360°</Text>
          <Text style={styles.sub}>Aucun panorama disponible pour ce bien.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Canvas Three.js monté dans cette View (DOM) */}
      <View ref={containerRef} style={StyleSheet.absoluteFill} />

      {/* Overlay de chargement */}
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Chargement du panorama…</Text>
        </View>
      )}
      {error && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.loadingText}>{error}</Text>
          {glRef.current && (
            <TouchableOpacity style={styles.retryBtn} onPress={() => setReloadKey(k => k + 1)} accessibilityRole="button">
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* En-tête */}
      <View style={styles.header} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={goBack} accessibilityRole="button" accessibilityLabel="Quitter la visite virtuelle">
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={styles.headerTitle} numberOfLines={1}>{propertyName}</Text>
          <Text style={styles.headerRoom} numberOfLines={1}>
            {panoramas[sceneIndex]?.roomName ?? ''} · Glissez pour explorer
          </Text>
        </View>
      </View>

      {/* Sélecteur de pièces */}
      {panoramas.length > 1 && (
        <View style={styles.chipsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {panoramas.map((p, i) => (
              <TouchableOpacity
                key={p.id ?? String(i)}
                style={[styles.chip, i === sceneIndex && styles.chipActive]}
                onPress={() => setSceneIndex(i)}
                accessibilityRole="button"
                accessibilityLabel={`Voir la pièce ${p.roomName}`}
                accessibilityState={{ selected: i === sceneIndex }}
              >
                <Text style={[styles.chipText, i === sceneIndex && styles.chipTextActive]}>
                  {p.roomName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', overflow: 'hidden' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  icon:      { fontSize: 56 },
  title:     { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sub:       { fontSize: 15, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
  back:      { padding: 20, paddingTop: 48 },
  backText:  { color: '#fff', fontSize: 16, fontWeight: '600' },

  loadingOverlay: {
    backgroundColor: 'rgba(11, 18, 32, 0.55)',
    alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 5,
  },
  loadingText: { color: '#E5E7EB', fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn:  { backgroundColor: '#1056E0', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 16, paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  titleWrap: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
  headerRoom:  { color: '#D1D5DB', fontSize: 12.5, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },

  chipsWrap: { position: 'absolute', bottom: 24, left: 0, right: 0, zIndex: 10 },
  chipsRow:  { paddingHorizontal: 16, gap: 8 },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 9,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  chipActive: { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  chipText:       { color: '#E5E7EB', fontSize: 13.5, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
});

export default VirtualTourScreen;
