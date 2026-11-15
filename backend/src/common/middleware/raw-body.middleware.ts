// Corps brut des webhooks — conservé pour la vérification de signature HMAC.
//
// Les routes /api/webhooks/* sont lues ici une seule fois, en binaire, par
// express.raw. Le tampon est exposé dans req.rawBody (base du calcul HMAC), puis
// décodé en JSON dans req.body pour les handlers.
//
// express.raw marque la requête comme déjà analysée : le express.json() global,
// monté après ce middleware, l'ignore. (L'ancienne implémentation consommait le
// flux à la main ; express.json() échouait ensuite avec « stream is not
// readable » et tous les webhooks JSON répondaient 500.)
import express, { Application, Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

// Les charges utiles des prestataires (Genius Pay, Brevo, OneSignal, Orange)
// font quelques kilo-octets : 1 Mo laisse de la marge tout en bornant la mémoire.
const WEBHOOK_BODY_LIMIT = '1mb';

export function applyRawBody(app: Application): void {
  app.use(
    '/api/webhooks',
    // type: () => true → on capture le corps quel que soit le Content-Type annoncé
    express.raw({ type: () => true, limit: WEBHOOK_BODY_LIMIT }),
    (req: Request, res: Response, next: NextFunction): void => {
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      req.rawBody = raw;

      if (raw.length === 0) {
        req.body = {};
        next();
        return;
      }

      try {
        req.body = JSON.parse(raw.toString('utf8'));
      } catch {
        res.status(400).json({ error: 'Invalid JSON payload' });
        return;
      }
      next();
    },
  );
}
