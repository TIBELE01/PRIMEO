-- Blocs de contenu statique du site vitrine modifiables depuis l'administration
CREATE TABLE "website_content_blocks" (
    "key" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "website_content_blocks_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "website_content_blocks_page_idx" ON "website_content_blocks"("page");

-- Table publique accessible uniquement via l'API (comme les autres tables) : RLS activé, aucune politique
ALTER TABLE "website_content_blocks" ENABLE ROW LEVEL SECURITY;
