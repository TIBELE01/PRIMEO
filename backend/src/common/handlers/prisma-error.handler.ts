// Converts Prisma client errors into HTTP-friendly responses
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { HttpError } from './http-error.handler';

// Base injoignable, connexion coupée ou pool saturé : l'erreur est passagère (Prisma se
// reconnecte à la requête suivante). On répond 503 + Retry-After pour que les clients
// réessaient, au lieu d'un 500 « erreur interne » qui laisse croire à un bug.
const CONNECTION_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);
const UNAVAILABLE = 'Service momentanément indisponible, veuillez réessayer dans quelques instants';

export function handlePrismaError(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    (err instanceof Prisma.PrismaClientKnownRequestError && CONNECTION_CODES.has(err.code))
  ) {
    res.setHeader('Retry-After', '5');
    return next(new HttpError(503, UNAVAILABLE));
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return next(new HttpError(409, 'Cet élément existe déjà'));
      case 'P2025':
        return next(new HttpError(404, 'Élément introuvable'));
      case 'P2003':
        return next(new HttpError(400, 'Élément lié introuvable'));
      default:
        return next(new HttpError(500, `Database error: ${err.code}`));
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return next(new HttpError(400, 'Format de données invalide'));
  }

  next(err);
}
