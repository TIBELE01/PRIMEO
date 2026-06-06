-- CreateTable
CREATE TABLE "website_solutions_intro" (
    "id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "subtext" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "website_solutions_intro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_solutions_blocs" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🏨',
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "features" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL DEFAULT 'En savoir plus',
    "ctaUrl" TEXT NOT NULL DEFAULT '/solutions',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_solutions_blocs_pkey" PRIMARY KEY ("id")
);
