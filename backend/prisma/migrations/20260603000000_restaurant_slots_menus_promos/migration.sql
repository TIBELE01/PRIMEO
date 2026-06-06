-- §8.3 Restaurant time slots
CREATE TABLE "restaurant_time_slots" (
    "id"          TEXT NOT NULL,
    "propertyId"  TEXT NOT NULL,
    "dayOfWeek"   INTEGER NOT NULL,
    "startTime"   TEXT NOT NULL,
    "endTime"     TEXT NOT NULL,
    "maxCapacity" INTEGER NOT NULL,
    "isBlocked"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "restaurant_time_slots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "restaurant_time_slots_propertyId_idx" ON "restaurant_time_slots"("propertyId");

ALTER TABLE "restaurant_time_slots"
    ADD CONSTRAINT "restaurant_time_slots_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- §8.4 Restaurant special menus
CREATE TABLE "restaurant_special_menus" (
    "id"             TEXT NOT NULL,
    "propertyId"     TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "description"    TEXT,
    "date"           DATE NOT NULL,
    "pricePerPerson" INTEGER NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "restaurant_special_menus_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "restaurant_special_menus_propertyId_idx" ON "restaurant_special_menus"("propertyId");

ALTER TABLE "restaurant_special_menus"
    ADD CONSTRAINT "restaurant_special_menus_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- §8.8 Restaurant promotions
CREATE TABLE "restaurant_promotions" (
    "id"            TEXT NOT NULL,
    "propertyId"    TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "description"   TEXT,
    "discountType"  TEXT NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "validUntil"    TIMESTAMP(3),
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "restaurant_promotions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "restaurant_promotions_propertyId_idx" ON "restaurant_promotions"("propertyId");

ALTER TABLE "restaurant_promotions"
    ADD CONSTRAINT "restaurant_promotions_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- §8.5 No-show flag on bookings
ALTER TABLE "bookings"
    ADD COLUMN "isNoShow" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "noShowAt" TIMESTAMP(3);
