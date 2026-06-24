-- Réconciliation de migration.
--
-- Les colonnes `website_testimonials.role` et `newsletter_subscribers.status`
-- avaient été ajoutées HORS Prisma (via la console Supabase) : elles existaient
-- donc en base de production et dans schema.prisma, mais SANS fichier de migration
-- Prisma correspondant. Conséquence : un `prisma migrate deploy` sur une base
-- VIERGE (staging, reprise après sinistre) ne les aurait pas recréées, provoquant
-- des erreurs d'exécution (le code lit testimonial.role et subscriber.status).
--
-- Cette migration les (re)crée de façon IDEMPOTENTE : `IF NOT EXISTS` la rend
-- sans effet sur la base de production (colonnes déjà présentes), tout en
-- garantissant la reproductibilité complète du schéma sur une base neuve.
ALTER TABLE "website_testimonials"   ADD COLUMN IF NOT EXISTS "role"   TEXT;
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
