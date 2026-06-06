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
