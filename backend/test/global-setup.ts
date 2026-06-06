// Configuration globale des tests e2e — charge l'environnement et fixe des valeurs de repli
import * as dotenv from 'dotenv';
import * as path from 'path';

export default async function globalSetup(): Promise<void> {
  // Charger le .env du backend s'il existe
  dotenv.config({ path: path.resolve(__dirname, '../.env') });

  // Environnement de test
  process.env.NODE_ENV = 'test';

  // Valeurs de repli pour permettre à l'application de démarrer si une variable manque.
  // Les tests e2e existants ne vérifient que les réponses 401 (aucun accès base de données).
  const fallbacks: Record<string, string> = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/primeo_test?schema=public',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long-000',
    COOKIE_SECURE: 'false',
  };

  for (const [key, value] of Object.entries(fallbacks)) {
    if (!process.env[key]) process.env[key] = value;
  }
}
