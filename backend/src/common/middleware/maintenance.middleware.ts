// Maintenance mode — returns 503 + maintenance HTML page when MAINTENANCE_MODE=true.
// Admin auth routes (/api/admin/auth) are exempted so operators can still log in.
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.config';

const MAINTENANCE_PAGE = path.join(process.cwd(), 'public', 'errors', 'maintenance.html');
const EXEMPT_PREFIXES = ['/api/admin/auth', '/api/health'];

export function maintenanceMode(req: Request, res: Response, next: NextFunction): void {
  if (!env.MAINTENANCE_MODE) return next();

  const isExempt = EXEMPT_PREFIXES.some(prefix => req.path.startsWith(prefix));
  if (isExempt) return next();

  const acceptsHtml = req.headers.accept?.includes('text/html');

  if (acceptsHtml) {
    res.status(503).sendFile(MAINTENANCE_PAGE);
  } else {
    res.status(503).json({
      error: 'Service en maintenance. Veuillez réessayer dans quelques minutes.',
      maintenance: true,
    });
  }
}
