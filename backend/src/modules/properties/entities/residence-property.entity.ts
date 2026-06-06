// Residence property entity — hébergement-specific view
import type { Property } from '@prisma/client';
export type ResidencePropertyEntity = Property & { sector: 'hebergement' };
