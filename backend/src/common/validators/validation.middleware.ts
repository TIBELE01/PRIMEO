// Zod request validation middleware — validates body, params and query
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { HttpError } from '../handlers/http-error.handler';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return next(new HttpError(400, 'Validation error', errors));
    }
    req[target] = result.data;
    next();
  };
}
