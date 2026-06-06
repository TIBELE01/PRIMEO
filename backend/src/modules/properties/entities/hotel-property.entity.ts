// Hotel property entity — hôtellerie-specific view
import type { Property } from '@prisma/client';
export type HotelPropertyEntity = Property & { sector: 'hotellerie' };
