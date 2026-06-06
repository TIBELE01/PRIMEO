// Restaurant property entity — restauration-specific view
import type { Property } from '@prisma/client';
export type RestaurantPropertyEntity = Property & { sector: 'restauration' };
