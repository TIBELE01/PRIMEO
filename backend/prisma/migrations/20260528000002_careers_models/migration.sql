-- CreateTable
CREATE TABLE "careers_presentation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Construisons l''avenir énergétique ensemble',
    "intro1" TEXT NOT NULL DEFAULT 'Chez Primeo, chaque ligne de code, chaque partenariat, chaque décision contribue à un objectif commun : rendre l''énergie accessible et maîtrisable pour tous.',
    "intro2" TEXT,
    "intro3" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "careers_presentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers_team" (
    "id" TEXT NOT NULL,
    "photoUrl" TEXT,
    "photoPublicId" TEXT,
    "text" TEXT NOT NULL DEFAULT 'Une équipe soudée, passionnée, qui croit profondément en sa mission.',
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "careers_team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers_values" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🌟',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers_benefits" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers_faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers_jobs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Abidjan',
    "type" TEXT NOT NULL DEFAULT 'CDI',
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "offer" TEXT,
    "process" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers_spontaneous" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "cvUrl" TEXT,
    "cvPublicId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "notes" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_spontaneous_pkey" PRIMARY KEY ("id")
);
