// Analytics first-party respectueux de la vie privée — envoie des événements
// ANONYMISÉS au backend Primeo (/api/analytics/events) :
//   - aucun envoi sans consentement explicite (bandeau au premier lancement) ;
//   - aucune donnée personnelle : ni userId, ni email, ni IP côté stockage —
//     seulement un identifiant de session aléatoire local et le rôle générique ;
//   - envoi par lots (toutes les 15 s ou 10 événements) pour économiser réseau
//     et batterie ; échecs silencieux (l'analytics ne doit jamais gêner l'app).
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../constants/config';

const CONSENT_KEY = '@primeo_analytics_consent'; // 'granted' | 'denied'
const SESSION_KEY = '@primeo_analytics_session';

const FLUSH_INTERVAL_MS = 15_000;
const FLUSH_BATCH_SIZE = 10;

export type TrackedEvent =
  | 'signup'
  | 'login'
  | 'search'
  | 'property_view'
  | 'booking_created'
  | 'payment_success'
  | 'interest_expressed';

interface QueuedEvent {
  name: TrackedEvent;
  platform: 'mobile';
  role?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

let consent: 'granted' | 'denied' | null = null;
let sessionId: string | null = null;
let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function randomId(): string {
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('');
}

/** Charge le consentement et l'identifiant de session depuis le stockage local. */
export async function initAnalytics(): Promise<'granted' | 'denied' | null> {
  try {
    const stored = await AsyncStorage.getItem(CONSENT_KEY);
    consent = stored === 'granted' || stored === 'denied' ? stored : null;
    let sid = await AsyncStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = randomId();
      await AsyncStorage.setItem(SESSION_KEY, sid);
    }
    sessionId = sid;
  } catch {
    consent = null;
  }
  return consent;
}

export function getAnalyticsConsent(): 'granted' | 'denied' | null {
  return consent;
}

/** Enregistre le choix de l'utilisateur (bandeau de consentement ou réglages). */
export async function setAnalyticsConsent(value: 'granted' | 'denied'): Promise<void> {
  consent = value;
  try {
    await AsyncStorage.setItem(CONSENT_KEY, value);
  } catch { /* stockage indisponible : le choix vaut pour la session courante */ }
  if (value === 'denied') {
    queue = [];
    if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
  }
}

async function flush(): Promise<void> {
  if (!queue.length || consent !== 'granted') return;
  const batch = queue.splice(0, FLUSH_BATCH_SIZE);
  try {
    await axios.post(`${API_URL}/api/analytics/events`, { events: batch }, { timeout: 8_000 });
  } catch {
    // Échec réseau : on abandonne le lot (les événements analytics ne sont pas critiques)
  }
}

/**
 * Empile un événement anonymisé. No-op tant que le consentement n'est pas accordé.
 * `role` est le type de compte générique (client / professional / anonymous) —
 * jamais d'identifiant individuel.
 */
export function trackEvent(name: TrackedEvent, metadata?: Record<string, unknown>, role?: string): void {
  if (consent !== 'granted') return;
  queue.push({
    name,
    platform: 'mobile',
    role: role ?? 'anonymous',
    sessionId: sessionId ?? undefined,
    metadata,
  });
  if (queue.length >= FLUSH_BATCH_SIZE) {
    void flush();
  } else if (!flushTimer) {
    flushTimer = setInterval(() => { void flush(); }, FLUSH_INTERVAL_MS);
  }
}
