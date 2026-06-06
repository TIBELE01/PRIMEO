// Local auth middleware — validates email/password presence before auth controller
import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../../../common/handlers/http-error.handler';

export function localAuth(req: Request, _res: Response, next: NextFunction): void {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new HttpError(400, 'Email and password are required'));
  }
  next();
}
