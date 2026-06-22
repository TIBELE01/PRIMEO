// Valide la génération de la visite 360° (WebView + Pannellum) : config multi-scènes,
// hotspots de navigation valides, conversion d'angles, et HTML bien formé.
import { buildTourConfig, buildTourHtml } from '@/screens/client/VirtualTour/panoramaTourHtml';
import type { Panorama } from '@/types/property';

const PANS: Panorama[] = [
  {
    id: 's0', roomName: 'Salle principale', imageUrl: 'https://pannellum.org/images/cerro-toco-0.jpg',
    hotspots: [
      { id: 'h1', targetPanoramaId: 's1', label: 'Aller en terrasse', theta: 1.5, phi: 1.57 },
      { id: 'hX', targetPanoramaId: 'inexistant', label: 'Cassé', theta: 0, phi: 1.57 }, // cible absente
    ],
  },
  {
    id: 's1', roomName: 'Terrasse', imageUrl: 'https://pannellum.org/images/from-tree.jpg',
    hotspots: [{ id: 'h2', targetPanoramaId: 's0', label: 'Retour', theta: -1.5, phi: 1.57 }],
  },
];

describe('buildTourConfig', () => {
  const cfg = buildTourConfig(PANS, 's0', 2048) as any;

  it('crée une scène par panorama avec URL et titre', () => {
    expect(Object.keys(cfg.scenes)).toEqual(['s0', 's1']);
    expect(cfg.scenes.s0.panorama).toBe('https://pannellum.org/images/cerro-toco-0.jpg');
    expect(cfg.scenes.s0.title).toBe('Salle principale');
    expect(cfg.scenes.s0.type).toBe('equirectangular');
  });

  it('définit la première scène', () => {
    expect(cfg.default.firstScene).toBe('s0');
    expect(cfg.default.autoLoad).toBe(true);
  });

  it('mappe les hotspots en navigation de scène et filtre les cibles inexistantes', () => {
    expect(cfg.scenes.s0.hotSpots).toHaveLength(1); // le hotspot vers "inexistant" est écarté
    const h = cfg.scenes.s0.hotSpots[0];
    expect(h.type).toBe('scene');
    expect(h.sceneId).toBe('s1');
    expect(h.text).toBe('Aller en terrasse');
  });

  it('convertit les angles radians → pitch/yaw degrés', () => {
    const h = cfg.scenes.s0.hotSpots[0];
    expect(h.pitch).toBeCloseTo(0, 0);     // phi 1.57 ≈ horizon → pitch 0
    expect(h.yaw).toBeCloseTo(85.94, 1);   // theta 1.5 rad
    expect(cfg.scenes.s1.hotSpots[0].yaw).toBeCloseTo(-85.94, 1); // theta -1.5
  });
});

describe('buildTourHtml', () => {
  const html = buildTourHtml(PANS, 's0', 2048);

  it('charge Pannellum (CSS + JS) depuis le CDN', () => {
    expect(html).toContain('pannellum@2.5.6/build/pannellum.css');
    expect(html).toContain('pannellum@2.5.6/build/pannellum.js');
    expect(html).toContain("pannellum.viewer('panorama'");
  });

  it('embarque les scènes et notifie RN (ready/scene/error)', () => {
    expect(html).toContain('cerro-toco-0.jpg');
    expect(html).toContain('ReactNativeWebView');
    expect(html).toContain("type: 'ready'");
  });

  it('échappe les « < » pour éviter une fermeture de script', () => {
    expect(html).not.toMatch(/<\/script>\s*[^<]*equirectangular/);
  });
});
