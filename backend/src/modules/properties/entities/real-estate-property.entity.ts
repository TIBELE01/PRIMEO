// Real estate property entity — immobilier-specific view
import type { Property } from '@prisma/client';
export type RealEstatePropertyEntity = Property & { sector: 'immobilier' };
