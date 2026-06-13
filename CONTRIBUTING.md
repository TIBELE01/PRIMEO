# Contributing

Merci de votre intérêt pour Primeo. Pour contribuer, veuillez suivre les conventions ci-dessous.

## Prérequis

- Node.js ≥ 20, pnpm ≥ 9
- PostgreSQL 15+ (ou accès au projet Supabase de développement)
- Expo CLI pour le mobile

## Workflow

1. Créez une branche depuis `main` : `git checkout -b feat/ma-fonctionnalite`
2. Installez les dépendances : `pnpm install` à la racine
3. Copiez `.env.example` → `.env` et renseignez les variables locales
4. Lancez les migrations : `cd backend && npx prisma migrate dev`
5. Exécutez les tests : `pnpm test` (backend) et `pnpm test` (mobile)
6. Ouvrez une Pull Request vers `main` avec une description claire

## Conventions

- **Commits** : format Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- **TypeScript** : typage strict ; pas de `any` sans justification
- **Sécurité** : ne jamais committer de fichier `.env` contenant de vraies clés
- **Migrations Prisma** : toujours idempotentes (`IF NOT EXISTS`, `IF EXISTS`)
- **RLS** : toute nouvelle table publique doit avoir une politique `deny_all_api_roles`

Pour toute question, ouvrez une issue sur le dépôt.
