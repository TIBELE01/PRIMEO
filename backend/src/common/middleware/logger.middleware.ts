// Structured HTTP request logging — captures request ID, user, timing
import { Application, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function applyLogger(app: Application): void {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startAt) / 1_000_000;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';

      logger.log(level, 'request', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        userId: req.user?.sub,
        ip: req.ip ?? req.socket?.remoteAddress,
        userAgent: req.get('User-Agent'),
        contentLength: res.get('Content-Length') ?? 0,
      });
    });

    next();
  });
}
