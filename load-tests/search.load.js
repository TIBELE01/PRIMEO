/**
 * Test de charge — GET /api/properties (endpoint de recherche, le plus sollicité)
 *
 * Objectif : 50 requêtes/seconde pendant 30 s.
 * Seuils    : p95 < 500 ms, taux d'erreur < 1 %.
 *
 * Exécution locale :
 *   k6 run load-tests/search.load.js
 *   k6 run --env BASE_URL=https://primeo-api-sszr.onrender.com load-tests/search.load.js
 *
 * Voir load-tests/README.md pour l'installation de k6 et l'exécution en CI.
 */
import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('search_errors');
const searchLatency = new Trend('search_latency_ms', true);

export const options = {
  scenarios: {
    // 50 itérations/seconde garanties pendant 30 s (taux d'arrivée constant)
    constant_50rps: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 60,
      maxVUs: 120,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // SLA latence
    search_errors: ['rate<0.01'],     // < 1 % d'erreurs
  },
};

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');

// Jeux de paramètres variés : ville, dates, fourchette de prix, type
const QUERIES = [
  { city: 'Abidjan', type: 'hebergement', minPrice: '10000', maxPrice: '100000', page: '1', limit: '20' },
  { city: 'Abidjan', type: 'hotel', checkIn: '2026-07-01', checkOut: '2026-07-04', guests: '2' },
  { city: 'Yamoussoukro', type: 'hebergement', minPrice: '5000', maxPrice: '50000' },
  { city: 'Bouaké', type: 'restaurant', page: '1', limit: '20' },
  { type: 'immobilier', minPrice: '0', maxPrice: '50000000' },
  { city: 'Abidjan', checkIn: '2026-08-10', checkOut: '2026-08-15', guests: '4', paymentOption: 'full_online' },
  { page: '2', limit: '20' },
];

export default function () {
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const qs = Object.entries(q).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const res = http.get(`${BASE_URL}/api/properties?${qs}`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'search' },
  });

  const ok = check(res, {
    'statut 200': (r) => r.status === 200,
    'réponse < 500 ms': (r) => r.timings.duration < 500,
    'corps non vide': (r) => !!r.body && r.body.length > 0,
  });

  errorRate.add(!ok);
  searchLatency.add(res.timings.duration);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] ?? 0;
  const rps = data.metrics.http_reqs?.values?.rate ?? 0;
  const err = data.metrics.search_errors?.values?.rate ?? 0;
  const pass = p95 < 500 && err < 0.01;

  /* eslint-disable no-console */
  console.log('\n── Résumé recherche ──────────────────────────');
  console.log(`  Débit moyen : ${rps.toFixed(1)} req/s (cible 50)`);
  console.log(`  p95 latence : ${p95.toFixed(0)} ms (seuil 500)`);
  console.log(`  Taux erreur : ${(err * 100).toFixed(2)} % (seuil 1 %)`);
  console.log(`  Résultat    : ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('──────────────────────────────────────────────\n');

  return { stdout: '' };
}
