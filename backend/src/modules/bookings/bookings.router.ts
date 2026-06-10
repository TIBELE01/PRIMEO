// Bookings routes — reservation lifecycle management
import { Router } from 'express';
import {
  createBooking,
  getBooking,
  listMyBookings,
  cancelBooking,
  confirmBooking,
  completeBooking,
  markCashReceived,
  markNoShow,
  getPaymentStatus,
  getBookingInvoice,
} from './bookings.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { requireKycApproved } from '../professional/middlewares/professional.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { parseId } from '../../common/validators/parse-id.middleware';
import { idempotency } from '../../common/middleware/idempotency.middleware';
import { CreateBookingDto, CancelBookingDto, ListBookingsQueryDto } from './dto/booking.dto';

export const bookingsRouter = Router();

bookingsRouter.use(authenticate);

// /me doit être déclaré avant /:id pour ne pas être capturé par parseId
bookingsRouter.get('/me', validate(ListBookingsQueryDto, 'query'), listMyBookings);
bookingsRouter.get('/', validate(ListBookingsQueryDto, 'query'), listMyBookings);
bookingsRouter.get('/:id', parseId, getBooking);
bookingsRouter.get('/:id/payment-status', parseId, getPaymentStatus);
bookingsRouter.get('/:id/invoice', parseId, getBookingInvoice);
bookingsRouter.post('/', idempotency, validate(CreateBookingDto), createBooking);
bookingsRouter.post('/:id/cancel', parseId, validate(CancelBookingDto), cancelBooking);

// Professional actions
bookingsRouter.post(
  '/:id/confirm',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  requireKycApproved,
  parseId,
  confirmBooking,
);
bookingsRouter.post(
  '/:id/complete',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur', 'admin'),
  requireKycApproved,
  parseId,
  completeBooking,
);
bookingsRouter.post(
  '/:id/cash-received',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  requireKycApproved,
  parseId,
  markCashReceived,
);
bookingsRouter.post(
  '/:id/no-show',
  authorize('restaurateur', 'professional_hebergement', 'professional_hotel', 'professional_immobilier'),
  requireKycApproved,
  parseId,
  markNoShow,
);
