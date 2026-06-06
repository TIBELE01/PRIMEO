// Role-based access control middleware — restricts routes by user role
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../constants/roles';
import { HttpError } from '../handlers/http-error.handler';

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role as UserRole)) {
      return next(new HttpError(403, 'Insufficient permissions'));
    }
    next();
  };
}
