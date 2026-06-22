// Génère la page HTML d'une visite virtuelle 360° propulsée par Pannellum
// (rendu WebGL dans une WebView). Approche robuste : la WebView charge les images
// distantes comme un navigateur (CORS géré par l'hébergeur, ici Access-Control-
// Allow-Origin: *), sans dépendre d'expo-gl ni du TextureLoader natif fragile.
//
// Fonction pure (aucun import natif) → testable unitairement.
import type { Panorama } from '@/types/property';
import { optimizePanoramaUrl } from '../../../utils/panorama';

const RAD2DEG = 180 / Math.PI;

const PANNELLUM_CSS = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
const PANNELLUM_JS = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';

/** Convertit les angles internes (radians) en pitch/yaw Pannellum (degrés). */
function toPitchYaw(theta: number, phi: number): { pitch: number; yaw: number } {
  // phi = angle polaire depuis le haut (≈1.57 = horizon) → pitch 0 à l'horizon.
  const pitch = Math.max(-89, Math.min(89, 90 - (phi ?? Math.PI / 2) * RAD2DEG));
  // theta = azimut → yaw ramené dans [-180, 180].
  let yaw = (theta ?? 0) * RAD2DEG;
  yaw = ((((yaw + 180) % 360) + 360) % 360) - 180;
  return { pitch, yaw };
}

/** Construit la config Pannellum (multi-scènes + hotspots de navigation). */
export function buildTourConfig(
  panoramas: Panorama[],
  firstSceneId: string,
  targetWidth: number,
): Record<string, unknown> {
  const ids = new Set(panoramas.map(p => p.id));
  const scenes: Record<string, unknown> = {};

  for (const p of panoramas) {
    const hotSpots = (p.hotspots ?? [])
      // n'expose que les hotspots dont la scène cible existe réellement
      .filter(h => h.targetPanoramaId && ids.has(h.targetPanoramaId))
      .map(h => {
        const { pitch, yaw } = toPitchYaw(h.theta, h.phi);
        return { pitch, yaw, type: 'scene', text: h.label || 'Pièce suivante', sceneId: h.targetPanoramaId };
      });

    scenes[p.id] = {
      type: 'equirectangular',
      panorama: optimizePanoramaUrl(p.imageUrl ?? '', targetWidth),
      title: p.roomName ?? '',
      hfov: 100,
      hotSpots,
    };
  }

  return {
    default: {
      firstScene: firstSceneId,
      autoLoad: true,
      sceneFadeDuration: 700,
      hfov: 100,
      minHfov: 50,
      maxHfov: 120,
      compass: false,
      showControls: false,
      showFullscreenCtrl: false,
      showZoomCtrl: false,
      keyboardZoom: false,
      draggable: true,
    },
    scenes,
  };
}

/** Page HTML complète prête à être passée à `<WebView source={{ html }} />`. */
export function buildTourHtml(
  panoramas: Panorama[],
  firstSceneId: string,
  targetWidth: number,
): string {
  const config = buildTourConfig(panoramas, firstSceneId, targetWidth);
  // Échappe `<` pour éviter toute fermeture prématurée de <script>.
  const json = JSON.stringify(config).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="${PANNELLUM_CSS}" />
<style>
  html, body, #panorama { margin:0; padding:0; width:100%; height:100%; background:#000; overflow:hidden; }
  .pnlm-load-box, .pnlm-about-msg { display:none !important; }
</style>
</head>
<body>
<div id="panorama"></div>
<script src="${PANNELLUM_JS}"></script>
<script>
(function () {
  function send(m) { try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {} }
  if (!window.pannellum) { send({ type: 'error', message: 'pannellum-unavailable' }); return; }
  try {
    var cfg = ${json};
    var v = pannellum.viewer('panorama', cfg);
    window.__viewer = v;
    v.on('load', function () { send({ type: 'ready' }); });
    v.on('scenechange', function (id) { send({ type: 'scene', sceneId: id }); });
    v.on('error', function (e) { send({ type: 'error', message: String(e) }); });
  } catch (e) {
    send({ type: 'error', message: String((e && e.message) || e) });
  }
})();
</script>
</body>
</html>`;
}
