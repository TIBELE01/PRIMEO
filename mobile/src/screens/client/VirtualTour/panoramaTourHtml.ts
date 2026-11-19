// Génère la page HTML d'une visite virtuelle 360° propulsée par Pannellum
// (rendu WebGL dans une WebView). Approche robuste : la WebView charge les images
// distantes comme un navigateur (CORS géré par l'hébergeur, ici Access-Control-
// Allow-Origin: *), sans dépendre d'expo-gl ni du TextureLoader natif fragile.
//
// Fonction pure (aucun import natif) → testable unitairement.
import type { Panorama } from '@/types/property';
import { optimizePanoramaUrl } from '../../../utils/panorama';
import { PANNELLUM_CSS, PANNELLUM_JS } from './pannellumAssets';

const RAD2DEG = 180 / Math.PI;
/** Largeur de repli quand le GPU ne supporte pas la texture cible (MAX_TEXTURE_SIZE). */
const SAFE_WIDTH = 2048;

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
      // Variante 2048 px utilisée si le GPU de l'appareil est limité (voir buildTourHtml).
      panoramaSafe: optimizePanoramaUrl(p.imageUrl ?? '', Math.min(SAFE_WIDTH, targetWidth)),
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

/**
 * Page HTML complète prête à être passée à `<WebView source={{ html }} />`.
 * Pannellum est embarqué (pas de CDN). Protocole WebView → RN (postMessage JSON) :
 *  - ready            : première scène affichée
 *  - scenechange      : début de changement de pièce (sceneId)
 *  - sceneloaded      : pièce affichée (sceneId)
 *  - sceneerror       : échec d'une pièce après le premier affichage (sceneId)
 *  - error            : échec du premier affichage / contexte WebGL perdu
 * RN → WebView : window.__goScene(id), window.__destroyTour().
 */
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
<style>${PANNELLUM_CSS}</style>
<style>
  html, body, #panorama { margin:0; padding:0; width:100%; height:100%; background:#000; overflow:hidden; touch-action:none; -webkit-user-select:none; user-select:none; }
  /* Le nom de la pièce est déjà affiché dans l'en-tête natif */
  .pnlm-load-box, .pnlm-about-msg, .pnlm-error-msg, .pnlm-panorama-info { display:none !important; }
  /* Libellés des hotspots toujours visibles (pas de survol sur mobile) ; suivent la visibilité du hotspot */
  div.pnlm-tooltip span { visibility:inherit; font:600 13px -apple-system, Roboto, sans-serif; }
  .pnlm-hotspot.pnlm-scene { box-shadow:0 0 0 3px rgba(255,255,255,.85); }
</style>
</head>
<body>
<div id="panorama"></div>
<script>${PANNELLUM_JS}</script>
<script>
(function () {
  function send(m) { try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {} }
  if (!window.pannellum) { send({ type: 'error', message: 'pannellum-unavailable' }); return; }

  var cfg = ${json};
  var v = null, firstLoaded = false, pending = null, destroyed = false, errored = false;

  // GPU limité (MAX_TEXTURE_SIZE < cible) → bascule sur la variante 2048 px.
  try {
    var c = document.createElement('canvas');
    var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) { send({ type: 'error', message: 'webgl-unavailable' }); return; }
    var maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
    var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    Object.keys(cfg.scenes).forEach(function (k) {
      var s = cfg.scenes[k];
      if (maxTex < ${targetWidth}) { s.panorama = s.panoramaSafe || s.panorama; }
      delete s.panoramaSafe;
    });
  } catch (e) {}

  function watchContext() {
    var cv = document.querySelector('#panorama canvas');
    if (!cv || cv.__watched) return;
    cv.__watched = true;
    cv.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); send({ type: 'error', message: 'context-lost' }); }, false);
  }

  function create(sceneId) {
    if (v) { try { v.destroy(); } catch (e) {} v = null; }
    cfg['default'].firstScene = sceneId;
    v = pannellum.viewer('panorama', cfg);
    window.__viewer = v;
    v.on('load', function () {
      watchContext();
      var id = v.getScene();
      pending = null; errored = false;
      if (!firstLoaded) { firstLoaded = true; send({ type: 'ready', sceneId: id }); }
      else send({ type: 'sceneloaded', sceneId: id });
    });
    v.on('scenechange', function (id) { pending = id; send({ type: 'scenechange', sceneId: id }); });
    v.on('error', function (e) {
      errored = true;
      if (!firstLoaded) send({ type: 'error', message: String(e) });
      else send({ type: 'sceneerror', sceneId: pending || v.getScene(), message: String(e) });
    });
  }

  // Navigation pilotée par RN (puces de pièces / réessayer une pièce)
  window.__goScene = function (id) {
    if (destroyed || !cfg.scenes[id]) return;
    try {
      // Après une erreur, Pannellum reste bloqué : on recrée le viewer sur la pièce voulue
      if (!v || errored) { errored = false; create(id); return; }
      if (v.getScene() === id && v.isLoaded()) { send({ type: 'sceneloaded', sceneId: id }); return; }
      pending = id;
      v.loadScene(id);
    } catch (e) {
      try { create(id); } catch (e2) { send({ type: 'sceneerror', sceneId: id, message: String(e2) }); }
    }
  };

  // Libération explicite de la mémoire GPU (textures + contexte WebGL) à la fermeture
  window.__destroyTour = function () {
    if (destroyed) return;
    destroyed = true;
    try {
      var cv = document.querySelector('#panorama canvas');
      var g = cv && (cv.getContext('webgl') || cv.getContext('experimental-webgl'));
      if (v) v.destroy();
      var ext = g && g.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
    } catch (e) {}
    v = null; window.__viewer = null;
  };
  window.addEventListener('pagehide', window.__destroyTour);

  try { create(cfg['default'].firstScene); }
  catch (e) { send({ type: 'error', message: String((e && e.message) || e) }); }
})();
</script>
</body>
</html>`;
}
