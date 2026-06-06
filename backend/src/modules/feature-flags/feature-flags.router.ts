// Routes feature flags — public (GET) et admin (GET/PUT/DELETE)
import { Router } from 'express';
import { getPublicFlags } from './feature-flags.controller';

export const featureFlagsRouter = Router();

// Endpoint public — aucune auth requise (utilisé par mobile + frontend)
featureFlagsRouter.get('/', getPublicFlags);
