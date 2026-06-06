// Converts Prisma client errors into HTTP-friendly responses
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { HttpError } from './http-error.handler';

export function handlePrismaError(
  err: Error,
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return next(new HttpError(409, 'Resource already exists (unique constraint violation)'));
      case 'P2025':
        return next(new HttpError(404, 'Resource not found'));
      case 'P2003':
        return next(new HttpError(400, 'Foreign key constraint violation'));
      default:
        return next(new HttpError(500, `Database error: ${err.code}`));
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return next(new HttpError(400, 'Invalid data format'));
  }

  next(err);
}
