// Validates route parameter :id — accepts cuid / UUID / short slug strings
import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../handlers/http-error.handler';

// Accepte : cuid (~25 chars), UUID v4 (36 chars), slugs courts ex. imm-1, res-7, prop_005 (min 2 chars)
const VALID_ID = /^[a-z0-9][a-z0-9_-]{1,49}$/;

export function parseId(req: Request, _res: Response, next: NextFunction): void {
  const { id } = req.params;
  if (!id || !VALID_ID.test(id)) {
    return next(new HttpError(400, `Invalid ID: ${id}`));
  }
  next();
}
