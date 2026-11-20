// Centralised HTTP error class and Express error handler middleware
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const ERROR_PAGES: Record<number, string> = {
  500: path.join(process.cwd(), 'public', 'errors', '500.html'),
  503: path.join(process.cwd(), 'public', 'errors', '503.html'),
};

function wantsHtml(req: Request): boolean {
  return !!req.headers.accept?.includes('text/html');
}

export function handleHttpError(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    const page = ERROR_PAGES[err.statusCode];
    if (page && wantsHtml(req)) {
      res.status(err.statusCode).sendFile(page);
      return;
    }
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Erreurs du client levées par body-parser / multer (JSON malformé, corps trop volumineux,
  // fichier refusé) : réponse 4xx explicite plutôt qu'une 500.
  const e = err as Error & { type?: string; status?: number; statusCode?: number; code?: string };
  const clientStatus = e.status ?? e.statusCode;
  if (e.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Corps de requête JSON invalide' });
    return;
  }
  if (e.type === 'entity.too.large' || e.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'Contenu trop volumineux' });
    return;
  }
  if (e.name === 'MulterError') {
    res.status(400).json({ error: e.message || 'Fichier invalide' });
    return;
  }
  if (typeof clientStatus === 'number' && clientStatus >= 400 && clientStatus < 500) {
    res.status(clientStatus).json({ error: e.message || 'Requête invalide' });
    return;
  }

  logger.error('Unhandled error', { error: err.message, path: req.path, stack: err.stack });

  if (wantsHtml(req)) {
    res.status(500).sendFile(ERROR_PAGES[500]);
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
}
