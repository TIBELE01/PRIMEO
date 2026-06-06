# Primeo — Architecture système

## Vue d'ensemble

Primeo est une plateforme mobile-first de réservation couvrant quatre secteurs (hébergement, hôtellerie, immobilier, restauration) en Côte d'Ivoire. L'architecture suit une approche **API-first** avec des composants indépendants déployés séparément.

---

## Principes fondamentaux

| Principe | Description |
|---|---|
| **Séparation des responsabilités** | Backend, mobile, admin et site légal sont des projets indépendants pouvant évoluer sans impacter les autres |
| **Modularité** | Le backend est organisé en 21 modules fonctionnels (auth, bookings, payments, etc.), chacun encapsulant ses routes, contrôleurs et services |
| **Stateless** | Aucun état de session côté serveur — état délégué aux JWT et à la base de données, permettant la scalabilité horizontale |
| **API-first** | Toutes les fonctionnalités exposées via une API REST documentée (OpenAPI/Swagger) à `/api-docs` |
| **Résilience** | Points de défaillance critiques (webhooks, paiements) couverts par des cron jobs de rattrapage et une retry logic |

---

## Composants

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Mobile                        │
│            React Native + Expo + TypeScript                  │
│              iOS & Android — clients + pros                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / WebSocket (Socket.io)
┌──────────────────────▼──────────────────────────────────────┐
│                   API Backend                                │
│           Node.js + Express + TypeScript                     │
│                api.primeo.ci (Render)                        │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  REST API   │  │  Socket.io   │  │   Cron Jobs      │   │
│  │  /api/...   │  │  /chat ns    │  │  (abonnements,   │   │
│  └─────────────┘  └──────────────┘  │   webhooks...)   │   │
│                                     └──────────────────┘   │
└──────┬────────────────────────────────────────┬─────────────┘
       │                                        │
┌──────▼──────────┐                 ┌───────────▼────────────┐
│   PostgreSQL    │                 │   Services tiers        │
│   (Supabase)    │                 │                         │
│                 │                 │  Genius Pay (paiements) │
│  Prisma ORM     │                 │  Brevo (emails)         │
│  Migrations     │                 │  OneSignal (push)       │
│  versionnées    │                 │  Orange SMS (OTP)       │
└─────────────────┘                 │  Cloudinary (médias)    │
                                    │  Geoapify (cartes)      │
┌─────────────────┐                 │  Upstash Redis (cache)  │
│  Dashboard Admin│                 └────────────────────────┘
│  Next.js        │
│  admin.primeo.ci│
└─────────────────┘

┌─────────────────┐
│  Site légal     │
│  HTML/CSS pur   │
│  legal.primeo.ci│
│  (Netlify)      │
└─────────────────┘
```

---

## Flux de réservation (option 10 % en ligne)

```
Client (mobile)          Backend                    Genius Pay
     │                      │                           │
     │── POST /api/bookings ─▶                           │
     │                      │── Vérifie disponibilité   │
     │                      │── POST /payments/initiate ▶│
     │                      │◀── { checkout_url } ──────│
     │◀── { checkout_url } ─│                           │
     │                      │                           │
     │── WebView checkout ──────────────────────────────▶│
     │◀──────────── Paiement effectué ──────────────────│
     │                      │◀── Webhook (HMAC signé) ──│
     │                      │── Confirme réservation    │
     │                      │── Bloque disponibilités   │
     │◀── Push + email ─────│── Notifications           │
```

---

## Flux de messagerie temps réel

```
Client (mobile)          Backend (Socket.io)         DB
     │                         │                      │
     │── connect (JWT token) ──▶                       │
     │── join_room(booking_id) ▶                       │
     │                         │                      │
     │── send_message ─────────▶── INSERT messages ──▶│
     │                         │◀─────────────────────│
     │◀── receive_message ─────│ (broadcast room)     │
     │                         │                      │
```

---

## Sécurité

- **TLS 1.3** sur toutes les communications
- **bcrypt** (coût 12) pour les mots de passe
- **JWT** : access token 1h, refresh token 7j (révocable en DB)
- **TOTP 2FA** obligatoire pour les comptes professionnels
- **Rate limiting** : 5 tentatives/15min sur les endpoints d'auth (via Upstash Redis)
- **Helmet** : en-têtes de sécurité (CSP, X-Frame-Options, HSTS)
- **CORS** strict : origines whitelist uniquement
- **HMAC SHA-256** + nonce anti-rejeu sur les webhooks Genius Pay

---

## Infrastructure

| Composant | Hébergement | URL |
|---|---|---|
| API Backend | Render (starter) | `api.primeo.ci` |
| Dashboard Admin | Render | `admin.primeo.ci` |
| Base de données | Supabase PostgreSQL | — |
| Site légal | Netlify | `legal.primeo.ci` |
| Médias | Cloudinary | CDN auto |
| Redis | Upstash (REST) | — |

---

## Modèle de données (tables principales)

| Table | Rôle |
|---|---|
| `users` | Tous les comptes (clients, professionnels, admins) |
| `professional_profiles` | Profils KYC des professionnels |
| `properties` | Annonces (résidences, hôtels, immobilier, restaurants) |
| `availabilities` | Calendrier de disponibilité par propriété |
| `bookings` | Réservations avec option de paiement |
| `transactions` | Historique des paiements Genius Pay |
| `subscriptions` | Abonnements professionnels (Essentiel/Prestige/Premium) |
| `messages` | Messagerie temps réel liée aux réservations |
| `reviews` | Avis clients sur les propriétés |
| `disputes` | Litiges gérés par l'admin |
| `boosts` | Mises en avant payantes des annonces |
| `referrals` | Système de parrainage |
| `logs_audit` | Journalisation des actions sensibles (6 mois) |
