import { normalizeReferralHistory } from '../src/utils/referrals';

describe('normalizeReferralHistory — statuts synchronisés avec la base', () => {
  it('« rewarded » (récompense versée) s\'affiche comme crédité, avec le montant', () => {
    const [r] = normalizeReferralHistory([
      { id: 'r1', status: 'rewarded', rewardAmount: 250, refereeName: 'Awa K.', refereeJoinedAt: '2026-11-20T10:00:00Z' },
    ]);
    expect(r).toEqual({ id: 'r1', status: 'credited', earnedAmount: 250, refereeName: 'Awa K.', joinedAt: '2026-11-20T10:00:00Z' });
  });

  it('« pending » reste en attente ; valeurs manquantes sans plantage', () => {
    const [r] = normalizeReferralHistory([{ id: 'r2', status: 'pending', rewardAmount: null, refereeName: null, createdAt: '2026-11-21' }]);
    expect(r).toMatchObject({ status: 'pending', earnedAmount: 0, refereeName: 'Filleul', joinedAt: '2026-11-21' });
  });

  it('réponse invalide → liste vide', () => {
    expect(normalizeReferralHistory(undefined)).toEqual([]);
    expect(normalizeReferralHistory({})).toEqual([]);
  });
});
