// Preserves raw request body buffer for webhook HMAC signature verification
import { Application, Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export function applyRawBody(app: Application): void {
  app.use('/api/webhooks', (req: Request, _res: Response, next: NextFunction) => {
    let data = Buffer.alloc(0);
    req.on('data', (chunk: Buffer) => {
      data = Buffer.concat([data, chunk]);
    });
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  });
}
