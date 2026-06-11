// Tests unitaires — utilitaires panorama (clampFov, panoramaTargetWidth, optimizePanoramaUrl)
import { MIN_FOV, MAX_FOV, DEFAULT_FOV, clampFov, panoramaTargetWidth, optimizePanoramaUrl } from '../src/utils/panorama';

describe('clampFov', () => {
  it('retourne la valeur inchangée dans les bornes', () => {
    expect(clampFov(75)).toBe(75);
    expect(clampFov(MIN_FOV)).toBe(MIN_FOV);
    expect(clampFov(MAX_FOV)).toBe(MAX_FOV);
  });

  it('bloque au minimum (zoom max)', () => {
    expect(clampFov(10)).toBe(MIN_FOV);
    expect(clampFov(0)).toBe(MIN_FOV);
    expect(clampFov(-5)).toBe(MIN_FOV);
  });

  it('bloque au maximum (dézoom max)', () => {
    expect(clampFov(120)).toBe(MAX_FOV);
    expect(clampFov(180)).toBe(MAX_FOV);
  });

  it('DEFAULT_FOV est dans les bornes', () => {
    expect(clampFov(DEFAULT_FOV)).toBe(DEFAULT_FOV);
  });
});

describe('panoramaTargetWidth', () => {
  it('retourne 4096 au-dessus de 1200px', () => {
    expect(panoramaTargetWidth(1201)).toBe(4096);
    expect(panoramaTargetWidth(2560)).toBe(4096);
    expect(panoramaTargetWidth(3840)).toBe(4096);
  });

  it('retourne 2048 à 1200px et en dessous', () => {
    expect(panoramaTargetWidth(1200)).toBe(2048);
    expect(panoramaTargetWidth(750)).toBe(2048);
    expect(panoramaTargetWidth(390)).toBe(2048);
  });
});

describe('optimizePanoramaUrl', () => {
  const BASE = 'https://abcdef.supabase.co';
  const PUBLIC_URL = `${BASE}/storage/v1/object/public/panoramas/salon.jpg`;

  it('réécrit une URL Supabase Storage vers le endpoint render', () => {
    const result = optimizePanoramaUrl(PUBLIC_URL, 2048);
    expect(result).toBe(
      `${BASE}/storage/v1/render/image/public/panoramas/salon.jpg?width=2048&quality=80`,
    );
  });

  it('utilise la largeur cible fournie', () => {
    const result = optimizePanoramaUrl(PUBLIC_URL, 4096);
    expect(result).toContain('width=4096');
  });

  it('retourne les URLs non-Supabase telles quelles', () => {
    const ext = 'https://threejs.org/examples/textures/panorama.jpg';
    expect(optimizePanoramaUrl(ext, 2048)).toBe(ext);
  });

  it('retourne les URLs Cloudinary telles quelles', () => {
    const cdn = 'https://res.cloudinary.com/dlnnxvepd/image/upload/v1/panorama.jpg';
    expect(optimizePanoramaUrl(cdn, 2048)).toBe(cdn);
  });

  it('retourne une chaîne vide inchangée', () => {
    expect(optimizePanoramaUrl('', 2048)).toBe('');
  });

  it('retourne une valeur non-string inchangée', () => {
    expect(optimizePanoramaUrl(null as any, 2048)).toBe(null);
    expect(optimizePanoramaUrl(undefined as any, 2048)).toBe(undefined);
  });

  it('préserve le chemin complet avec sous-dossiers', () => {
    const url = `${BASE}/storage/v1/object/public/bucket/2024/villa/salon.jpg`;
    const result = optimizePanoramaUrl(url, 2048);
    expect(result).toBe(
      `${BASE}/storage/v1/render/image/public/bucket/2024/villa/salon.jpg?width=2048&quality=80`,
    );
  });
});
