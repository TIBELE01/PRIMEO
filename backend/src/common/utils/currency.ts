// ExchangeRate-API client — indicative display rates XOF → EUR / USD
// All real transactions are processed in XOF; these rates are for display only.
import axios from 'axios';
import { prisma } from '../../database/prisma.service';
import { exchangeRateConfig } from '../../config/exchangerate.config';
import { redisSet, redisGet, redisDel } from './redis-client';
import { logger } from './logger';

const CACHE_KEY = `exchange_rates:${exchangeRateConfig.baseCurrency}`;
const CACHE_TTL  = exchangeRateConfig.cacheTtlSeconds; // 24 h

export interface ExchangeRates {
  base:        string;
  rates:       Record<string, number>; // EUR and USD only
  lastUpdated: string;                 // ISO 8601
  source?:     'api' | 'cache' | 'db';
}

// ── DB persistence (upsert each tracked currency) ────────────────────────────

async function persistToDb(rates: Record<string, number>): Promise<void> {
  await Promise.all(
    Object.entries(rates).map(([currency, rate]) =>
      prisma.currencyRate.upsert({
        where:  { currency },
        update: { rate },
        create: { currency, rate },
      }),
    ),
  );
}

// ── DB fallback ───────────────────────────────────────────────────────────────

export async function getStoredRates(): Promise<ExchangeRates | null> {
  const rows = await prisma.currencyRate.findMany({
    where: { currency: { in: [...exchangeRateConfig.trackedCurrencies] } },
  });
  if (!rows.length) return null;

  const rates: Record<string, number> = {};
  let lastUpdated = new Date(0).toISOString();
  for (const row of rows) {
    rates[row.currency] = Number(row.rate);
    if (row.updatedAt.toISOString() > lastUpdated) lastUpdated = row.updatedAt.toISOString();
  }
  return { base: 'XOF', rates, lastUpdated, source: 'db' };
}

// ── API fetch (no cache check — called by refreshExchangeRates) ───────────────

async function fetchFromApi(): Promise<ExchangeRates | null> {
  if (!exchangeRateConfig.apiKey) {
    logger.warn('EXCHANGERATE_API_KEY not set — falling back to stored rates');
    return getStoredRates();
  }

  const response = await axios.get<{
    base_code: string;
    time_last_update_utc: string;
    conversion_rates: Record<string, number>;
  }>(
    `${exchangeRateConfig.baseUrl}/${exchangeRateConfig.apiKey}/latest/${exchangeRateConfig.baseCurrency}`,
    { timeout: 10_000 },
  );

  const allRates = response.data.conversion_rates;
  const rates: Record<string, number> = {};
  for (const currency of exchangeRateConfig.trackedCurrencies) {
    if (allRates[currency] !== undefined) rates[currency] = allRates[currency];
  }

  const data: ExchangeRates = {
    base:        'XOF',
    rates,
    lastUpdated: new Date().toISOString(),
    source:      'api',
  };

  // Persist — Redis (24 h) + DB
  await redisSet(CACHE_KEY, JSON.stringify(data), CACHE_TTL);
  await persistToDb(rates).catch((err) =>
    logger.warn('Currency DB persistence failed', err),
  );

  logger.debug(`Exchange rates refreshed from API: ${JSON.stringify(rates)}`);
  return data;
}

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Returns cached rates (Redis → DB fallback → API).
 * Used by the GET /rates endpoint.
 */
export async function fetchExchangeRates(): Promise<ExchangeRates | null> {
  const cached = await redisGet(CACHE_KEY);
  if (cached) {
    return { ...(JSON.parse(cached) as ExchangeRates), source: 'cache' };
  }

  // Redis miss — try DB first (fast), then API
  const stored = await getStoredRates();
  if (stored) {
    // Re-warm Redis so next requests are fast
    await redisSet(CACHE_KEY, JSON.stringify({ ...stored, source: 'api' }), CACHE_TTL).catch(() => null);
    return stored;
  }

  // No DB data yet — fetch from API
  try {
    return await fetchFromApi();
  } catch (err) {
    logger.warn('fetchExchangeRates: API unavailable, no fallback data', err);
    return null;
  }
}

/**
 * Forces a fresh fetch from ExchangeRate-API, bypassing all caches.
 * Called by the daily cron job and on server startup.
 */
export async function refreshExchangeRates(): Promise<ExchangeRates | null> {
  await redisDel(CACHE_KEY);
  try {
    return await fetchFromApi();
  } catch (err) {
    logger.warn('refreshExchangeRates: API fetch failed', err);
    return getStoredRates(); // return last known rates rather than nothing
  }
}

/** Indicative conversion — for display only, never for transaction amounts. */
export async function convertCurrency(
  amountXof: number,
  targetCurrency: string,
): Promise<number | null> {
  const rates = await fetchExchangeRates();
  if (!rates) return null;
  const rate = rates.rates[targetCurrency];
  if (!rate) return null;
  return Math.round(amountXof * rate * 100) / 100;
}
