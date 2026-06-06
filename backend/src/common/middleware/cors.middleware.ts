// Applies CORS policy with strict origin whitelist
import { Application } from 'express';
import cors from 'cors';
import { corsConfig } from '../../config/cors.config';

export function applyCors(app: Application): void {
  app.use(cors(corsConfig));
  app.options('*', cors(corsConfig));
}
