-- AlterTable: add restaurant review criteria fields to Review
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "cuisineRating" INTEGER;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "serviceRating" INTEGER;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "ambianceRating" INTEGER;

-- AlterTable: add availableFrom field to Property
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "availableFrom" TIMESTAMP(3);
