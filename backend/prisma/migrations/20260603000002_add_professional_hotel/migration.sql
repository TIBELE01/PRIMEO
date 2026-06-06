-- Ajout du type de compte "professional_hotel" pour les hôtels
-- (distinct de professional_hebergement qui couvre les résidences et appartements)
ALTER TYPE "AccountType" ADD VALUE 'professional_hotel';
