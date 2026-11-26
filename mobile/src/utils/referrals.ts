// Parrainage : correspondance entre les statuts de la base et l'affichage de l'historique.
export interface ReferralEntry {
  id: string;
  refereeName: string;
  joinedAt: string;
  earnedAmount: number;
  status: 'pending' | 'credited';
}

/** Ligne brute renvoyée par GET /referrals/history (statut de la base : pending | rewarded). */
interface ReferralHistoryApiRow {
  id: string;
  status?: string;
  rewardAmount?: number | null;
  refereeName?: string | null;
  refereeJoinedAt?: string | null;
  inscriptionDate?: string | null;
  createdAt?: string | null;
}

/** Aligne l'historique sur la base : « rewarded » (récompense versée) → « Crédité ». */
export function normalizeReferralHistory(rows: unknown): ReferralEntry[] {
  if (!Array.isArray(rows)) return [];
  return (rows as ReferralHistoryApiRow[]).map((r) => ({
    id: r.id,
    refereeName: r.refereeName || 'Filleul',
    joinedAt: r.refereeJoinedAt ?? r.inscriptionDate ?? r.createdAt ?? '',
    earnedAmount: Number(r.rewardAmount ?? 0),
    status: r.status === 'rewarded' || r.status === 'credited' ? 'credited' : 'pending',
  }));
}
