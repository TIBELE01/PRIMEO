// Configuration OpenAPI / Swagger — documentation interactive servie sur /api-docs.
// Les définitions de base sont déclarées ici ; les routes peuvent être enrichies
// via des commentaires JSDoc `@openapi` dans les fichiers *.router.ts.
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Primeo API',
      version: '1.0.0',
      description:
        "API REST de la plateforme Primeo (immobilier & hospitalité en Côte d'Ivoire). " +
        "Authentification par JWT Bearer (jeton Supabase). Les webhooks sont signés HMAC-SHA256.",
      contact: { name: 'Primeo', url: 'https://primeo.ci' },
    },
    servers: [
      { url: env.BACKEND_URL, description: 'Serveur courant' },
      { url: 'https://primeo-api.onrender.com', description: 'Production' },
      { url: 'http://localhost:4000', description: 'Développement local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Message d\'erreur' },
            details: { type: 'object', nullable: true },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            uptime: { type: 'number', example: 1234.56 },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Système', description: 'Santé et métadonnées' },
      { name: 'Auth', description: 'Inscription, OTP, connexion, 2FA' },
      { name: 'Propriétés', description: 'Annonces et recherche' },
      { name: 'Réservations', description: 'Création et gestion des réservations' },
      { name: 'Paiements', description: 'Genius Pay : initiation, statut, remboursement' },
      { name: 'Abonnements', description: 'Formules Starter / Business / Entreprise' },
      { name: 'Webhooks', description: 'Notifications signées (Genius Pay, OneSignal, Brevo, Orange)' },
    ],
    // Documentation inline des endpoints publics clés (fonctionne sans JSDoc par route)
    paths: {
      '/api/health': {
        get: {
          tags: ['Système'],
          summary: "État de santé de l'API",
          security: [],
          responses: {
            '200': {
              description: 'API opérationnelle',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthStatus' },
                },
              },
            },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Connexion par email + mot de passe',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', format: 'password' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Connexion réussie (tokens) ou 2FA requise' },
            '401': {
              description: 'Identifiants invalides',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
          },
        },
      },
      '/api/properties': {
        get: {
          tags: ['Propriétés'],
          summary: 'Liste / recherche des annonces',
          security: [],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'type', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: "Page d'annonces" } },
        },
      },
    },
  },
  // Enrichissement automatique : commentaires @openapi dans les routers/contrôleurs
  apis: ['./src/modules/**/*.router.ts', './src/modules/**/*.controller.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
