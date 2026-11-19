-- Les 3 modes de paiement (100 % en ligne, 10 % en ligne + 90 % sur place, 100 % sur place)
-- sont proposés pour tous les séjours (résidences et hôtels).
UPDATE "properties"
SET "paymentOptions" = ARRAY['full_online', 'ten_percent_online', 'zero_online']::"PaymentOption"[]
WHERE "propertyType" IN ('residence', 'hotel');
