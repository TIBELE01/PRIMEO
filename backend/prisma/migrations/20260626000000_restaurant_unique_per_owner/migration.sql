-- Un compte professionnel ne peut posséder qu'UN SEUL restaurant.
-- Prisma ne modélise pas les index partiels : contrainte gérée en SQL brut.
-- Index unique partiel sur ownerId, restreint au type 'restaurant' (les autres
-- types de biens — résidences, hôtels, immobilier — restent multi-annonces).
CREATE UNIQUE INDEX IF NOT EXISTS "properties_owner_restaurant_unique"
ON "properties" ("ownerId")
WHERE "propertyType" = 'restaurant';
