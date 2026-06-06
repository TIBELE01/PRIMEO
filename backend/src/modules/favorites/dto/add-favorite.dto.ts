// DTO for adding a property to favorites
import { z } from 'zod';

export const AddFavoriteDto = z.object({
  propertyId: z.string().cuid(),
});
export type AddFavoriteInput = z.infer<typeof AddFavoriteDto>;
