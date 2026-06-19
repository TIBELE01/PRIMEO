/**
 * VirtualTourScreen — Visite virtuelle 3D immersive (panorama 360°)
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  DEVELOPMENT BUILD REQUIS — Incompatible avec Expo Go          ║
 * ║                                                                      ║
 * ║  Ce composant utilise @react-three/fiber/native qui nécessite du    ║
 * ║  code natif compilé. Il ne fonctionnera pas dans Expo Go.           ║
 * ║                                                                      ║
 * ║  Build de développement :                                            ║
 * ║    eas build --profile development --platform ios                   ║
 * ║    eas build --profile development --platform android               ║
 * ║  Puis lancer l'app :                                                 ║
 * ║    expo start --dev-client                                           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Architecture :
 *  • Sphère Three.js inversée (scale x=-1) avec texture équirectangulaire
 *    2:1 optimisée via Supabase Image Transform (résolution adaptée à l'écran).
 *  • La caméra reste à l'origine ; yawRef/pitchRef sont mis à jour par le
 *    PanGesture et consommés dans useFrame (CameraController).
 *  • FovController lit fovRef chaque frame et met à jour camera.fov (zoom pinch).
 *  • Les hotspots sont des mesh sphériques pulsants. Taps détectés par
 *    raycasting dans useFrame via pendingTapRef (cross-renderer safe).
 *    Raycaster et Vector2 sont alloués une fois au niveau module (pas de GC/frame).
 *  • Texture disposée à l'unmount pour libérer la VRAM entre les pièces.
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  Suspense,
  MutableRefObject,
} from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Dimensions, PixelRatio, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber/native';
import {
  TextureLoader,
  BackSide,
  EquirectangularReflectionMapping,
  Raycaster,
  Vector2,
  Mesh,
} from 'three';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import type { ClientScreenProps } from '@navigation/types';
import type { Panorama, PanoramaHotspot } from '@/types/property';
import {
  DEFAULT_FOV,
  clampFov,
  panoramaTargetWidth,
  optimizePanoramaUrl,
} from '../../../utils/panorama';

// ── Constants ─────────────────────────────────────────────────────────────────

const SPHERE_RADIUS = 500;
const HOTSPOT_RADIUS = 8;
const HOTSPOT_DISTANCE = 220;
const SENSITIVITY = 0.003;
const MAX_PITCH = Math.PI / 2 - 0.05; // clamp ~85° to avoid gimbal lock
const TAP_SLOP = 8;                    // px movement threshold tap vs pan
const DRAG_HINT_MS = 3000;            // ms before hint auto-dismisses

// Module-level — allocated once, reused every frame (no per-frame GC pressure)
const _raycaster = new Raycaster();
const _tapVec = new Vector2();

// Adaptive texture width — computed once at module load from physical screen pixels
const _targetWidth = panoramaTargetWidth(
  Dimensions.get('screen').width * PixelRatio.get(),
);

// ── CameraController ──────────────────────────────────────────────────────────
// Reads yaw/pitch refs on every frame and updates camera lookAt.
// Runs inside Canvas (fiber renderer) — refs are plain JS objects, safe to share.

interface CameraControllerProps {
  yawRef: MutableRefObject<number>;
  pitchRef: MutableRefObject<number>;
}

function CameraController({ yawRef, pitchRef }: CameraControllerProps) {
  useFrame(({ camera }) => {
    const yaw = yawRef.current;
    const pitch = pitchRef.current;
    // Spherical → Cartesian lookAt direction
    const x = Math.cos(pitch) * Math.sin(yaw);
    const y = Math.sin(pitch);
    const z = Math.cos(pitch) * Math.cos(yaw);
    camera.position.set(0, 0, 0);
    camera.lookAt(x, y, z);
  });
  return null;
}

// ── FovController ─────────────────────────────────────────────────────────────
// Syncs camera FOV from fovRef each frame for pinch-to-zoom.
// Only calls updateProjectionMatrix when the value actually changed.

interface FovControllerProps {
  fovRef: MutableRefObject<number>;
}

function FovController({ fovRef }: FovControllerProps) {
  const { camera } = useThree();
  const prevFovRef = useRef(DEFAULT_FOV);

  useFrame(() => {
    const fov = fovRef.current;
    if (prevFovRef.current !== fov) {
      prevFovRef.current = fov;
      (camera as any).fov = fov;
      (camera as any).updateProjectionMatrix();
    }
  });
  return null;
}

// ── PanoramaSphere ────────────────────────────────────────────────────────────
// Loads the equirectangular texture (suspends until ready) and renders it
// inside a reversed sphere (scale x=-1 flips face winding, BackSide redundant
// but kept for clarity).
// Disposes texture on unmount to free GPU VRAM when navigating between rooms.

interface PanoramaSphereProps {
  url: string;
  onLoadedRef: MutableRefObject<(() => void) | null>;
}

function PanoramaSphere({ url, onLoadedRef }: PanoramaSphereProps) {
  const texture = useLoader(TextureLoader, url);

  useEffect(() => {
    texture.mapping = EquirectangularReflectionMapping;
    texture.needsUpdate = true;
    onLoadedRef.current?.();
    return () => { texture.dispose(); };
  }, [texture, onLoadedRef]);

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[SPHERE_RADIUS, 64, 40]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  );
}

// ── HotspotMesh ───────────────────────────────────────────────────────────────
// A pulsating sphere anchored at spherical coordinates (phi, theta).
// Registers itself in meshRegistryRef so the TapRaycaster can find it.

interface HotspotMeshProps {
  hotspot: PanoramaHotspot;
  meshRegistryRef: MutableRefObject<Map<string, Mesh>>;
}

function HotspotMesh({ hotspot, meshRegistryRef }: HotspotMeshProps) {
  const meshRef = useRef<Mesh>(null);

  // Spherical (r, phi, theta) → Cartesian
  const r = HOTSPOT_DISTANCE;
  const x = r * Math.sin(hotspot.phi) * Math.sin(hotspot.theta);
  const y = r * Math.cos(hotspot.phi);
  const z = r * Math.sin(hotspot.phi) * Math.cos(hotspot.theta);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.userData.hotspotId = hotspot.id;
    meshRegistryRef.current.set(hotspot.id, mesh);
    return () => { meshRegistryRef.current.delete(hotspot.id); };
  }, [hotspot.id, meshRegistryRef]);

  // Gentle pulse animation
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const s = 1 + 0.12 * Math.sin(clock.getElapsedTime() * 2.5);
      meshRef.current.scale.setScalar(s);
    }
  });

  return (
    <mesh ref={meshRef} position={[x, y, z]}>
      <sphereGeometry args={[HOTSPOT_RADIUS, 16, 16]} />
      <meshBasicMaterial color="#D67309" transparent opacity={0.9} />
    </mesh>
  );
}

// ── TapRaycaster ──────────────────────────────────────────────────────────────
// Runs inside Canvas. Each frame, checks if a pending tap coordinate was
// written by the gesture handler (plain ref, cross-renderer safe).
// If a hotspot mesh is hit, fires onHotspotTap (normal JS call on the JS thread).
// Reuses module-level _raycaster and _tapVec — no per-frame allocations.

interface TapRaycasterProps {
  pendingTapRef: MutableRefObject<{ x: number; y: number } | null>;
  meshRegistryRef: MutableRefObject<Map<string, Mesh>>;
  onHotspotTap: (hotspotId: string) => void;
}

function TapRaycaster({ pendingTapRef, meshRegistryRef, onHotspotTap }: TapRaycasterProps) {
  const { camera, size } = useThree();

  useFrame(() => {
    const tap = pendingTapRef.current;
    if (!tap) return;
    pendingTapRef.current = null;

    const ndcX = (tap.x / size.width) * 2 - 1;
    const ndcY = -(tap.y / size.height) * 2 + 1;

    _tapVec.set(ndcX, ndcY);
    _raycaster.setFromCamera(_tapVec, camera);

    const meshes = Array.from(meshRegistryRef.current.values());
    const hits = _raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      const id = hits[0].object.userData.hotspotId as string | undefined;
      if (id) onHotspotTap(id);
    }
  });

  return null;
}

// ── VirtualTourScreen ─────────────────────────────────────────────────────────

type Props = ClientScreenProps<'VirtualTour'>;

export function VirtualTourScreen({ navigation, route }: Props) {
  const params = route.params ?? ({} as Props['route']['params']);
  // Garde défensif : panoramas peut être absent/vide si la navigation a reçu
  // des données incomplètes. On borne aussi l'index dans les limites du tableau.
  const panoramas = Array.isArray(params.panoramas) ? params.panoramas : [];
  const propertyName = params.propertyName ?? 'Visite virtuelle';
  const initialPanoramaIndex = params.initialPanoramaIndex ?? 0;

  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(0, initialPanoramaIndex), Math.max(0, panoramas.length - 1)),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showDragHint, setShowDragHint] = useState(false);

  const currentPanorama = panoramas[currentIndex];

  // Camera angles — updated by gesture, consumed by CameraController in useFrame
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  // FOV — updated by pinch gesture, consumed by FovController in useFrame
  const fovRef = useRef(DEFAULT_FOV);
  const fovStartRef = useRef(DEFAULT_FOV);

  // Cross-renderer communication refs (plain JS objects, visible to both renderers)
  const onLoadedRef = useRef<(() => void) | null>(null);
  const pendingTapRef = useRef<{ x: number; y: number } | null>(null);
  const meshRegistryRef = useRef<Map<string, Mesh>>(new Map());

  // Always point to the latest setter so the ref never becomes stale
  onLoadedRef.current = () => {
    setIsLoading(false);
    setShowDragHint(true);
  };

  // Auto-dismiss drag hint after DRAG_HINT_MS or on first real drag
  useEffect(() => {
    if (!showDragHint) return;
    const t = setTimeout(() => setShowDragHint(false), DRAG_HINT_MS);
    return () => clearTimeout(t);
  }, [showDragHint]);

  // Adaptive panorama URL: Supabase Storage → render endpoint at screen-appropriate width
  const optimizedUrl = optimizePanoramaUrl(currentPanorama?.imageUrl ?? '', _targetWidth);

  const navigateTo = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsLoading(true);
    yawRef.current = 0;
    pitchRef.current = 0;
    fovRef.current = DEFAULT_FOV;
  }, []);

  const handleHotspotTap = useCallback((hotspotId: string) => {
    const hotspot = (currentPanorama?.hotspots ?? []).find(h => h.id === hotspotId);
    if (!hotspot) return;
    const idx = panoramas.findIndex(p => p.id === hotspot.targetPanoramaId);
    if (idx >= 0) navigateTo(idx);
  }, [currentPanorama, panoramas, navigateTo]);

  // ── Pan gesture ─────────────────────────────────────────────────────────────
  // Doubles as tap detector: if movement stays within TAP_SLOP, write to
  // pendingTapRef for raycasting instead of rotating the camera.

  const isTapRef = useRef(true);

  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onStart(() => { isTapRef.current = true; })
    .onUpdate((e: any) => {
      if (
        Math.abs(e.translationX) > TAP_SLOP ||
        Math.abs(e.translationY) > TAP_SLOP
      ) {
        isTapRef.current = false;
        setShowDragHint(false);
      }
      yawRef.current -= e.changeX * SENSITIVITY;
      pitchRef.current = Math.max(
        -MAX_PITCH,
        Math.min(MAX_PITCH, pitchRef.current + e.changeY * SENSITIVITY),
      );
    })
    .onEnd(e => {
      if (isTapRef.current) {
        pendingTapRef.current = { x: e.x, y: e.y };
      }
    })
    .runOnJS(true);

  // ── Pinch gesture (zoom) ─────────────────────────────────────────────────────
  // e.scale is cumulative from 1.0 since gesture start.
  // Larger scale = zooming in = smaller FOV.

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { fovStartRef.current = fovRef.current; })
    .onUpdate((e: any) => {
      fovRef.current = clampFov(fovStartRef.current / e.scale);
    })
    .runOnJS(true);

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Garde défensif : aucune donnée de panorama exploitable → écran de repli
  // au lieu d'un crash sur currentPanorama.roomName / .hotspots / .imageUrl.
  if (!currentPanorama) {
    return (
      <SafeAreaView style={[styles.safe, styles.emptyWrap]}>
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

  const hotspots = currentPanorama.hotspots ?? [];

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Text style={styles.backArrow}>{'←'}</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>{propertyName}</Text>
            <Text style={styles.headerRoom} numberOfLines={1}>
              {currentPanorama.roomName ?? ''}
            </Text>
          </View>
          <View style={styles.roomCounter}>
            <Text style={styles.roomCounterText}>
              {currentIndex + 1}/{panoramas.length}
            </Text>
          </View>
        </View>

        {/* ── 3D Canvas + gesture overlay ── */}
        <View style={styles.canvasWrap}>

          {/* Three.js scene */}
          <Canvas
            style={StyleSheet.absoluteFillObject as ViewStyle}
            camera={{ fov: DEFAULT_FOV, near: 0.1, far: 1100 }}
            gl={{ antialias: true }}
          >
            <CameraController yawRef={yawRef} pitchRef={pitchRef} />
            <FovController fovRef={fovRef} />

            {/* key forces remount (and texture reload) when panorama changes */}
            <Suspense fallback={null}>
              <PanoramaSphere
                key={currentPanorama.id}
                url={optimizedUrl}
                onLoadedRef={onLoadedRef}
              />
            </Suspense>

            {hotspots.map(h => (
              <HotspotMesh
                key={h.id}
                hotspot={h}
                meshRegistryRef={meshRegistryRef}
              />
            ))}

            <TapRaycaster
              pendingTapRef={pendingTapRef}
              meshRegistryRef={meshRegistryRef}
              onHotspotTap={handleHotspotTap}
            />
          </Canvas>

          {/* Transparent overlay captures all pan / pinch / tap gestures */}
          <GestureDetector gesture={composedGesture}>
            <View style={[StyleSheet.absoluteFill, styles.gestureLayer]} />
          </GestureDetector>

          {/* Loading overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#D67309" />
              <Text style={styles.loadingText}>Chargement de la pièce…</Text>
            </View>
          )}

          {/* Drag hint — shown after load, dismissed after DRAG_HINT_MS or first drag */}
          {showDragHint && (
            <View style={styles.dragHint} pointerEvents="none">
              <Text style={styles.dragHintText}>Faites glisser pour explorer</Text>
            </View>
          )}

          {/* Hotspot legend */}
          {!isLoading && hotspots.length > 0 && (
            <View style={styles.hotspotHint} pointerEvents="none">
              <View style={styles.hotspotDot} />
              <Text style={styles.hotspotHintText}>
                Touchez une sphère dorée pour changer de pièce
              </Text>
            </View>
          )}
        </View>

        {/* ── Room selector ── */}
        {panoramas.length > 1 && (
          <View style={styles.roomBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roomList}
              bounces={false}
            >
              {panoramas.map((p, i) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, i === currentIndex && styles.chipActive]}
                  onPress={() => navigateTo(i)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, i === currentIndex && styles.chipTextActive]}>
                    {p.roomName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1, paddingTop: 16, backgroundColor: '#000' },

  // Écran de repli (aucun panorama)
  emptyWrap:    { paddingTop: 48 },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyIcon:    { fontSize: 56 },
  emptyTitle:   { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  emptyText:    { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 21 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.85)',
    gap: 10,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 26, color: '#fff', fontWeight: '300', lineHeight: 28 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: 0.2 },
  headerRoom: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  roomCounter: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roomCounterText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Canvas
  canvasWrap: { flex: 1 },
  gestureLayer: { backgroundColor: 'transparent' },

  // Overlays
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  loadingText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },

  dragHint: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dragHintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  hotspotHint: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  hotspotDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D67309',
  },
  hotspotHintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // Room selector bar
  roomBar: {
    backgroundColor: 'rgba(0,0,0,0.88)',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  roomList: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  chipActive: {
    backgroundColor: '#D67309',
    borderColor: '#D67309',
  },
  chipText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#000',
    fontWeight: '700',
  },
});
