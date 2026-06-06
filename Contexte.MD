PRÉSENTATION DE PRIMEO
 
TABLE DES MATIÈRES

PARTIE 1 – INTRODUCTION ET VISION STRATÉGIQUE
1.1   Contexte et problématique
1.2   Objectifs du projet
1.3   Périmètre fonctionnel
1.4   Cibles et personas
1.5   Valeurs et positionnement

PARTIE 2 – ARCHITECTURE GÉNÉRALE
2.1   Principes d'architecture 
2.2   Vue d'ensemble des composants 
2.3   Flux de données 
2.4   Sécurité et conformité
2.5   Hébergement et infrastructure

PARTIE 3 – MODÈLE DE DONNÉES (POSTGRESQL)
3.1   Table des utilisateurs (users)
3.2   Table des profils professionnels
3.3   Table des abonnements
3.4   Table des propriétés
3.5   Table des disponibilités
3.6   Table des réservations
3.7   Table des transactions
3.8   Table des messages
3.9   Table des avis
3.10   Autres tables essentielles
3.11   Index et optimisation 
3.12   Migrations et versionnement

PARTIE 4 – BACKEND (NODE.JS + EXPRESS + TYPESCRIPT)
4.1   Organisation générale du code
4.2   Authentification et gestion des sessions
4.3   Endpoints API principaux
4.4   Services métier
4.5   Gestion des erreurs et logs
4.6   Tâches planifiées (cron)
4.7   Vente de données et analyses
4.8   Messagerie temps réel (Socket.io) 

PARTIE 5 – FRONTEND MOBILE (REACT NATIVE + EXPO + TSX)
5.1   Organisation générale
5.2   Gestion de l'authentification
5.3   Navigation multi-rôles
5.4   Thèmes visuels
5.5   Accessibilité
5.6   Écran d'accueil et découverte
5.7   Recherche avancée et filtres
5.8   Fiche détail d'une propriété
5.9   Processus de réservation
5.10   Gestion des réservations (professionnels)
5.11   Messagerie temps réel
5.12   Avis
5.13   Favoris et listes
5.14   Parrainage
5.15   Paramètres et préférences
5.16   Multi-devises

PARTIE 6 – COMPTES CLIENTS
6.1   Inscription
6.2   Page d'accueil
6.3   Recherche
6.4   Fiche détail
6.5   Processus de réservation
6.6   Gestion des réservations
6.7   Messagerie
6.8   Avis
6.9   Favoris
6.10   Parrainage
6.11   Profil et paramètres
6.12   Mode hors ligne
6.13   Évaluation réciproque

PARTIE 7 – COMPTES PROFESSIONNELS (HÉBERGEMENT, IMMOBILIER)
7.1   Inscription et validation KYC
7.2   Tableau de bord
7.3   Gestion des propriétés
7.4   Calendrier de disponibilité
7.5   Gestion des réservations
7.6   Abonnements et facturation
7.7   Boosts d'annonce
7.8   Statistiques avancées
7.9   Messagerie
7.10   Avis
7.11   Gestion multi-utilisateurs (Premium)

PARTIE 8 – COMPTE RESTAURATEURS
8.1   Inscription et validation
8.2   Tableau de bord restaurateur
8.3   Créneaux et capacité
8.4   Menu en ligne
8.5   Réservations de tables
8.6   Abonnement sans commission
8.7   Avis spécifiques
8.8   Promotions et codes promo

PARTIE 9 – ADMINISTRATION (SITE WEB SÉPARÉ)
9.1   Architecture du dashboard admin
9.2   Authentification et sécurité
9.3   Tableau de bord analytique
9.4   Gestion des utilisateurs
9.5   Modération des annonces
9.6   Gestion des litiges
9.7   Configuration de la plateforme
9.8   Logs système
9.9   Chatbot IA et tickets de support

PARTIE 10 – PAGES EXTERNES (SITE STATIQUE)
10.1   Architecture et hébergement
10.2   Page d'accueil du site légal
10.3   CGU
10.4   Conditions des Professionnels
10.5   Conditions de Vente
10.6   Politique de confidentialité et cookies
10.7   Mentions légales
10.8   Page Contact
10.9   Page À propos

PARTIE 11 – INTÉGRATIONS TIERS
11.1   Genius Pay
11.2   Brevo
11.3   OneSignal
11.4   Orange SMS API
11.5   Cloudinary
11.6   Geoapify (cartes et géolocalisation)
11.7   Prisma (ORM PostgreSQL)
11.8   Backup automatique

PARTIE 12 – QUALITÉ, TESTS ET DÉPLOIEMENT
12.1   Stratégie de tests
12.2   CI/CD (GitHub Actions)
12.3   Monitoring
12.4   Déploiement sur Render
12.5   Déploiement site statique
12.6   Soumission aux stores

PARTIE 13 – ANNEXES
13.1   Glossaire
13.2   Exemples de code
13.3   Schémas d'architecture
13.4   Scripts de migration PostgreSQL
13.5   Variables d'environnement

 
PARTIE 1 – INTRODUCTION ET VISION STRATÉGIQUE

1.1 Contexte et problématique
Le marché de l'hébergement et des services immobiliers en Côte d'Ivoire connaît une croissance soutenue, portée par le développement économique, l'essor du tourisme d'affaires et de loisirs, et l'urbanisation rapide des grandes villes comme Abidjan, Bouaké, Daloa, Yamoussoukro et San-Pédro. Cependant, ce secteur reste largement fragmenté, dominé par des canaux informels (réseaux sociaux, bouche-à-oreille) et des plateformes internationales qui ne sont pas adaptées aux spécificités locales (paiement en FCFA, mobile money, absence de commissions sur les réservations pour les clients, flexibilité des modes de paiement).
Les professionnels locaux – propriétaires de résidences meublées, hôteliers, agents immobiliers ou restaurateurs – peinent à digitaliser leur activité sans subir des commissions élevées (souvent 15 à 20 %). De leur côté, les clients recherchent une solution fiable, transparente et flexible, avec des options de paiement adaptées à leurs habitudes (cash, mobile money, carte).
Primeo répond à ces enjeux en proposant une plateforme unifiée, mobile-first, couvrant quatre grands secteurs : hébergement (résidences meublées, hôtels), immobilier (location de maison, achat de terrain, achat de maison) et restauration. Le modèle économique repose sur des abonnements mensuels et, pour l'hébergement et l'immobilier, sur des commissions dégressives selon la formule choisie. Les restaurants ne paient que l'abonnement, sans commission.

1.2 Objectifs du projet
•	Digitaliser l'offre : permettre aux professionnels de publier, gérer et promouvoir leurs biens via une interface moderne et intuitive.
•	Sécuriser les transactions : grâce à Genius Pay, les paiements en ligne sont traités de manière fiable, avec des webhooks pour confirmer les réservations.
•	Offrir une flexibilité de paiement inégalée : trois options (100 % en ligne, 10 % en ligne + 90 % cash, 0 % en ligne + 100 % cash) couvrent l'ensemble des habitudes locales.
•	Favoriser la confiance : avis vérifiés, badges de qualité (Profil Vérifié, Hôte Premium), visite 3D, messagerie intégrée, litiges gérés par un administrateur.
•	Créer un écosystème complet : en intégrant l'immobilier (location, achat) et la restauration, Primeo devient une plateforme transversale.
•	Assurer une scalabilité technique : avec PostgreSQL, TypeScript, architecture modulaire, CI/CD et tests automatisés.

1.3 Périmètre fonctionnel
•	Pour les clients : inscription, recherche, réservation, paiement, avis, messagerie, favoris, parrainage.
•	Pour les professionnels de l'hébergement et de l'immobilier : gestion des propriétés, calendrier, réservations, abonnements, boosts, statistiques.
•	Pour les restaurateurs : gestion des créneaux, capacité, menu, réservations de tables.
•	Pour l'administration : validation des comptes, modération, litiges, analytics, configuration (site web séparé).
•	Pour les pages légales et d'information : site statique externe avec CGU, mentions, contact, à propos.

1.4 Cibles et personas
Quatre personas principaux ont été définis.
Koffi, le cadre dynamique (35 ans, voyage d'affaires) :
Il recherche un logement proche de son lieu de travail, avec wifi, flexibilité horaire et paiement sécurisé. Il utilise l'option 10 % en ligne + 90 % cash.
Amina, l'investisseuse immobilière (42 ans, propriétaire de deux résidences) :
Elle veut maximiser ses revenus sans y passer trop de temps. Elle souscrit à la formule Prestige et utilise les boosts d'annonce.
M. Koné, hôtelier (50 ans, hôtel 3 étoiles) :
Il cherche à augmenter son taux d'occupation sans payer de commissions excessives. Il choisit la formule Premium (0 % de commission, visibilité prioritaire).
Mme Bamba, restauratrice (38 ans, restaurant gastronomique) :
Elle souhaite gérer ses réservations de tables par créneaux et proposer son menu en ligne. Elle paie un abonnement mensuel sans commission.
L'administrateur :
Supervise l'ensemble, valide les comptes, modère les annonces, traite les litiges et analyse les statistiques depuis son dashboard web séparé.

1.5 Valeurs et positionnement
•	Confiance : grâce à la vérification des comptes, aux avis authentiques, à la gestion des litiges.
•	Flexibilité : trois options de paiement, des formules adaptées à chaque professionnel.
•	Localisation : interface en français, support en français, prix en FCFA, intégration du mobile money et du cash.
•	Innovation : visite 3D, boost d'annonce, messagerie temps réel, analytics avancés.


PARTIE 2 – ARCHITECTURE GÉNÉRALE

2.1 Principes d'architecture
✎ Section ajoutée – absente dans la version originale.
L'architecture de Primeo repose sur cinq principes fondamentaux :
•	Séparation des responsabilités : le backend (API REST), le frontend mobile, le dashboard admin et le site statique sont des projets indépendants, déployés séparément. Chaque composant peut évoluer sans impacter les autres.
•	Modularité : le code backend est organisé en modules fonctionnels (auth, users, properties, bookings, payments, notifications). Chaque module encapsule ses routes, contrôleurs, services et types.
•	Stateless : le backend ne conserve aucun état de session côté serveur. Toute la gestion de l'état est déléguée aux jetons JWT et à la base de données. Les instances peuvent être mises à l'échelle horizontalement.
•	API-first : toutes les fonctionnalités sont exposées via l'API REST documentée (OpenAPI/Swagger). Le dashboard admin et l'application mobile consomment la même API. Cela facilite d'éventuelles intégrations tierces.
•	Résilience : les points de défaillance critiques (webhooks, paiements) sont couverts par des mécanismes de rattrapage (cron jobs, retry logic). Les erreurs imprévues sont capturées par Sentry avant d'atteindre l'utilisateur.

2.2 Vue d'ensemble des composants
✎ Section ajoutée – absente dans la version originale.
La plateforme Primeo est constituée des composants suivants :
•	Application mobile (React Native + Expo + TypeScript) : point d'entrée principal pour les clients et les professionnels. Disponible sur iOS et Android. Communique exclusivement avec l'API backend.
•	API Backend (Node.js + Express + TypeScript) : cœur de la logique métier. Expose une API REST sécurisée. Gère l'authentification, les réservations, les paiements, les notifications, et la persistance des données. Déployé sur Render.
•	Base de données (PostgreSQL) : stockage relationnel principal. Accédée via Prisma ORM. Hébergée sur un service managé (Render DB ou Neon.tech).
•	Dashboard administrateur (React / Next.js) : interface web réservée à l'équipe Primeo. Accès protégé, rôles granulaires. Déployé sur Render.
•	Site statique légal (HTML5 + CSS) : pages légales (CGU, mentions, politique de confidentialité). Hébergé sur Netlify ou Vercel. Aucun JavaScript complexe.
•	Serveur WebSocket (Socket.io) : intégré au backend Express. Gère la messagerie temps réel entre clients et professionnels. Partage le même processus Node.js que l'API REST (même port, namespace dédié /chat).
•	Services tiers : Genius Pay (paiements), Brevo (emails), OneSignal (push), Orange SMS (SMS), Cloudinary (images), Geoapify (cartes).

2.3 Flux de données
✎ Section ajoutée – absente dans la version originale.
Les flux de données principaux sont décrits ci-dessous :
Flux de réservation (option 10 %) :
1.	Le client sélectionne des dates sur l'application mobile.
2.	L'application envoie une requête POST /api/bookings au backend.
3.	Le backend vérifie la disponibilité dans la table availabilities.
4.	Le backend appelle l'API Genius Pay pour initier un paiement de 10 %.
5.	Genius Pay retourne une URL de checkout.
6.	L'application ouvre une WebView avec l'URL de checkout.
7.	L'utilisateur complète le paiement sur la page Genius Pay.
8.	Genius Pay envoie un webhook POST /api/webhooks/genius-pay au backend.
9.	Le backend vérifie la signature HMAC, confirme la réservation, met à jour les disponibilités, et envoie les notifications.

Flux de messagerie temps réel :
10.	Le client et le professionnel s'authentifient via WebSocket (Socket.io) en fournissant leur token JWT.
11.	Chaque message envoyé via socket est persisté en base de données (table messages).
12.	Le serveur Socket.io distribue le message à tous les membres de la salle (room) correspondant à la réservation.
13.	Si le destinataire est hors ligne, une notification push (FCM) est envoyée en parallèle.

2.4 Sécurité et conformité
Toutes les communications entre l'application mobile, le backend et les services tiers sont chiffrées via TLS 1.3. Les mots de passe des utilisateurs sont hachés avec bcrypt (facteur de coût 12) avant stockage. Aucun mot de passe en clair n'est jamais conservé dans les logs ou fichiers de configuration.
Les jetons JWT utilisés pour l'authentification sont signés avec une clé secrète unique, stockée exclusivement dans les variables d'environnement du backend. Le jeton d'accès a une durée de vie d'une heure, tandis que le jeton de rafraîchissement est valable sept jours. À chaque expiration, le client peut utiliser le jeton de rafraîchissement pour obtenir un nouveau couple de jetons.
L'authentification à deux facteurs (2FA) est obligatoire pour tous les comptes professionnels. Elle repose sur le protocole TOTP (Time-based One-Time Password), compatible avec Google Authenticator ou Authy. L'administrateur peut révoquer le 2FA d'un compte en cas de perte d'accès, après une procédure de vérification d'identité.
Le rate limiting est implémenté sur tous les endpoints sensibles. Pour l'authentification, un maximum de cinq tentatives de connexion par IP est autorisé sur quinze minutes. Les webhooks entrants (Genius Pay) ne sont pas soumis à cette limitation, mais leur signature HMAC est vérifiée systématiquement, et un nonce est utilisé pour prévenir les attaques par rejeu.
Les en-têtes de sécurité sont configurés via le middleware Helmet (CSP, X-Frame-Options, X-Content-Type-Options). La politique CORS est strictement définie : seules les origines autorisées peuvent interagir avec l'API.
En matière de conformité légale, Primeo respecte la loi ivoirienne n°2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel. Un délégué à la protection des données (DPO) est joignable à l'adresse dpo@primeo.ci. Les transferts de données hors de la Côte d'Ivoire sont encadrés par des clauses contractuelles types.

2.5 Hébergement et infrastructure
Le backend de Primeo est déployé sur la plateforme Render (formule starter en production, environ 7 USD/mois, sans mise en veille). Le déploiement est automatisé via GitHub Actions : à chaque push sur la branche principale, les tests sont exécutés puis le code déployé si les tests passent.
La base de données PostgreSQL est hébergée sur un service managé (Render DB ou Neon.tech en phase initiale). En production, un cluster avec au moins 4 Go de RAM et 50 Go de stockage est recommandé, avec des sauvegardes automatiques quotidiennes conservées 30 jours.
Le site légal statique (legal.primeo.ci) est hébergé sur Netlify ou Vercel. Le dashboard administrateur (admin.primeo.ci) est déployé sur Render. Le nom de domaine principal primeo.ci est enregistré auprès d'un registrar local (Afriregister ou NIC.CI).
Les sous-domaines configurés sont : api.primeo.ci (backend), admin.primeo.ci (dashboard admin), legal.primeo.ci (site statique), www.primeo.ci (site vitrine). Les certificats SSL sont fournis automatiquement via Let's Encrypt.


PARTIE 3 – MODÈLE DE DONNÉES (POSTGRESQL)
Le modèle de données est relationnel et normalisé. Les noms de colonnes sont en anglais, conformément aux conventions de nommage. Les contraintes d'intégrité référentielle (clés étrangères) sont définies pour assurer la cohérence des données.

3.1 Table des utilisateurs (users)
Cette table centralise tous les comptes (clients, professionnels, administrateurs). Elle contient : id, email (unique), phone (unique), password_hash (bcrypt), first_name, last_name, birth_date, gender, avatar_url (Cloudinary), account_type (client | professional_hebergement | professional_immobilier | restaurateur | admin), roles (tableau JSON), status (active | pending | suspended | banned), created_at, updated_at, reset_token, reset_token_expires.

3.2 Table des profils professionnels (professional_profiles)
Liée à users par user_id (clé étrangère). Colonnes : business_name, rccm, tax_id, tourist_license, rating_stars (1-5), description, street, city, postal_code, country, latitude, longitude, verification_status (pending | approved | rejected). Les documents justificatifs sont dans la table professional_documents.

3.3 Table des abonnements (subscriptions)
Colonnes : id, user_id, plan_type (essentiel | prestige | premium | restaurant), start_date, next_billing_date, end_date, status (active | suspended | cancelled), monthly_price (0, 9000, 24000 ou tarif restaurant), included_properties_limit, commission_rate (9, 5, 0), features (JSON), boosts_free_monthly (2 pour Prestige, 10 pour Premium, 0 pour les autres).

3.4 Table des propriétés (properties)
Colonnes principales : id, owner_id, property_type (residence | hotel | immobilier_location | immobilier_terrain | immobilier_achat | restaurant), title, description, rooms, bedrooms, beds, bathrooms, surface, price_per_night | price_per_month | price_sale, capacity, cuisine_type, opening_hours (JSON), street, city, latitude, longitude, status (draft | pending | active | suspended | archived), is_boosted, boost_expires_at, views_count, bookings_count. Une table séparée property_media stocke les URLs des photos, vidéos et modèles 3D.

3.5 Table des disponibilités (availabilities)
Colonnes : id, property_id, date, status (available | booked | manually_blocked), time_slot (restaurants), price_override. Les dates réservées sont automatiquement mises à jour par le système de réservation.

3.6 Table des réservations (bookings)
Colonnes : id, client_id, property_id, start_date, end_date, guests, total_amount, online_paid_amount, payment_option (full_online | ten_percent_online | zero_online), status (pending_payment | confirmed | cancelled_by_client | cancelled_by_professional | completed), commission_amount, remaining_cash_amount, created_at, confirmed_at, cancelled_at.

3.7 Table des transactions (transactions)
Colonnes : id, user_id, type (client_payment | subscription_payment | boost_purchase | refund | payout_to_professional), amount, currency (XOF), fee, net_amount, status (initiated | success | failed | refunded), booking_id, subscription_id, genius_pay_transaction_id, webhook_received, initiated_at, completed_at.

3.8 Table des messages (messages)
Colonnes : id, booking_id, dispute_id, sender_id, receiver_id, content, sent_at, is_read. Les conversations ne sont accessibles qu'aux participants concernés et aux administrateurs en cas de litige.

3.9 Table des avis (reviews)
Colonnes : id, booking_id, property_id, rating (1-5), cleanliness_rating, communication_rating, accuracy_rating, location_rating, value_rating, comment, published_at, response_from_professional, status (pending_moderation | published | hidden). Les photos jointes sont dans review_media.

3.10 Autres tables essentielles
Table boosts : id, user_id, property_id, start_date, end_date, amount, type (free | paid). Table referrals : code, referrer_id, referee_id, inscription_date, reward_date. Table disputes : id, booking_id, opened_by, reason, status, resolution. Table logs_audit : user_id, action, description, ip_address, timestamp.

3.11 Index et optimisation
✎ Section ajoutée – absente dans la version originale.
Les index suivants sont définis pour optimiser les requêtes les plus fréquentes :
•	users(email) – UNIQUE : utilisé à chaque authentification.
•	users(phone) – UNIQUE : utilisé lors de l'inscription et de la vérification OTP.
•	properties(owner_id) : pour lister les annonces d'un professionnel.
•	properties(status, property_type) : pour le filtrage dans la recherche.
•	properties(city, latitude, longitude) : pour la recherche géographique (index composite).
•	availabilities(property_id, date) – composite : pour la vérification des disponibilités.
•	bookings(client_id) : pour lister les réservations d'un client.
•	bookings(property_id, status) : pour les statistiques et la gestion des disponibilités.
•	messages(booking_id, sent_at) : pour charger les conversations par ordre chronologique.
•	logs_audit(user_id, timestamp) : pour le filtrage des logs dans le dashboard admin.
Les requêtes de recherche géographique complexes (rayon autour d'un point GPS) utilisent la formule de Haversine via une requête SQL brute (Prisma $queryRaw). Un index de type GIST peut être envisagé avec l'extension PostGIS si les performances l'exigent.

3.12 Migrations et versionnement
✎ Section ajoutée – absente dans la version originale.
Le versionnement du schéma est géré exclusivement par Prisma Migrate. Chaque modification du schéma (ajout de table, de colonne, modification de contrainte) génère un fichier de migration SQL versionné dans le dossier prisma/migrations/. Ces fichiers sont committés dans le dépôt Git et appliqués automatiquement lors du déploiement (commande : npx prisma migrate deploy).
Règles de migration en production : (1) Ne jamais supprimer une colonne sans une période de dépréciation d'au moins un sprint. (2) Toujours tester la migration sur l'environnement de staging avant la production. (3) En cas de migration destructive (suppression de données), créer une sauvegarde manuelle préalable. (4) Documenter le motif de chaque migration dans le commit message.
Un script de seed (prisma/seed.ts) permet de peupler la base de données de développement avec des données de test réalistes : utilisateurs de tous types, propriétés, réservations, avis et transactions fictifs.


PARTIE 4 – BACKEND (NODE.JS + EXPRESS + TYPESCRIPT)

4.1 Organisation générale du code
Le code source du backend est organisé de manière modulaire. À la racine, un fichier de configuration principal charge les variables d'environnement, initialise la connexion à PostgreSQL via Prisma, et configure Express. Les principaux dossiers sont : controllers (logique HTTP), services (règles métier), routes (endpoints), middlewares (auth, validation, rate limiting, erreurs), prisma (schéma et migrations), types (interfaces TypeScript), utils (jetons, emails, etc.) et jobs (cron tasks).
Avant de démarrer le serveur, une vérification stricte de l'environnement est effectuée : toutes les variables requises (DATABASE_URL, GENIUS_PAY_API_KEY, JWT_SECRET, etc.) doivent être présentes. Si l'une d'elles manque, le processus refuse de démarrer.

4.2 Authentification et gestion des sessions
L'authentification repose sur les jetons JWT. À la connexion, le backend génère un jeton d'accès (1 heure) et un jeton de rafraîchissement (7 jours), tous deux signés avec la même clé secrète. Le jeton de rafraîchissement est également stocké en base de données (table refresh_tokens) pour permettre la révocation.
Pour les comptes professionnels ayant activé le 2FA, après validation du mot de passe, le serveur renvoie une demande de code TOTP. L'utilisateur soumet le code via un second endpoint. Si correct, les jetons sont émis. Les rôles et permissions sont gérés de manière granulaire via des middlewares d'autorisation.

4.3 Endpoints API principaux
L'API est organisée par domaines fonctionnels, tous préfixés par /api. La documentation interactive est générée via Swagger (OpenAPI) et accessible à /api-docs.
Authentification :
•	POST /api/auth/register – inscription
•	POST /api/auth/login – connexion (renvoie les jetons ou une demande 2FA)
•	POST /api/auth/2fa/verify – vérification du code TOTP
•	POST /api/auth/refresh – rafraîchissement des jetons
•	POST /api/auth/forgot-password – envoi d'email de réinitialisation
•	POST /api/auth/reset-password – changement de mot de passe
•	POST /api/auth/logout – invalidation du jeton de rafraîchissement
Propriétés :
•	GET /api/properties – recherche avec filtres (type, ville, dates, prix, équipements, etc.)
•	GET /api/properties/:id – détail d'une propriété
•	POST /api/properties – création (professionnels uniquement)
•	PUT /api/properties/:id – modification
•	DELETE /api/properties/:id – suppression logique
Réservations :
•	POST /api/bookings – création (avec vérification de disponibilité et initiation Genius Pay si applicable)
•	GET /api/bookings – liste des réservations de l'utilisateur connecté
•	GET /api/bookings/:id – détail
•	POST /api/bookings/:id/cancel – annulation (avec remboursement si applicable)
Webhooks :
•	POST /api/webhooks/genius-pay – réception des notifications de paiement (vérification HMAC + nonce)

4.4 Services métier
Les services encapsulent la logique métier réutilisable. Le service de réservation vérifie la disponibilité et calcule le prix total (réductions, commissions, codes promo). Le service de calendrier gère l'occupation des propriétés. Le service de boost gère l'achat et l'activation des boosts. Le service de recherche construit la requête SQL complexe avec score de visibilité. Le service de facturation génère les factures PDF via PDFKit, les stocke sur Cloudinary, et envoie le lien par email.

4.5 Gestion des erreurs et logs
Toutes les erreurs sont interceptées par un middleware de gestion d'erreur qui renvoie une réponse JSON standardisée (400 validation, 401 auth, 403 permission, 404 not found, 422 métier, 500 interne). Les erreurs inattendues sont loggées avec leur stack trace et remontées à Sentry en production. Les logs applicatifs sont centralisés via Logtail. Les actions sensibles sont enregistrées dans la table logs_audit pour une conservation de six mois.

4.6 Tâches planifiées (cron)
•	Chaque jour à minuit : vérification des abonnements à échéance, tentative de prélèvement, génération de facture PDF. En cas d'échec sur 7 jours : suspension de l'abonnement et masquage des annonces.
•	Chaque jour à 1h00 : nettoyage des jetons de réinitialisation de mot de passe expirés (> 30 minutes).
•	Chaque jour à 2h00 : purge des logs de plus de 6 mois.
•	Chaque heure : rattrapage des webhooks Genius Pay manquants (interrogation de l'API pour les transactions en statut pending depuis > 10 minutes).
•	Chaque semaine (dimanche à 3h00) : génération et envoi des rapports d'activité pour les administrateurs.
•	Chaque mois (le 1er à 4h00) : remise à zéro des compteurs de boosts gratuits (2 pour Prestige, 10 pour Premium).

4.7 Vente de données et analyses (rapports statistiques payants)
Cette source de revenus complémentaire permet aux professionnels d'acheter des rapports statistiques sur le marché. Les données sont anonymisées et agrégées. Dans le tableau de bord professionnel, une section « Analyses de marché » propose des packs payants :
•	Pack « Tendances des prix » : prix moyens par nuit par ville ou quartier, évolution sur 3 mois.
•	Pack « Taux d'occupation » : taux moyen par période (haute saison, basse saison), durée moyenne des séjours.
•	Pack « Profil client » : répartition par nationalité, motif de voyage, durée de préavis.
•	Pack « Performances comparatives » : positionnement de la propre propriété par rapport aux concurrents similaires.
Chaque pack est vendu à prix fixe (exemple : 10 000 FCFA). Une fois le paiement validé via Genius Pay, le rapport PDF est généré automatiquement et envoyé par email, avec un lien de téléchargement dans le tableau de bord. Les rapports sont basés sur des données anonymisées des 12 derniers mois.
Note conformité : la commercialisation de rapports statistiques, même anonymisés, doit être explicitement mentionnée dans la politique de confidentialité (section 10.6). Les utilisateurs doivent être informés que leurs données agrégées peuvent contribuer à ces rapports, et doivent disposer d'un droit d'opposition.

4.8 Messagerie temps réel (Socket.io)
✎ Section ajoutée – la technologie WebSocket n'était pas spécifiée dans la version originale.
La messagerie temps réel est implémentée avec Socket.io (version 4.x), intégré directement au serveur Express via un serveur HTTP partagé. Cela évite la gestion de deux ports distincts. Le namespace dédié est /chat.
Authentification WebSocket :
À la connexion, le client envoie son jeton JWT dans l'handshake (auth.token). Un middleware Socket.io vérifie ce jeton avant d'autoriser la connexion. Si le jeton est invalide ou expiré, la connexion est rejetée avec un code d'erreur explicite.
Gestion des salles (rooms) :
Chaque conversation est associée à une réservation. La salle porte l'identifiant de la réservation (ex : room:booking_123). Seuls le client et le professionnel concernés peuvent rejoindre cette salle. Les administrateurs peuvent rejoindre n'importe quelle salle en cas de litige.
Événements :
•	join_room – rejoindre une salle de conversation.
•	send_message – envoyer un message (persisté en base de données avant distribution).
•	receive_message – réception par les membres de la salle.
•	typing – indicateur de saisie.
•	message_read – accusé de lecture.
Scalabilité :
En cas de déploiement multi-instances, un adaptateur Redis (socket.io-redis) est configuré pour synchroniser les événements entre les instances. En mono-instance (configuration initiale sur Render), l'adaptateur in-memory par défaut est suffisant.


PARTIE 5 – FRONTEND MOBILE (REACT NATIVE + EXPO + TSX)

5.1 Organisation générale
L'application mobile est développée avec React Native via Expo, en TypeScript (fichiers TSX). Organisation des dossiers : screens (vues), components (réutilisables), navigation (piles, onglets), services (appels API, stockage local, notifications), store (Zustand / Context), types (interfaces TypeScript), utils (validation, formatage).

5.2 Gestion de l'authentification et de l'état global
L'état d'authentification (utilisateur, jetons, profil) est stocké dans un contexte global et persisté via AsyncStorage (données non sensibles) et SecureStore (jetons JWT). À chaque lancement, le jeton de rafraîchissement est utilisé pour restaurer la session. Un intercepteur Axios ajoute le jeton d'accès dans l'en-tête Authorization et tente un rafraîchissement automatique en cas d'erreur 401.

5.3 Navigation multi-rôles
La navigation par onglets est adaptée selon le rôle. Clients : Accueil, Favoris, Réservations, Messages, Profil. Professionnels : Tableau de bord, Propriétés, Réservations, Messages, Paramètres. Administrateurs : l'application mobile n'a pas d'interface d'administration ; un écran d'information redirige vers admin.primeo.ci.

5.4 Thèmes visuels (Auto, Clair, Sombre, Bleu)
Quatre thèmes sont supportés : Clair (fond blanc, texte sombre), Sombre (fond très foncé, texte clair), Bleu (accents bleus marqués) et Auto (suit les préférences système). Le choix est sauvegardé localement. Tous les composants utilisent des variables de thème partagées pour garantir la cohérence visuelle.

5.5 Accessibilité
Chaque élément interactif possède un attribut accessibilityLabel. Les tailles de police sont relatives (échelle dynamique React Native). Les contrastes respectent le seuil WCAG AA (4,5:1 pour le texte normal). Le focus est géré pour les claviers externes. Des descriptions textuelles sont fournies pour les images importantes.

5.6 Écran d'accueil et découverte
L'écran d'accueil présente une barre de recherche simplifiée (destination, dates, nombre de personnes) et quatre cartes d'accès sectorielles (Résidences, Hôtels, Immobilier, Restaurants). Pour les clients connectés, des sections « Pour vous » (suggestions personnalisées) et « Dernières recherches » (relancer en un clic) sont affichées.

5.7 Recherche avancée et filtres
L'écran de recherche permet la saisie d'une destination avec autocomplétion, la sélection de dates via un calendrier et le nombre de voyageurs. Un panneau de filtres offre : fourchette de prix, type de propriété, équipements, règles, note minimale, distance. Les résultats peuvent être affichés en liste ou sur une carte interactive. Le tri peut être modifié (pertinence, prix, note, popularité, distance).

5.8 Fiche détail d'une propriété
Pour une résidence ou un hôtel : carrousel d'images, description, équipements, calendrier de disponibilité interactif, module de réservation (3 options de paiement, l'option 10 % mise en avant), avis, profil de l'hôte, carte de localisation, et visite 3D (Three.js) si disponible.
Pour l'immobilier en vente : prix de vente, superficie, documents protégés (titre foncier), formulaire de contact et bouton « Exprimer mon intérêt ».
Pour un restaurant : menu avec photos et prix, horaires, capacité, widget de réservation de table par créneaux.

5.9 Processus de réservation
Le client sélectionne les dates et le nombre de voyageurs. Un récapitulatif du prix est affiché (prix x nuits, frais, réductions, total). L'option de paiement est choisie parmi les trois. Pour les options 1 et 2, une WebView ouvre la page de checkout Genius Pay. Pour l'option 3, la confirmation est immédiate. Une notification push et un email confirment la réservation.

5.10 Gestion des réservations (professionnels)
L'onglet « Réservations » affiche les demandes en attente et les réservations confirmées. Un calendrier mensuel offre une vue d'ensemble. Le professionnel peut accepter, refuser, annuler, contacter le client, ou marquer le paiement cash comme reçu.

5.11 Messagerie temps réel
La messagerie utilise Socket.io (section 4.8). L'interface de chat affiche les messages dans des bulles, avec indicateur de saisie et accusés de réception. Des messages rapides préconfigurés sont disponibles pour les professionnels. Les notifications push (FCM) sont envoyées lorsque l'utilisateur n'est pas actif dans la conversation.

5.12 Avis
Après la date de départ, le client reçoit une invitation à laisser un avis. L'écran permet de noter de 1 à 5 étoiles, d'ajouter un commentaire et des photos. L'avis est soumis à une modération avant publication. Le professionnel peut répondre publiquement.

5.13 Favoris et listes
L'utilisateur peut ajouter une propriété à ses favoris (icône cœur). Dans l'onglet « Favoris », il peut créer des listes personnalisées et y organiser ses favoris. Les listes sont synchronisées sur le serveur et partageables.

5.14 Parrainage
Chaque utilisateur dispose d'un code de parrainage unique. Lorsqu'un ami s'inscrit avec ce code et effectue sa première réservation, le parrain reçoit 2 000 FCFA de crédit. L'historique des parrainages et récompenses est visible dans le profil.

5.15 Paramètres et préférences
Modification du profil, changement de mot de passe, activation/désactivation du 2FA, préférences de notifications, choix du thème visuel, sélection de la langue (français par défaut), liens vers les pages légales, version de l'application, déconnexion.

5.16 Multi-devises (affichage des prix)
Bien que la plateforme fonctionne exclusivement en FCFA pour les transactions, les clients peuvent choisir d'afficher les prix en EUR ou USD à titre indicatif. Le taux de conversion est mis à jour quotidiennement via une API externe (ExchangeRate-API). Un message clair précise que le montant réel à payer est toujours en FCFA.


PARTIE 6 – COMPTES CLIENTS (FONCTIONNALITÉS DÉTAILLÉES)

6.1 Inscription et authentification
Le processus d'inscription est simple et rapide : email, numéro de téléphone ivoirien, mot de passe fort, acceptation des CGU. Un code de vérification OTP est envoyé par SMS ; il doit être saisi pour activer le compte. La connexion se fait par email et mot de passe, ou par réinitialisation en cas d'oubli.

6.2 Page d'accueil et découverte
Après connexion, la page d'accueil affiche une barre de recherche, quatre cartes sectorielles, une section « Suggestions pour vous », une section « Les plus populaires dans votre région », et une section « Nouveautés ». Chaque carte affiche l'image principale, le titre, la localisation, la note, le prix, et des badges (Boosté, Visite 3D, Super Hôte, Nouveau).

6.3 Recherche avancée et filtres
L'écran de recherche complet comprend un champ de destination avec autocomplétion et géolocalisation, un sélecteur de dates avec affichage des prix par nuit, un sélecteur de voyageurs, et un panneau de filtres avancés (prix, type, équipements, règles, note, distance, et pour les restaurants : type de cuisine et créneaux). La recherche tient compte des disponibilités en temps réel.

6.4 Fiche détail d'une propriété
Structure commune : carrousel d'images, titre, localisation, note et avis, caractéristiques, bouton « Partager ». Pour les hébergements : calendrier de disponibilité, module de réservation (3 options, option 10 % mise en avant), section avis, profil de l'hôte, carte (zone approximative avant réservation, adresse exacte après). Pour les restaurants : menu, horaires, widget de réservation de table. Pour l'immobilier en vente : documents protégés, formulaire de contact.

6.5 Processus de réservation (détaillé)
Étape 1 : vérification des dates et du nombre de voyageurs. Étape 2 : récapitulatif du prix (prix/nuit × nuits, frais, réductions, total). Étape 3 : choix de l'option de paiement (100 % online, 10 % + 90 % cash, 100 % cash). Options 1 et 2 : WebView Genius Pay, puis écran de confirmation avec numéro de réservation et solde restant. Option 3 : confirmation immédiate avec avertissement (l'hôte peut annuler sans frais jusqu'à 24h avant l'arrivée).

6.6 Gestion des réservations
Onglet divisé en sous-onglets : à venir, en cours, terminées, annulées. Chaque réservation est présentée avec photo, dates, adresse, statut, montant payé et solde restant. La page détaillée contient les coordonnées de l'hôte (après confirmation), les instructions d'arrivée, la facture PDF téléchargeable, et un bouton « Laisser un avis » après la date de départ.

6.7 Messagerie
L'onglet « Messages » liste toutes les conversations classées par date. L'interface de chat (Socket.io) affiche les messages dans des bulles, avec indicateur de saisie et accusés de réception. Le client peut envoyer du texte, des images, et signaler un message abusif.

6.8 Avis
Le client peut consulter tous ses avis dans son profil. Il peut modifier ou supprimer un avis dans les sept jours suivant sa publication, et répondre aux réponses de l'hôte.

6.9 Favoris et listes
L'onglet « Favoris » présente les propriétés aimées. Le client peut créer des listes personnalisées (ex : « Week-end à Grand-Bassam ») et y organiser ses favoris. Les listes sont synchronisées et partageables via un lien public.

6.10 Parrainage
Code de parrainage unique dans le profil. Partage par SMS, email, WhatsApp. Récompense de 2 000 FCFA de crédit déclenchée après la première réservation terminée du filleul. Historique des parrainages affiché.

6.11 Profil et paramètres
Informations personnelles (photo, email, téléphone), modification du mot de passe, activation/désactivation du 2FA (optionnel pour les clients), préférences de notifications, choix du thème, consultation des pages légales, déconnexion.

6.12 Mode hors ligne
L'application stocke localement les dernières recherches, les propriétés consultées récemment, et les réservations à venir. En l'absence de connexion, ces données restent consultables. Les actions nécessitant une connexion sont mises en file d'attente et synchronisées automatiquement.

6.13 Évaluation réciproque (client noté par le professionnel)
Après la fin du séjour, le professionnel peut noter le client (1 à 5 étoiles) sur les critères : respect des lieux, communication, ponctualité, respect des règles. Un commentaire public ou privé peut être ajouté. La note moyenne du client est visible uniquement par les professionnels lors de la réception d'une demande. En cas de note abusive, le client peut la signaler ; l'administrateur peut la masquer après enquête.


PARTIE 7 – COMPTES PROFESSIONNELS (HÉBERGEMENT, IMMOBILIER)

7.1 Inscription et validation KYC
Le professionnel fournit son email, téléphone, mot de passe et les informations légales : dénomination, RCCM, numéro de contribuable, autorisation d'exercice (ministère du Tourisme), classement. Il télécharge les justificatifs (pièce d'identité, extrait RCCM, licence). L'administrateur valide ou rejette le dossier. Une fois validé, le professionnel choisit une formule d'abonnement et renseigne un moyen de paiement.

7.2 Tableau de bord
Indicateurs clés : réservations en attente, à venir, terminées ; taux d'occupation sur 30 jours ; revenus nets du mois ; note moyenne. Graphiques : revenus sur 6 mois (courbe), taux d'occupation (barres). Alertes : réservations non confirmées, abonnement bientôt dû, annonces à mettre à jour.

7.3 Gestion des propriétés
Ajout guidé en plusieurs étapes : informations générales, caractéristiques, équipements, photos (jusqu'à 20, optimisées en WebP via Cloudinary), visite 3D (Prestige et Premium, photos équirectangulaires 360° traitées en Three.js), tarifs, disponibilités, règles. L'annonce est soumise à validation admin avant activation.
Visite 3D : le professionnel doit fournir des photos équirectangulaires (format 2:1, résolution minimum 4000×2000 px). Des applications mobiles gratuites comme Google Street View ou Ricoh Theta permettent de capturer ce type de photos. Un guide utilisateur est fourni dans le dashboard.

7.4 Calendrier de disponibilité
Calendrier interactif (vue mois, semaine) avec dates réservées en vert et dates bloquées manuellement en rouge. Le professionnel peut bloquer des plages de dates, appliquer des tarifs saisonniers, et exporter au format iCal (synchronisation Google Calendar, Outlook).

7.5 Gestion des réservations
Liste des demandes (si réservation non instantanée) et des réservations confirmées. Actions disponibles : accepter/refuser, contacter le client, marquer le paiement cash comme reçu, annuler (avec pénalité), signaler un problème (litige). Historique complet conservé.

7.6 Abonnements et facturation
Changement de formule effectif à la prochaine date de facturation. Historique de tous les paiements (abonnements, commissions, boosts). Factures PDF téléchargeables. Portefeuille virtuel affichant le solde (crédits clients nets de commission). Prélèvements automatiques via Genius Pay à date anniversaire.

7.7 Boosts d'annonce
Durée : 72h pour les boosts payants (2 000 FCFA), 3 ou 7 jours pour les boosts gratuits selon la formule. Section « Boosts » dans le dashboard avec compteur de boosts gratuits restants. L'annonce boostée apparaît en tête des résultats de recherche. Un minuteur indique le temps restant.

7.8 Statistiques avancées
Disponibles pour Prestige et Premium : vues par annonce, taux de clics, taux de conversion, comparaison avec les prix du marché, suggestions de prix optimaux. Graphiques d'analyse sur différentes périodes.

7.9 Messagerie
Identique à celle des clients (Socket.io), avec des templates de réponses rapides adaptés (ex : « Bienvenue, voici les instructions d'accès ») et la possibilité de configurer des réponses automatiques en cas d'absence.

7.10 Avis
Consultation de tous les avis reçus, possibilité de répondre et de signaler un avis abusif. Notification à chaque nouvel avis.

7.11 Gestion multi-utilisateurs (Premium)
Le professionnel peut inviter des co-gérants (employés, collaborateurs) avec des rôles distincts (admin, éditeur, lecteur). L'invitation se fait par email. L'accès peut être révoqué à tout moment.
Note : la section « Évaluation réciproque » a été supprimée ici car elle était une copie identique de la section 6.13. Se référer à la section 6.13 pour les détails.


PARTIE 8 – COMPTE RESTAURATEURS (SPÉCIFIQUE)

8.1 Inscription et validation
Formulaire dédié : informations générales, informations légales (nom du restaurant, adresse, RCCM, numéro de contribuable, autorisation d'exercice ministère du Tourisme). Téléchargement des justificatifs. Validation par l'administrateur. Souscription à un abonnement mensuel sans commission.

8.2 Tableau de bord restaurateur
Indicateurs adaptés : réservations de tables (jour, semaine, mois), taux d'occupation par créneau, avis récents, revenus (si menus spéciaux payants). Graphique de la fréquentation. Alertes : réservations de dernière minute, annulations.

8.3 Gestion des créneaux horaires et de la capacité
Le restaurateur définit des créneaux pour chaque jour de la semaine (ex : 12h00-13h30, 19h30-21h00) avec une capacité maximale par créneau. Le système bloque la capacité en temps réel. Le restaurateur peut manuellement bloquer des créneaux ou ajuster la capacité à la volée.

8.4 Menu en ligne
Création et gestion du menu : sections (entrées, plats, desserts, boissons), plats avec nom, description, prix, photo (optionnelle) et allergènes. Menus spéciaux pour certaines dates (ex : menu de Noël) avec prix fixe par personne. Le menu est affiché sur la fiche du restaurant.

8.5 Réservations de tables
Le client sélectionne date, créneau horaire et nombre de couverts. Demandes spéciales possibles (allergies, placement en terrasse). Réservation gratuite (aucun paiement en ligne). Confirmation par email et push. Le client peut modifier jusqu'à 2 heures avant. En cas de no-show, le restaurateur peut signaler le client (avertissement sur son profil).

8.6 Abonnement sans commission
Les restaurateurs paient uniquement un abonnement mensuel fixe (exemple : 15 000 FCFA), sans commission sur les réservations. Prélèvement automatique via Genius Pay. Délai de grâce de 7 jours en cas d'échec, puis suspension du compte.

8.7 Avis spécifiques
Les avis pour les restaurants incluent des critères adaptés : qualité de la cuisine, service, ambiance, rapport qualité-prix. Note globale calculée comme moyenne des critères. Le restaurateur peut répondre.

8.8 Promotions et codes promo
Le restaurateur peut créer des offres spéciales (ex : 10 % de réduction sur l'addition pour les réservations via Primeo), affichées sur sa fiche. L'administrateur peut également créer des codes promo globaux (code, réduction en % ou montant fixe, validité, nombre d'utilisations max).


PARTIE 9 – ADMINISTRATION (SITE WEB SÉPARÉ)

9.1 Architecture du dashboard admin
Application web distincte développée avec React (ou Next.js) et TypeScript. Déployée sur Render. Accès protégé par authentification propre avec comptes créés manuellement par le super-administrateur. Rôles : super-admin (tous droits), modérateur (comptes, annonces, litiges), support (tickets, consultation), analyste (statistiques uniquement). Interface responsive avec graphiques et tableaux de bord.

9.2 Authentification et sécurité
Connexion par email et mot de passe avec 2FA obligatoire. Sessions expirant après 8 heures d'inactivité. Toutes les actions sensibles (validation, suspension, remboursement) sont journalisées.

9.3 Tableau de bord analytique
Indicateurs en temps réel : nombre total d'utilisateurs (évolution sur 7 jours), réservations par statut, chiffre d'affaires total, répartition des revenus par source (graphique en secteurs), taux de commission moyen, top 10 des propriétés, carte de géolocalisation des réservations. Export des graphiques en PNG ou CSV.

9.4 Gestion des utilisateurs
Liste filtrée par type, statut, date d'inscription. En cliquant sur un utilisateur : profil complet, propriétés, réservations, transactions, logs de connexion. Actions : suspendre, réactiver, bannir, modifier le statut de validation, consulter les documents KYC, forcer la réinitialisation du mot de passe, ajouter une note interne.

9.5 Modération des annonces
File d'attente des annonces en attente de validation. Actions : approuver (l'annonce devient active), rejeter avec motif (envoyé au propriétaire), demander des modifications (l'annonce repasse en brouillon). Les annonces actives peuvent être suspendues ou supprimées définitivement.

9.6 Gestion des litiges
Tous les litiges ouverts sont listés. L'administrateur consulte l'historique des messages, les preuves et la demande de remboursement. Actions : rejeter le litige, accepter un remboursement partiel (saisir le montant), accepter un remboursement total. Le remboursement est déclenché automatiquement via Genius Pay. Les deux parties sont notifiées.

9.7 Configuration de la plateforme
Modification des tarifs d'abonnement, du prix des boosts (défaut 2 000 FCFA), des commissions, des délais de grâce. Gestion des codes promo (création, désactivation). Activation/désactivation de fonctionnalités. Modification des templates d'emails transactionnels.

9.8 Logs système
Historique des actions sensibles filtrable par utilisateur, date et type d'action. Conservation de six mois. Export en CSV.

9.9 Chatbot IA et système de tickets de support
Pour réduire la charge du support humain, un chatbot intelligent est intégré à l'application mobile. Il répond aux questions fréquentes (fonctionnement de la plateforme, réservations, paiements, annulations). Si le chatbot ne trouve pas de réponse ou détecte une insatisfaction, il propose de créer un ticket de support.
Un ticket contient : catégorie (problème technique, litige, information, réclamation), sujet, description, pièces jointes. Il est créé avec un statut initial « ouvert ». L'administrateur ou l'agent de support peut l'assigner, ajouter des commentaires internes et modifier le statut. L'utilisateur reçoit des notifications à chaque changement. Un système de priorisation automatique est mis en place (litiges : haute, technique : moyenne, information : basse).


PARTIE 10 – PAGES EXTERNES (SITE STATIQUE)

10.1 Architecture et hébergement
Site statique HTML5 pur, CSS responsive, sans JavaScript complexe. Hébergé sur Netlify ou Vercel. Déploiement CI/CD depuis un dépôt GitHub séparé. Pages optimisées pour l'impression (media print) et le référencement (balises meta, structure sémantique).

10.2 Page d'accueil du site légal
La page d'accueil présente cinq liens principaux avec un court résumé de chaque document : CGU, Conditions des Professionnels, Conditions de Vente (clients), Politique de Confidentialité et Cookies, Mentions Légales. Un lien retour vers primeo.ci est présent dans l'en-tête.

10.3 Conditions Générales d'Utilisation
Document structuré en sections numérotées : préambule, définitions, rôle de la plateforme, création de compte, obligations des utilisateurs, réservation et paiement, annulation, avis, suspension, responsabilité, disponibilité technique, protection des mineurs, clauses anti-contournement, modifications, droit applicable.

10.4 Conditions des Professionnels
Conditions d'inscription, validation KYC, publication des annonces, conformité légale (autorisations, classement), tarifs, commissions et abonnements, obligations du professionnel, gestion des litiges, sanctions, modification des conditions.

10.5 Conditions de Vente (clients)
Prix, les trois options de paiement, confirmation de réservation, annulations par le client ou le professionnel, procédure de litige.

10.6 Politique de confidentialité et cookies
Conforme à la loi ivoirienne n°2013-450. Données collectées, finalités, bases légales, sous-traitants, transferts internationaux, durée de conservation, droits des utilisateurs (accès, rectification, opposition, effacement, portabilité), réclamation auprès de l'ARTCI. Section sur les cookies (types, consentement, gestion).
✎ Ajout requis : mentionner explicitement la commercialisation de données statistiques anonymisées (section 4.7) et le droit d'opposition des utilisateurs à cette utilisation.

10.7 Mentions légales
Éditeur (PRIMEO SARL), capital social, RCCM, numéro de contribuable, adresse du siège, coordonnées du DPO (dpo@primeo.ci), directeur de la publication, hébergeur (Render, Netlify), droits de propriété intellectuelle.

10.8 Page Contact
Formulaire de contact (nom, email, sujet, message), adresse physique, numéro de téléphone, lien WhatsApp, et une carte Google Maps montrant l'emplacement du siège. Le formulaire envoie un email à contact@primeo.ci via un service de formulaire externe.

10.9 Page À propos
Histoire de Primeo, mission, valeurs, équipe (photos, rôles), chiffres clés (propriétés, clients satisfaits), partenaires. Conçue pour inspirer confiance et montrer le sérieux du projet.


PARTIE 11 – INTÉGRATIONS TIERS

11.1 Genius Pay (paiements)
Intégration via API REST. Endpoints utilisés : création d'un paiement, vérification de statut, webhook de notification. Clés API stockées dans les variables d'environnement. Signature HMAC des webhooks vérifiée, nonce anti-rejeu. Transactions enregistrées en base de données. Cron job de rattrapage en cas de notifications manquées.

11.2 Brevo (emails transactionnels)
Brevo est utilisé pour tous les emails transactionnels : confirmation de réservation, réinitialisation de mot de passe, rappels, factures, notifications de litige. Les templates sont créés dans l’interface Brevo. L’email expéditeur est notifications@primeo.ci. Les préférences de notification des utilisateurs sont respectées.

11.3 OneSignal (notifications push)
OneSignal est configuré pour iOS et Android. Le serveur envoie des notifications via l’API REST OneSignal avec les identifiants de joueurs (player IDs). Notifications classées par importance (haute priorité pour les confirmations et messages). L’application mobile enregistre et met à jour le player ID OneSignal à chaque lancement.

11.4 Orange SMS API (SMS)
Orange SMS API est utilisé pour les SMS critiques : codes OTP (inscription, réinitialisation de mot de passe), alertes de paiement échoué, rappels de séjour (option client). Numéros ivoiriens formatés avec l’indicatif +225. Seuls les messages indispensables sont envoyés pour limiter les coûts.

11.5 Cloudinary (images)
Stockage de toutes les images : propriétés, profils, avis. Upload depuis l'application via signature sécurisée générée par le backend. Compression automatique et conversion en WebP. URLs transformées à la volée (redimensionnement, rognage) selon les besoins. Les images supprimées sont purgées après un délai de 30 jours.
Recommandation : implémenter une limite de taille côté mobile (max 5 Mo par photo) avant upload pour économiser la bande passante des utilisateurs ivoiriens.

11.6 Geoapify (cartes et géolocalisation)
Géolocalisation et cartes gérées par Geoapify (autocétion d’adresses, tuiles de cartes, recherche par proximité). Bibliothèque react-native-maps côté mobile avec le provider Geoapify. Coordonnées GPS stockées en base de données. Recherche par proximité via formule de Haversine en SQL.

11.7 Prisma (ORM PostgreSQL)
Schéma défini dans schema.prisma. Migrations générées et appliquées via Prisma Migrate. Prisma Client utilisé pour toutes les opérations CRUD. Requêtes complexes (recherche avec filtres, agrégations statistiques) optimisées via indexes et requêtes brutes ($queryRaw) si nécessaire.

11.8 Backup automatique des fichiers et de la base de données
Base de données PostgreSQL : sauvegardes automatiques quotidiennes via le service d'hébergement (Render ou Neon.tech). Conservation de 30 jours. Procédure de restauration documentée.
Fichiers (images, documents, factures PDF) : versionnage automatique Cloudinary. Les fichiers supprimés restent disponibles 30 jours dans la corbeille avant suppression définitive.
Script de backup externe : un script optionnel permet à l'administrateur d'exporter la base de données au format SQL vers un stockage externe (AWS S3 ou équivalent). Ce script est prévu mais non automatisé par défaut.


PARTIE 12 – QUALITÉ, TESTS ET DÉPLOIEMENT

12.1 Stratégie de tests
Tests unitaires (Jest) : fonctions métier pures (calcul des commissions, validation des dates, génération de factures). Exécutés à chaque commit.
Tests d'intégration (Supertest) : endpoints API, traitement des webhooks, mise à jour de la base de données. Environnement de test isolé (base PostgreSQL dédiée).
Tests end-to-end (Detox) : parcours utilisateur complets (inscription, recherche, réservation avec option 10 %, annulation, connexion professionnelle, publication d'annonce). Couverture de code visée : 80 % pour les parties critiques.

12.2 CI/CD (GitHub Actions)
Pipeline GitHub Actions sur chaque push (branches main et develop) : installation des dépendances, linting (ESLint, Prettier), tests unitaires et d'intégration, build Expo. Déploiement automatique sur staging (branche develop). Déploiement en production (branche main) après validation manuelle via un tag.

12.3 Monitoring (Sentry, Logtail)
Sentry intégré au backend et au frontend mobile pour capturer les erreurs d'exécution avec contexte (utilisateur, requête, stack trace). Alertes email pour les erreurs critiques. Logtail centralise les logs applicatifs (info, warn, error) consultables en temps réel avec filtres.

12.4 Déploiement sur Render (backend, dashboard admin)
Deux services Render : un pour le backend API, un pour le dashboard admin (site statique). Fichier render.yaml définissant les variables d'environnement, les commandes de build (npm install, npx prisma migrate deploy) et de démarrage (npm start). Mises à jour automatiques après chaque push sur main.

12.5 Déploiement du site statique (Netlify/Vercel)
Dépôt GitHub du site légal connecté à Netlify ou Vercel. Déploiement automatique à chaque push. Sous-domaine legal.primeo.ci configuré via CNAME. Certificat SSL automatique via Let's Encrypt.

12.6 Soumission aux stores (Google Play, App Store)
Build de production via Expo Application Services (EAS). APK/AAB pour Android, IPA pour iOS. Métadonnées préparées (description, captures d'écran, icônes). Soumission manuelle via Google Play Console et App Store Connect. Versions taguées dans GitHub. Tests internes réalisés avant mise en production publique.


PARTIE 13 – ANNEXES

13.1 Glossaire
•	Primeo : nom de la plateforme.
•	Genius Pay : prestataire de paiement local.
•	Professionnel : utilisateur offrant un service (hébergement, immobilier, restauration).
•	Client : utilisateur réservant un service.
•	Boost : mise en avant payante d'une annonce dans les résultats de recherche.
•	Commission : pourcentage prélevé par Primeo sur chaque réservation (sauf restaurants).
•	Formule : abonnement professionnel (Essentiel, Prestige, Premium).
•	Visite 3D : expérience immersive 360° basée sur des photos équirectangulaires (Three.js).
•	Webhook : notification HTTP POST envoyée par Genius Pay au backend lors d'un événement de paiement.
•	TOTP : Time-based One-Time Password – protocole de double authentification.
•	KYC : Know Your Customer – processus de vérification d'identité des professionnels.
•	JWT : JSON Web Token – mécanisme d'authentification sans état.
•	Socket.io : bibliothèque JavaScript pour la communication temps réel via WebSocket.

13.2 Exemples de code (extraits)
✎ Section complétée – absente dans la version originale.
Extrait 1 – Middleware d'authentification JWT (TypeScript) :
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

Extrait 2 – Vérification du webhook Genius Pay (TypeScript) :
import crypto from 'crypto';
export const verifyWebhookSignature = (payload: string, signature: string): boolean => {
  const secret = process.env.GENIUS_PAY_WEBHOOK_SECRET!;
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
};

Extrait 3 – Vérification de disponibilité (Prisma, TypeScript) :
export const checkAvailability = async (propertyId: number, start: Date, end: Date): Promise<boolean> => {
  const conflict = await prisma.booking.findFirst({
    where: {
      property_id: propertyId,
      status: { in: ['confirmed', 'pending_payment'] },
      start_date: { lt: end },
      end_date: { gt: start },
    },
  });
  return !conflict;
};

Extrait 4 – Connexion Socket.io avec authentification JWT (TypeScript) :
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentification requise'));
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    socket.data.userId = user.id;
    next();
  } catch {
    next(new Error('Token invalide'));
  }
});

Extrait 5 – Composant React Native de carte de propriété (TSX) :
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
interface PropertyCardProps { title: string; city: string; price: number; rating: number; imageUrl: string; onPress: () => void; }
export const PropertyCard: React.FC<PropertyCardProps> = ({ title, city, price, rating, imageUrl, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} accessibilityLabel={`Voir la propriété ${title}`}>
    <Image source={{ uri: imageUrl }} style={styles.image} />
    <View style={styles.info}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.city}>{city}</Text>
      <Text style={styles.price}>{price.toLocaleString()} FCFA / nuit</Text>
      <Text style={styles.rating}>⭐ {rating.toFixed(1)}</Text>
    </View>
  </TouchableOpacity>
);

13.3 Schémas d'architecture
Diagramme de déploiement (simplifié) :
[Application Mobile (iOS/Android)] ──HTTPS──▶ [API Backend – api.primeo.ci (Render)] ──▶ [PostgreSQL DB (Render/Neon)]
[Application Mobile] ──WebSocket (Socket.io)──▶ [API Backend]
[Dashboard Admin – admin.primeo.ci (Render)] ──HTTPS──▶ [API Backend]
[Site Légal – legal.primeo.ci (Netlify)] ── (statique, sans appels API)
[API Backend] ──▶ [Genius Pay] | [Brevo] | [OneSignal] | [Orange SMS] | [Cloudinary] | [Geoapify]

Diagramme de séquence – Réservation option 10 % (simplifié) :
14.	Client → POST /api/bookings (dates, property_id, option=ten_percent_online)
15.	Backend → Vérifie disponibilité (table availabilities)
16.	Backend → POST Genius Pay API (montant = 10 % du total)
17.	Genius Pay → retourne checkout_url
18.	Backend → répond avec checkout_url
19.	Client → ouvre WebView (checkout_url)
20.	Client → complète le paiement sur Genius Pay
21.	Genius Pay → POST /api/webhooks/genius-pay (event: payment.success)
22.	Backend → vérifie HMAC, confirme booking, bloque disponibilités, envoie notifications

13.4 Scripts de migration PostgreSQL
Les scripts de migration initiale sont gérés par Prisma Migrate et générés depuis le fichier schema.prisma. La commande npx prisma migrate dev --name init génère le premier script SQL. Les migrations suivantes sont incrémentales. Un fichier seed.ts est disponible pour peupler la base de données de test.
Les fichiers de migration sont versionnés dans le dossier prisma/migrations/ et committés dans le dépôt Git. En production, la commande npx prisma migrate deploy est exécutée automatiquement lors du déploiement (voir section 12.4).
13.5 Variables d'environnement
Liste exhaustive des variables d'environnement nécessaires au backend :
•	DATABASE_URL (obligatoire) : chaîne de connexion PostgreSQL (ex : postgresql://user:pass@host:5432/primeo).
•	GENIUS_PAY_API_KEY (obligatoire) : clé publique Genius Pay.
•	GENIUS_PAY_SECRET_KEY (obligatoire) : clé secrète Genius Pay.
•	GENIUS_PAY_WEBHOOK_SECRET (obligatoire) : secret pour la vérification HMAC des webhooks.
•	BREVO_API_KEY (obligatoire) : clé API Brevo pour les emails transactionnels.
•	BREVO_SENDER_EMAIL : notifications@primeo.ci (adresse expéditeur validée dans Brevo).
•	JWT_SECRET (obligatoire) : clé secrète pour la signature des JWT (minimum 64 caractères aléatoires).
•	ONESIGNAL_APP_ID (obligatoire) : identifiant de l’application OneSignal pour les notifications push.
•	ONESIGNAL_API_KEY (obligatoire) : clé REST API OneSignal.
•	ORANGE_SMS_CLIENT_ID et ORANGE_SMS_CLIENT_SECRET (obligatoires) : credentials Orange SMS API pour les SMS OTP.
•	ORANGE_SMS_SENDER_NAME : nom expéditeur affiché sur les SMS (ex : PRIMEO).
•	CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (obligatoires) : credentials Cloudinary.
•	GEOAPIFY_API_KEY (obligatoire) : clé API Geoapify pour la géolocalisation, l’autocétion et l’affichage des cartes.
•	FRONTEND_URL : URL de l'application mobile (utilisée pour les liens de réinitialisation en deep link).
•	BACKEND_URL : URL de l'API (ex : https://api.primeo.ci).
•	LEGAL_SITE_URL : https://legal.primeo.ci.
•	SENTRY_DSN (optionnel) : DSN Sentry pour le monitoring des erreurs.
•	LOGTAIL_TOKEN (optionnel) : token Logtail pour la centralisation des logs.
•	UPSTASH_REDIS_REST_URL (optionnel) : URL REST Upstash Redis pour le rate limiting et l’adaptateur Socket.io en multi-instances.
•	UPSTASH_REDIS_REST_TOKEN (optionnel) : token d’authentification Upstash Redis.

