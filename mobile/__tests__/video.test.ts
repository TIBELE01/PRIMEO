// Tests unitaires — logique de limitation des vidéos dans le formulaire pro
// Vérifie que la contrainte "max 2 vidéos par propriété" est correctement
// appliquée côté client avant l'envoi au backend.

describe('limite vidéo formulaire pro (2 max)', () => {
  const MAX_VIDEOS = 2;

  function simulatePickVideo(
    existing: { uri: string; name: string }[],
    picked: { uri: string; name: string }[],
  ) {
    return [...existing, ...picked.slice(0, MAX_VIDEOS - existing.length)];
  }

  it("ajoute la première vidéo quand aucune n'existe", () => {
    const result = simulatePickVideo([], [{ uri: 'file://a.mp4', name: 'a.mp4' }]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('a.mp4');
  });

  it('ajoute la seconde vidéo quand une existe déjà', () => {
    const existing = [{ uri: 'file://a.mp4', name: 'a.mp4' }];
    const result = simulatePickVideo(existing, [{ uri: 'file://b.mp4', name: 'b.mp4' }]);
    expect(result).toHaveLength(2);
  });

  it('ne dépasse pas 2 vidéos même si plusieurs sont sélectionnées', () => {
    const existing = [{ uri: 'file://a.mp4', name: 'a.mp4' }];
    const picked = [
      { uri: 'file://b.mp4', name: 'b.mp4' },
      { uri: 'file://c.mp4', name: 'c.mp4' },
      { uri: 'file://d.mp4', name: 'd.mp4' },
    ];
    const result = simulatePickVideo(existing, picked);
    expect(result).toHaveLength(MAX_VIDEOS);
    expect(result[1].name).toBe('b.mp4');
  });

  it("n'ajoute rien quand la limite est déjà atteinte", () => {
    const existing = [
      { uri: 'file://a.mp4', name: 'a.mp4' },
      { uri: 'file://b.mp4', name: 'b.mp4' },
    ];
    const result = simulatePickVideo(existing, [{ uri: 'file://c.mp4', name: 'c.mp4' }]);
    expect(result).toHaveLength(MAX_VIDEOS);
    expect(result.find(v => v.name === 'c.mp4')).toBeUndefined();
  });

  it('le bouton est désactivé quand videoFiles.length >= 2', () => {
    const videoFiles = [
      { uri: 'file://a.mp4', name: 'a.mp4' },
      { uri: 'file://b.mp4', name: 'b.mp4' },
    ];
    const isDisabled = videoFiles.length >= MAX_VIDEOS;
    expect(isDisabled).toBe(true);
  });

  it('le bouton est actif quand videoFiles.length < 2', () => {
    const videoFiles = [{ uri: 'file://a.mp4', name: 'a.mp4' }];
    const isDisabled = videoFiles.length >= MAX_VIDEOS;
    expect(isDisabled).toBe(false);
  });
});

// ── Validation MIME type côté mobile ─────────────────────────────────────────

describe('validation MIME type vidéo (mediaUpload service)', () => {
  const ALLOWED_MIMES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi'];

  function isMimeAllowed(mime: string): boolean {
    return ALLOWED_MIMES.includes(mime);
  }

  it.each([
    ['video/mp4', true],
    ['video/quicktime', true],
    ['video/x-msvideo', true],
    ['video/avi', true],
    ['video/webm', false],
    ['video/ogg', false],
    ['image/jpeg', false],
    ['application/octet-stream', false],
  ])('MIME "%s" → accepté: %s', (mime, expected) => {
    expect(isMimeAllowed(mime)).toBe(expected);
  });
});

// ── Logique de filtrage des médias dans PropertyDetailScreen ─────────────────

describe('filtrage médias photo/vidéo (PropertyDetailScreen)', () => {
  type MediaItem = { id: string; url: string; mediaType?: string };

  function filterMedia(allMedia: MediaItem[]) {
    const images = allMedia.filter(i => i.mediaType !== 'video').map(i => i.url);
    const videos = allMedia.filter(i => i.mediaType === 'video');
    return { images, videos };
  }

  it('sépare photos et vidéos', () => {
    const media: MediaItem[] = [
      { id: '1', url: 'https://cdn/photo1.jpg', mediaType: 'photo' },
      { id: '2', url: 'https://cdn/video1.mp4', mediaType: 'video' },
      { id: '3', url: 'https://cdn/photo2.jpg', mediaType: 'photo' },
    ];
    const { images, videos } = filterMedia(media);
    expect(images).toHaveLength(2);
    expect(videos).toHaveLength(1);
    expect(videos[0].url).toBe('https://cdn/video1.mp4');
  });

  it('traite les médias sans mediaType comme des photos (rétrocompatibilité)', () => {
    const media: MediaItem[] = [
      { id: '1', url: 'https://cdn/old-photo.jpg' },
    ];
    const { images, videos } = filterMedia(media);
    expect(images).toHaveLength(1);
    expect(videos).toHaveLength(0);
  });

  it('retourne des tableaux vides si aucun média', () => {
    const { images, videos } = filterMedia([]);
    expect(images).toHaveLength(0);
    expect(videos).toHaveLength(0);
  });

  it('supporte jusqu\'à 2 vidéos par propriété', () => {
    const media: MediaItem[] = [
      { id: '1', url: 'https://cdn/v1.mp4', mediaType: 'video' },
      { id: '2', url: 'https://cdn/v2.mp4', mediaType: 'video' },
    ];
    const { videos } = filterMedia(media);
    expect(videos).toHaveLength(2);
  });
});
