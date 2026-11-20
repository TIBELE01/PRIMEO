import { propertyCoverUrl, videoPosterFromUrl } from '../src/utils/propertyCover';

const VID = 'https://res.cloudinary.com/x/video/upload/v1/p/videos/tour.mp4';
const PANO = 'https://res.cloudinary.com/x/image/upload/v1/p/3d/salon.jpg';

describe('propertyCoverUrl', () => {
  it('photo principale prioritaire', () => {
    expect(propertyCoverUrl({ images: [{ url: 'a.jpg' }, { url: 'b.jpg', isPrimary: true }] })).toBe('b.jpg');
  });
  it('mainImageUrl du serveur utilisée si ce n\'est pas une vidéo', () => {
    expect(propertyCoverUrl({ mainImageUrl: 'cover.jpg', images: [{ url: VID, mediaType: 'video' }] })).toBe('cover.jpg');
  });
  it('bien vidéo : jamais l\'URL .mp4, mais l\'image extraite de la vidéo', () => {
    const c = propertyCoverUrl({ mainImageUrl: VID, images: [{ url: VID, mediaType: 'video' }] });
    expect(c).toBe(videoPosterFromUrl(VID));
    expect(c).toMatch(/so_1.*\.jpg$/);
  });
  it('bien visite 3D sans photo : vignette de la 1re pièce', () => {
    expect(propertyCoverUrl({ images: [], virtualTour: { panoramas: [{ imageUrl: PANO }] } })).toContain('/image/upload/c_fill,g_center,w_900');
    expect(propertyCoverUrl({ media: [], scenes3d: [{ url: PANO }] })).toContain('c_fill,g_center,w_900');
  });
  it('aucun média : undefined (placeholder)', () => {
    expect(propertyCoverUrl({ images: [] })).toBeUndefined();
    expect(propertyCoverUrl(undefined)).toBeUndefined();
  });
});
