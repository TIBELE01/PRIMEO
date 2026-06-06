// DTO for creating a named favorites list (future feature)
import { z } from 'zod';

export const CreateFavoritesListDto = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});
export type CreateFavoritesListInput = z.infer<typeof CreateFavoritesListDto>;
