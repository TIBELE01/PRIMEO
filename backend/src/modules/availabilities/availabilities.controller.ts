// Availabilities controller
import { Request, Response, NextFunction } from 'express';
import { availabilitiesService } from './availabilities.service';

export async function getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const year = parseInt((req.query['year'] as string) ?? '', 10) || now.getFullYear();
    const month = parseInt((req.query['month'] as string) ?? '', 10) || now.getMonth() + 1;
    const result = await availabilitiesService.getCalendar(req.params.propertyId, year, month);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function setAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await availabilitiesService.set(req.params.propertyId, req.user!.sub, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function blockDates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await availabilitiesService.block(req.params.propertyId, req.user!.sub, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function exportIcal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ical = await availabilitiesService.exportIcal(req.params.propertyId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="primeo-${req.params.propertyId}.ics"`);
    res.send(ical);
  } catch (err) {
    next(err);
  }
}

// ── Import iCal externe (Airbnb / Booking) ──────────────────────────────────

export async function listIcalFeeds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ data: await availabilitiesService.listIcalFeeds(req.params.propertyId, req.user!.sub) });
  } catch (err) { next(err); }
}

export async function addIcalFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const feed = await availabilitiesService.addIcalFeed(req.params.propertyId, req.user!.sub, req.body);
    res.status(201).json({ data: feed });
  } catch (err) { next(err); }
}

export async function removeIcalFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await availabilitiesService.removeIcalFeed(req.params.propertyId, req.params.feedId, req.user!.sub);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function syncIcalFeeds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await availabilitiesService.listIcalFeeds(req.params.propertyId, req.user!.sub); // assert owner
    const result = await availabilitiesService.syncProperty(req.params.propertyId);
    res.json({ data: result });
  } catch (err) { next(err); }
}
