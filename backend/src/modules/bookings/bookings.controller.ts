// Bookings controller — reservation lifecycle
import { Request, Response, NextFunction } from 'express';
import { bookingsService } from './bookings.service';
import { restaurantService } from '../restaurant/restaurant.service';

export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await bookingsService.create(req.user!.sub, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const booking = await bookingsService.getById(req.params.id, req.user!.sub);
    res.json(booking);
  } catch (err) {
    next(err);
  }
}

export async function listMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await bookingsService.listForUser(req.user!.sub, req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await bookingsService.cancel(req.params.id, req.user!, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function confirmBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await bookingsService.confirm(req.params.id, req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function completeBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await bookingsService.complete(req.params.id, req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markCashReceived(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await bookingsService.markCashReceived(req.params.id, req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markNoShow(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await restaurantService.markNoShow(req.params.id, req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await bookingsService.syncPaymentStatus(req.params.id, req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBookingInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await bookingsService.getInvoice(req.params.id, req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
