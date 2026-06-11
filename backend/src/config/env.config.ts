// Centralised environment validation — fails fast on startup if required vars are missing
import { z } from 'zod';

// Parse cloudinary://api_key:api_secret@cloud_name into its components
function parseCloudinaryUrl(raw: string | undefined): { cloudName: string; apiKey: string; apiSecret: string } | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return {
      apiKey: url.username,
      apiSecret: url.password,
      cloudName: url.hostname,
    };
  } catch {
    return null;
  }
}

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Database (Supabase PostgreSQL)
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),

  // App URLs
  PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  BACKEND_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().url().optional(),

  // Supabase Auth
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Admin seed
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ALLOW_DEV_ADMIN_SEED: z.string().transform(v => v === 'true').default('false'),

  // OTP bypass — set to "true" to skip SMS/OTP check (testing only, never in real production)
  SKIP_OTP_VERIFICATION: z.string().transform(v => v === 'true').default('false'),

  // Mode maintenance — force le 503 sur toute l'API dès le démarrage (la bascule
  // à chaud se fait via platform_config['maintenance_mode'], endpoint admin)
  MAINTENANCE_MODE: z.string().transform(v => v === 'true').default('false'),

  // Cookies
  COOKIE_SECURE: z.string().transform(v => v === 'true').default('true'),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('none'),
  COOKIE_DOMAIN: z.string().optional(),

  // Genius Pay
  GENIUS_PAY_API_KEY: z.string().optional(),
  GENIUS_PAY_SECRET_API_KEY: z.string().optional(),
  GENIUS_PAY_WEBHOOK_SECRET: z.string().optional(),
  GENIUS_PAY_API_URL: z.string().url().optional(),

  // Brevo (email)
  BREVO_API_KEY: z.string().optional(),
  BREVO_SMTP_HOST: z.string().optional(),
  BREVO_SMTP_PORT: z.coerce.number().optional(),
  BREVO_SMTP_USER: z.string().optional(),
  BREVO_SMTP_PASS: z.string().optional(),
  BREVO_WEBHOOK_SECRET: z.string().optional(),

  // OneSignal (push notifications)
  ONESIGNAL_APP_ID: z.string().optional(),
  ONESIGNAL_REST_API_KEY: z.string().optional(),
  // Shared secret for verifying X-OneSignal-Signature on incoming webhook events.
  // Configure the same value in the OneSignal dashboard under Webhooks → Headers.
  ONESIGNAL_WEBHOOK_SECRET: z.string().optional(),

  // Orange SMS (OTP)
  ORANGE_CLIENT_ID: z.string().optional(),
  ORANGE_CLIENT_SECRET: z.string().optional(),
  ORANGE_SENDER: z.string().optional(),
  // Secret partagé pour vérifier les callbacks de livraison Orange (callbackData)
  ORANGE_WEBHOOK_SECRET: z.string().optional(),

  // Cloudinary (media) — parsed from CLOUDINARY_URL
  CLOUDINARY_URL: z.string().optional(),

  // Geoapify (maps)
  GEOAPIFY_API_KEY: z.string().optional(),
  GEOAPIFY_URL: z.string().optional(),

  // Upstash Redis (rate limiting, caching)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  REDIS_URL: z.string().optional(),
  // Set to "true" on multi-instance deployments to enable Socket.io Redis adapter
  SOCKET_IO_REDIS_ENABLED: z.coerce.boolean().default(false),

  // ExchangeRate API (currency conversion)
  EXCHANGERATE_API_KEY: z.string().optional(),
  EXCHANGERATE_BASE_CURRENCY: z.string().default('XOF'),

  // CORS — comma-separated list of allowed origins; supports wildcards (*.netlify.app)
  // Production origins: vitrine (primeo.ci), admin + all Render services (*.onrender.com)
  CORS_ORIGINS: z.string().default('http://localhost:3001,http://localhost:3000,http://localhost:5173,https://primeo.ci,https://www.primeo.ci,*.onrender.com,*.netlify.app,*.vercel.app'),

  // Sentry (error tracking)
  SENTRY_DSN: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  const errors = parsed.error.flatten().fieldErrors;
  for (const [key, msgs] of Object.entries(errors)) {
    console.error(`  ${key}: ${msgs?.join(', ')}`);
  }
  process.exit(1);
}

export const env = parsed.data;

// ─── Sécurité : le bypass OTP est INTERDIT en production ──────────────────────
// SKIP_OTP_VERIFICATION ne doit jamais court-circuiter la vérification SMS en
// production. Si la variable est positionnée à true en prod, on l'ignore et on
// force la vérification, avec un avertissement bien visible dans les logs.
if (env.NODE_ENV === 'production' && env.SKIP_OTP_VERIFICATION) {
  // eslint-disable-next-line no-console
  console.error(
    '[SÉCURITÉ] SKIP_OTP_VERIFICATION=true est IGNORÉ en production — la vérification OTP est forcée.',
  );
  env.SKIP_OTP_VERIFICATION = false;
}

// Derived: parsed Cloudinary credentials from CLOUDINARY_URL
export const cloudinaryParsed = parseCloudinaryUrl(env.CLOUDINARY_URL);

export type Env = typeof env;
