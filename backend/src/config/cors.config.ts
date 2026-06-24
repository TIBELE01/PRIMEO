// CORS configuration — strict whitelist for allowed origins
// Supports exact matches and wildcard patterns (e.g. *.netlify.app, *.vercel.app)
import { CorsOptions } from 'cors';
import { env } from './env.config';

const rawOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);

function isAllowed(origin: string): boolean {
  for (const allowed of rawOrigins) {
    if (allowed === origin) return true;
    // Wildcard support: *.netlify.app matches foo.netlify.app
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1); // .netlify.app
      if (origin.endsWith(suffix)) return true;
    }
  }
  return false;
}

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (native mobile apps, Postman, server-to-server)
    if (!origin || isAllowed(origin)) {
      callback(null, true);
    } else {
      // Origine non autorisée : rejet PROPRE (réponse sans en-tête
      // Access-Control-Allow-Origin) au lieu de lever une erreur — qui se
      // transformerait en 500 et masquerait le vrai blocage CORS côté navigateur.
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Idempotency-Key'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
};
