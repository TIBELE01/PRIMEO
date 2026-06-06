-- §8.9 — Food Orders: commandes de nourriture (restaurant)
-- Migration: 20260605000000_food_orders

-- Enums
CREATE TYPE "FoodOrderStatus" AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE "FoodOrderDeliveryType" AS ENUM ('dine_in', 'takeaway', 'delivery');

-- FoodOrder table
CREATE TABLE "food_orders" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "specialInstructions" TEXT,
    "status" "FoodOrderStatus" NOT NULL DEFAULT 'pending',
    "deliveryType" "FoodOrderDeliveryType" NOT NULL DEFAULT 'dine_in',
    "deliveryAddress" TEXT,
    "estimatedMinutes" INTEGER,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_orders_pkey" PRIMARY KEY ("id")
);

-- FoodOrderItem table
CREATE TABLE "food_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_order_items_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "food_orders_propertyId_status_idx" ON "food_orders"("propertyId", "status");
CREATE INDEX "food_orders_clientId_idx" ON "food_orders"("clientId");

-- Foreign keys
ALTER TABLE "food_orders" ADD CONSTRAINT "food_orders_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "food_orders" ADD CONSTRAINT "food_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "food_order_items" ADD CONSTRAINT "food_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "food_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_order_items" ADD CONSTRAINT "food_order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "restaurant_menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
