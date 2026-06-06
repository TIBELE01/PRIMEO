// Availabilities routes — calendar management for properties
import { Router } from 'express';
import { getAvailability, setAvailability, blockDates, exportIcal } from './availabilities.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { SetAvailabilityDto, BlockDatesDto } from './dto/availability.dto';

export const availabilitiesRouter = Router();

// Public: monthly calendar for a property (?year=YYYY&month=M)
availabilitiesRouter.get('/property/:propertyId', getAvailability);

// Public: iCal feed for external calendar subscription (Google Calendar, Outlook)
availabilitiesRouter.get('/property/:propertyId/ical', exportIcal);

availabilitiesRouter.use(authenticate);
availabilitiesRouter.post(
  '/property/:propertyId',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  validate(SetAvailabilityDto),
  setAvailability
);
availabilitiesRouter.post(
  '/property/:propertyId/block',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  validate(BlockDatesDto),
  blockDates
);
