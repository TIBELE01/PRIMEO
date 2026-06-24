-- Le code stocké dans `referrals.referralCode` est celui du PARRAIN, partagé par
-- TOUS ses filleuls. La contrainte d'unicité était donc erronée : le 2e filleul
-- qui saisissait un même code provoquait une violation d'unicité (erreur 500).
-- L'unicité correcte est déjà assurée par `referrals.refereeId` (un seul parrain
-- par utilisateur). On supprime la contrainte d'unicité sur `referralCode`.
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_referralCode_key";
