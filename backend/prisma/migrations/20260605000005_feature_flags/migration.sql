-- Migration : table feature_flags pour les feature flags dynamiques

CREATE TABLE "feature_flags" (
    "key"         TEXT NOT NULL,
    "enabled"     BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "updatedBy"   TEXT,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- Flags par défaut
INSERT INTO "feature_flags" ("key", "enabled", "description", "updatedAt") VALUES
  ('referral_program',        true,  'Programme de parrainage actif',                            NOW()),
  ('market_reports',          false, 'Rapports de marché (abonnés Prestige/Premium)',             NOW()),
  ('offline_mode',            false, 'Mode hors-ligne dans l''application mobile',               NOW()),
  ('new_3d_viewer',           false, 'Visionneuse 3D des propriétés (expérimental)',             NOW()),
  ('show_ai_recommendations', false, 'Recommandations IA personnalisées dans le feed',           NOW()),
  ('food_orders',             true,  'Module commandes nourriture (restaurateurs)',               NOW()),
  ('collaborators',           true,  'Gestion des co-gestionnaires de propriétés',              NOW()),
  ('boost_v2',                false, 'Nouveau système de boosts avec analytics avancées',        NOW());
