// Gzip/Brotli compression for response bodies
import { Application } from 'express';
import compression from 'compression';

export function applyCompression(app: Application): void {
  app.use(compression({ threshold: 1024 }));
}
