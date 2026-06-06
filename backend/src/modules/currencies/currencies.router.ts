// Currencies routes — public endpoint for mobile app startup
// Rates are indicative only; no auth required since no sensitive data is exposed.
import { Router } from 'express';
import { getRates } from './currencies.controller';

export const currenciesRouter = Router();

// GET /api/currencies/rates — returns XOF→EUR and XOF→USD with lastUpdated timestamp
currenciesRouter.get('/rates', getRates);
