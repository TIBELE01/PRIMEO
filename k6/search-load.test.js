/**
 * Task 40 — Test de charge k6 : GET /api/properties/search
 *
 * Objectif : 50 requêtes/seconde, P95 < 500 ms
 *
 * Usage local :
 *   k6 run k6/search-load.test.js
 *   k6 run --env BASE_URL=https://staging.primeo.ci k6/search-load.test.js
 *
 * Usage CI (staging) :
 *   k6 run --env BASE_URL=$STAGING_URL k6/search-load.test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate   = new Rate('search_errors');
const searchTrend = new Trend('search_duration_ms', true);

export const options = {
  scenarios: {
    // Montée progressive jusqu'à 50 rps, maintenu 1 min, descente douce
    search_load: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 60,
      maxVUs: 120,
      stages: [
        { duration: '15s', target: 50 }, // montée : 5 → 50 rps
        { duration: '60s', target: 50 }, // plateau : 50 rps
        { duration: '10s', target: 0  }, // descente
      ],
    },
  },
  thresholds: {
    // P95 sous 500 ms (SLA)
    'http_req_duration{scenario:search_load}': ['p(95)<500'],
    // Taux d'erreur HTTP < 5 %
    'search_errors': ['rate<0.05'],
    // Aucune panne totale (P99 < 2 s)
    'http_req_duration{scenario:search_load}': ['p(99)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Paramètres de recherche variés pour simuler un trafic réaliste
const SEARCH_VARIANTS = [
  { type: 'hebergement', city: 'Abidjan',    page: '1', limit: '20' },
  { type: 'hebergement', city: 'Yamoussoukro', page: '1', limit: '20' },
  { type: 'hotel',       city: 'Abidjan',    page: '2', limit: '10' },
  { type: 'restaurant',  city: 'Abidjan',    page: '1', limit: '20' },
  { type: 'hebergement',                     page: '1', limit: '20' },
  { paymentOption: 'zero_online',            page: '1', limit: '20' },
  { paymentOption: 'full_online',            page: '1', limit: '20' },
];

export default function () {
  const variant = SEARCH_VARIANTS[Math.floor(Math.random() * SEARCH_VARIANTS.length)];
  const qs = new URLSearchParams(variant as Record<string, string>).toString();
  const url = `${BASE_URL}/api/properties?${qs}`;

  const res = http.get(url, {
    headers: { 'Accept': 'application/json' },
    tags: { endpoint: 'search' },
  });

  const ok = check(res, {
    'HTTP 200': (r) => r.status === 200,
    'Corps non vide': (r) => (r.body?.length ?? 0) > 0,
    'Temps de réponse < 500 ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!ok);
  searchTrend.add(res.timings.duration);

  // Pas de sleep : le constant-arrival-rate gère le rythme
}

export function handleSummary(data) {
  const p95 = data.metrics['http_req_duration']?.values?.['p(95)'] ?? 0;
  const p99 = data.metrics['http_req_duration']?.values?.['p(99)'] ?? 0;
  const rps = data.metrics['http_reqs']?.values?.rate ?? 0;
  const errRate = data.metrics['search_errors']?.values?.rate ?? 0;

  const passed = p95 < 500 && errRate < 0.05;

  console.log('\n── Résumé test de charge ─────────────────────');
  console.log(`  RPS moyen   : ${rps.toFixed(1)} req/s`);
  console.log(`  P95 latence : ${p95.toFixed(0)} ms  (seuil : 500 ms)`);
  console.log(`  P99 latence : ${p99.toFixed(0)} ms`);
  console.log(`  Taux erreur : ${(errRate * 100).toFixed(2)} %`);
  console.log(`  Résultat    : ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('──────────────────────────────────────────────\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
