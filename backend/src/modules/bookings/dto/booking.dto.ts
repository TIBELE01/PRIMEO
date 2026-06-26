// Zod DTOs for booking endpoints
import { z } from 'zod';

const BOOKING_STATUSES = [
  'interest_expressed',
  'pending_payment',
  'confirmed',
  'cancelled_by_client',
  'cancelled_by_professional',
  'completed',
] as const;

export const CreateBookingDto = z
  .object({
    propertyId: z.string().min(1),
    startDate: z.string().date(),
    endDate: z.string().date(),
    guests: z.number().int().min(1).max(50),
    paymentOption: z.enum(['full_online', 'ten_percent_online', 'zero_online']),
    specialRequests: z.string().max(500).optional(),
    promoCode: z.string().max(50).trim().optional(),
    // Heure de réservation — utilisée pour les restaurants (réservation de table).
    // Peut contenir l'heure ET une demande spéciale ("19:30 — table en terrasse"),
    // d'où une limite large : un plafond trop bas (20) rejetait toute réservation
    // accompagnée d'une note (400) et bloquait le tunnel restaurant.
    reservationTime: z.string().max(220).trim().optional(),
    // Message facultatif — utilisé pour les demandes d'intérêt immobilier
    interestMessage: z.string().max(500).trim().optional(),
    // Coordonnées du client (confirmées dans le tunnel de réservation) — mettent à jour le profil si fournies
    contactFirstName: z.string().min(1).max(80).trim().optional(),
    contactLastName: z.string().min(1).max(80).trim().optional(),
    contactPhone: z.string().min(8).max(20).trim().optional(),
    contactEmail: z.string().email().max(120).trim().optional(),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: 'endDate doit être postérieur à startDate',
    path: ['endDate'],
  })
  .refine((d) => d.startDate >= new Date().toISOString().split('T')[0], {
    message: 'La date de début doit être aujourd\'hui ou dans le futur',
    path: ['startDate'],
  });
export type CreateBookingInput = z.infer<typeof CreateBookingDto>;

export const CancelBookingDto = z.object({
  reason: z.string().min(5).max(500),
});
export type CancelBookingInput = z.infer<typeof CancelBookingDto>;

export const UpdateBookingDatesDto = z
  .object({
    startDate: z.string().date(),
    endDate: z.string().date(),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: 'endDate doit être postérieur à startDate',
    path: ['endDate'],
  })
  .refine((d) => d.startDate >= new Date().toISOString().split('T')[0], {
    message: 'La date de début doit être aujourd\'hui ou dans le futur',
    path: ['startDate'],
  });
export type UpdateBookingDatesInput = z.infer<typeof UpdateBookingDatesDto>;

export const ListBookingsQueryDto = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  // L'app mobile charge la liste complète des réservations en une page (limit=100)
  // puis les répartit par onglet côté client : le plafond doit donc l'accepter,
  // sinon la requête est rejetée (400) et l'onglet « Réservations » reste vide.
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListBookingsQueryInput = z.infer<typeof ListBookingsQueryDto>;
