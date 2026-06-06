// Scoring service — computes property ranking score for search result ordering
// Factors: rating (0–100), review count (bonus), boost (+50), recency
export const scoringService = {
  computeScore(property: {
    rating: number;
    reviewCount: number;
    isBoosted: boolean;
    createdAt: Date;
  }): number {
    const ratingScore = property.rating * 20;
    const reviewBonus = Math.min(property.reviewCount * 0.5, 10);
    const boostBonus = property.isBoosted ? 50 : 0;
    const ageMonths = (Date.now() - property.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const recencyBonus = Math.max(0, 10 - ageMonths);
    return ratingScore + reviewBonus + boostBonus + recencyBonus;
  },
};
