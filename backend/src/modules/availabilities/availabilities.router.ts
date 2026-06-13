// Availabilities routes — calendar management for properties
import { Router } from 'express';
import { getAvailability, setAvailability, blockDates, exportIcal, listIcalFeeds, addIcalFeed, removeIcalFeed, syncIcalFeeds } from './availabilities.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { requireKycApproved } from '../professional/middlewares/professional.middleware';
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
  requireKycApproved,
  validate(SetAvailabilityDto),
  setAvailability
);
availabilitiesRouter.post(
  '/property/:propertyId/block',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  requireKycApproved,
  validate(BlockDatesDto),
  blockDates
);

// Import iCal externe (Airbnb / Booking) — flux par bien
const proGuard = [
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  requireKycApproved,
];
availabilitiesRouter.get('/property/:propertyId/ical-feeds', ...proGuard, listIcalFeeds);
availabilitiesRouter.post('/property/:propertyId/ical-feeds', ...proGuard, addIcalFeed);
availabilitiesRouter.delete('/property/:propertyId/ical-feeds/:feedId', ...proGuard, removeIcalFeed);
availabilitiesRouter.post('/property/:propertyId/ical-feeds/sync', ...proGuard, syncIcalFeeds);
