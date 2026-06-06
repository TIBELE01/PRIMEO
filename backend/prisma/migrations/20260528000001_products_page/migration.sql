-- CreateTable
CREATE TABLE "products_page_intro" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "paragraph" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "products_page_intro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products_subscription_plans" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "badge" TEXT,
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Choisir',
    "ctaUrl" TEXT NOT NULL DEFAULT '/contact/',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products_subscription_rows" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "essential" TEXT NOT NULL DEFAULT '',
    "prestige" TEXT NOT NULL DEFAULT '',
    "premium" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_subscription_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products_boost_section" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 2000,
    "duration" INTEGER NOT NULL DEFAULT 72,
    "imageUrl" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT 'En savoir plus',
    "ctaUrl" TEXT NOT NULL DEFAULT '/contact/',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "products_boost_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products_ads_section" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "formats" TEXT NOT NULL,
    "imageUrl" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Nous contacter',
    "ctaUrl" TEXT NOT NULL DEFAULT '/contact/',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "products_ads_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products_data_packs" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📊',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Acheter ce rapport',
    "ctaUrl" TEXT NOT NULL DEFAULT '/contact/',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_data_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products_upcoming" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🚀',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_upcoming_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_subscription_plans_slug_key" ON "products_subscription_plans"("slug");
