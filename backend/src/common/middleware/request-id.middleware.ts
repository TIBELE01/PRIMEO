// Attaches a unique request ID to every incoming request for log correlation
import { Application, Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function applyRequestId(app: Application): void {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();
    req.id = id;
    res.setHeader('X-Request-ID', id);
    next();
  });
}
