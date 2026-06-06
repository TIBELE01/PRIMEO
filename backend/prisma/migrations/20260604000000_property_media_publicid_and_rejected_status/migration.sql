-- Persistance des médias Cloudinary : ajout du public_id pour pouvoir supprimer
-- l'image du CDN, et nouveau statut "rejected" pour la modération des annonces.
ALTER TABLE "property_media" ADD COLUMN "publicId" TEXT;
ALTER TYPE "PropertyStatus" ADD VALUE 'rejected';
