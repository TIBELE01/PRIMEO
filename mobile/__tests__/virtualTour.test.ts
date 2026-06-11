// Tests — normalisation du payload virtualTour renvoyé par le backend
// (construit depuis property_3d_scenes) vers le format attendu par le viewer 3D.
import { normalizeProperty } from '../src/utils/normalizeProperty';

const BASE = {
  id: 'prop-1',
  title: 'Villa Test',
  propertyType: 'residence',
  city: 'Abidjan',
};

describe('virtualTour — payload backend property_3d_scenes', () => {
  it('expose les panoramas avec roomName et imageUrl', () => {
    const p = normalizeProperty({
      ...BASE,
      virtualTour: {
        available: true,
        panoramas: [
          { id: 's1', roomName: 'Salon', imageUrl: 'https://cdn/salon.jpg', hotspots: [] },
          { id: 's2', roomName: 'Chambre', imageUrl: 'https://cdn/chambre.jpg', hotspots: [] },
        ],
      },
    });
    expect(p.virtualTour?.available).toBe(true);
    expect(p.virtualTour?.panoramas).toHaveLength(2);
    expect(p.virtualTour?.panoramas[0].roomName).toBe('Salon');
    expect(p.virtualTour?.panoramas[1].imageUrl).toBe('https://cdn/chambre.jpg');
  });

  it('available=false quand aucun panorama', () => {
    const p = normalizeProperty({
      ...BASE,
      virtualTour: { available: false, panoramas: [] },
    });
    expect(p.virtualTour?.available).toBe(false);
    expect(p.virtualTour?.panoramas).toHaveLength(0);
  });

  it('filtre les panoramas sans imageUrl', () => {
    const p = normalizeProperty({
      ...BASE,
      virtualTour: {
        available: true,
        panoramas: [
          { id: 's1', roomName: 'Salon', imageUrl: 'https://cdn/salon.jpg', hotspots: [] },
          { id: 's2', roomName: 'Vide', imageUrl: '', hotspots: [] },
        ],
      },
    });
    expect(p.virtualTour?.panoramas).toHaveLength(1);
  });

  it('tolère un panorama au format url (alias imageUrl)', () => {
    const p = normalizeProperty({
      ...BASE,
      virtualTour: {
        available: true,
        panoramas: [{ id: 's1', url: 'https://cdn/p.jpg' }],
      },
    });
    expect(p.virtualTour?.panoramas[0].imageUrl).toBe('https://cdn/p.jpg');
  });

  it('repli hasVirtualTour sans objet virtualTour → bouton masqué (available=false)', () => {
    const p = normalizeProperty({ ...BASE, hasVirtualTour: true });
    expect(p.virtualTour?.available).toBe(false);
  });

  it('aucun champ → virtualTour undefined', () => {
    const p = normalizeProperty(BASE);
    expect(p.virtualTour).toBeUndefined();
  });

  it('génère un roomName par défaut si absent', () => {
    const p = normalizeProperty({
      ...BASE,
      virtualTour: {
        available: true,
        panoramas: [{ id: 's1', imageUrl: 'https://cdn/p.jpg' }],
      },
    });
    expect(p.virtualTour?.panoramas[0].roomName).toBe('Pièce 1');
  });
});
