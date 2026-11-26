-- Sécurité : ces tables (créées après la mise en place du RLS) étaient exposées
-- sans row level security à l'API REST publique de Supabase (PostgREST).
-- Sans politique, seuls le backend (connexion PostgreSQL directe / service_role)
-- peut y accéder ; les rôles anon et authenticated sont refusés.
ALTER TABLE "payout_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "withdrawal_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_events" ENABLE ROW LEVEL SECURITY;

-- search_path figé : empêche le détournement de la fonction par un objet
-- homonyme créé dans un autre schéma.
ALTER FUNCTION generate_referral_code() SET search_path = public;
