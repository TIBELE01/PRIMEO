// Applies Helmet security headers (CSP, HSTS, X-Frame-Options, etc.)
import { Application } from 'express';
import helmet from 'helmet';

export function applyHelmet(app: Application): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'res.cloudinary.com'],
          connectSrc: ["'self'"],
        },
      },
      // Les assets publics (/demo, factures, pages d'erreur) sont consommés par
      // les frontends Primeo hébergés sur d'autres origines (mobile-web, vitrine).
      // Le défaut "same-origin" bloquerait les <video>/<img> cross-origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    })
  );
}
