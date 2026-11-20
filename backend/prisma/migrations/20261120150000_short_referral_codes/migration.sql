-- Codes de parrainage courts : 6 caractères, lettres majuscules A-Z et chiffres 0-9
-- (ex. « KOF81A »), uniques. Remplace l'ancien format cuid (25 caractères).

-- 1. Générateur : tire un code aléatoire et recommence tant qu'il existe déjà en base.
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT
LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  candidate TEXT;
  i INT;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * 36)::INT, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM "users" WHERE upper("referralCode") = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- 2. Tout nouvel utilisateur reçoit un code court, quel que soit le point de création.
ALTER TABLE "users" ALTER COLUMN "referralCode" SET DEFAULT generate_referral_code();

-- 3. Migration des codes existants au format long. Les parrainages déjà enregistrés
--    reprennent le nouveau code du parrain ; l'ancien code n'est plus reconnu.
DO $$
DECLARE
  u RECORD;
  new_code TEXT;
BEGIN
  FOR u IN SELECT "id" FROM "users" WHERE "referralCode" !~ '^[A-Z0-9]{1,6}$' LOOP
    new_code := generate_referral_code();
    UPDATE "users" SET "referralCode" = new_code WHERE "id" = u."id";
    UPDATE "referrals" SET "referralCode" = new_code WHERE "referrerId" = u."id";
  END LOOP;
END;
$$;
