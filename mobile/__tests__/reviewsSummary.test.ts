import { normalizeProperty, normalizeReview } from '../src/utils/normalizeProperty';

describe('avis de la fiche annonce', () => {
  const apiReview = {
    id: 'r1', rating: 4, comment: 'Très bien situé', publishedAt: '2026-11-20T10:00:00Z',
    cleanlinessRating: 5, communicationRating: 4, responseFromProfessional: 'Merci !',
    booking: { client: { firstName: 'Awa', lastName: 'Koné', avatarUrl: null } },
  };

  it('construit le résumé des avis à partir du détail d’annonce', () => {
    const p = normalizeProperty({ id: 'p1', title: 'Studio', rating: 4.5, reviewCount: 12, reviews: [apiReview] });
    expect(p.reviewsSummary).toEqual(expect.objectContaining({ average: 4.5, total: 12 }));
    expect(p.reviewsSummary!.items[0]).toEqual(expect.objectContaining({
      id: 'r1', authorName: 'Awa K.', rating: 4, comment: 'Très bien situé', reply: 'Merci !',
      criteria: { cleanliness: 5, communication: 4 },
    }));
  });

  it('accepte le format de /reviews/property/:id (reviewer, reply)', () => {
    const r = normalizeReview({ id: 'r2', rating: 5, comment: '', reviewer: { firstName: 'Yao', lastName: '' }, reply: null });
    expect(r.authorName).toBe('Yao');
    expect(r.reply).toBeNull();
  });

  it('pas d’avis inventé : aucun résumé sans avis renvoyés', () => {
    expect(normalizeProperty({ id: 'p2', title: 'X' }).reviewsSummary).toBeUndefined();
  });
});
