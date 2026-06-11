// DTO de création d'un export de données professionnel
import { z } from 'zod';

export const CreateExportDto = z
  .object({
    type: z.enum(['bookings', 'properties', 'transactions', 'advanced_stats']),
    format: z.enum(['csv', 'pdf']).default('csv'),
    // Période optionnelle (ISO). Par défaut : 3 derniers mois.
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .refine(
    (d) => !d.from || !d.to || new Date(d.from) <= new Date(d.to),
    { message: 'La date de début doit précéder la date de fin', path: ['from'] },
  );

export type CreateExportInput = z.infer<typeof CreateExportDto>;
