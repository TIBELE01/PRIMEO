# Audit final avant mise en production — 27/11/2026

Outils : Playwright (navigateur réel, 5 résolutions, erreurs JS/console/réseau), Firecrawl (liens
externes), tests API scriptés (≈ 260 contrôles), MCP Supabase, Render, Brevo, Sentry, Gmail.
Compte client créé pour l'audit : alias `+final` de la boîte support (client « Awa Koné »).

## A. Résumé

- **Préparation : 88 %. Verdict : prêt avec réserves.**
- Anomalies détectées : 9 — corrigées : 3 (dont 1 critique) — restantes : 6, toutes de votre ressort
  (plan d'hébergement, contenus, secrets, une requête SQL à confirmer).

| # | Gravité | Anomalie | Statut |
|---|---|---|---|
| 1 | **Critique** | Annuler une réservation payée (ou dont les dates ont été modifiées) ne libérait pas les jours « réservé » du calendrier : dates bloquées définitivement | Corrigé (`3d1ae88`), re-testé en production |
| 2 | Élevée | Chiffres non vérifiables sur la vitrine : 1 200+ pros, 18 villes, 10+ partenaires, 12 000+ abonnés, 4,8/5 · 12 000 avis, 100 % énergie verte, 12 médias, « certifications » | Corrigé (`62aa2c3`) : chiffres réels de l'API (54 annonces, 6 villes, 19 réservations, 7 clients) |
| 3 | Faible | Commentaire OTP « 5 min » alors que la durée est 10 min | Corrigé (`413df6d`) |
| 4 | Élevée | API sur le **plan gratuit Render** : mise en veille après 15 min (réveil ≈ 1 min), 50 utilisateurs simultanés → médiane 5 s | **À faire par vous** |
| 5 | Moyenne | 3 jours restés bloqués par l'ancien défaut n° 1 (2 sur « Studio Design Marcory Zone 4 », 1 sur « Studio Moderne Marcory ») | Requête prête, confirmation Supabase non reçue |
| 6 | Moyenne | Blog vide (0 article) au lancement | Contenu à publier |
| 7 | Moyenne | `ONESIGNAL_WEBHOOK_SECRET` absent (alerte Sentry NODE-76) | **À faire par vous** |
| 8 | Moyenne | Mentions `[À COMPLÉTER]` (RCCM, NCC, déclaration ARTCI) sur 7 pages légales | **À faire par vous** |
| 9 | Faible | Limite de corps JSON de 10 Mo (risque de saturation) | Recommandation |

Corrigés plus tôt aujourd'hui et déployés : push refusés par OneSignal (`android_channel_id`), facture
sans ligne de code promo, expéditeur des emails = boîte qui reçoit les réponses (4 expéditeurs Brevo
ajoutés), KYC privés, newsletter → Brevo, annonces non publiées masquées.

## B. Détail par plateforme

| Plateforme | Tests | OK | KO | Notes |
|---|---|---|---|---|
| Vitrine + légal | 49 pages × (statut, title, description, lang, h1, alt, débordement desktop/mobile, JS) + 68 liens + 11 formulaires invalides + cartes | 49/49 pages, 100 % liens internes, formulaires → 400 | 4 pages à chiffres fictifs (corrigées) | 4 institutions externes vérifiées via Firecrawl (200) ; réseaux sociaux non vérifiables par robot |
| App client | 36 contrôles API + Playwright (fiches 4 types, fenêtre de réservation, 6 onglets en navigation rapide + défilement long) | 36 | 1 (dates non libérées, corrigé) | 3 options de paiement visibles, aucune erreur JS |
| App pros (×4) | 27 contrôles API par compte + création/modification/duplication/suppression d'annonce + acceptation/refus + navigation rapide | Tous | — | iCal = lien d'abonnement ; retrait < 1 000 FCFA refusé |
| Admin | 60 pages × 5 résolutions + 30 actions API | 60/60 pages, 30/30 | — | Code promo créé/appliqué (−20 % → 56 000 FCFA)/supprimé, CV téléchargé (PDF), CSV des journaux |
| API | 46 contrôles sécurité/validation/perfs + charge | 45 | 0 réel | Corps de 2 Mo accepté (limite 10 Mo, point 9) |

## C. Flux métier

| Flux | Résultat |
|---|---|
| Client hébergement (inscription → recherche → fiche → 3 options → conversation auto → annulation) | OK |
| Paiement réel (Genius Pay → webhook signé → confirmation → facture → emails) | OK (paiement réel du 27/11, 250 FCFA) |
| Restaurant (menu, commande, réservation de table) | OK |
| Immobilier (expression d'intérêt sans paiement) | OK |
| Pro (annonce → en attente → acceptation → refus → notifications) | OK |
| Dates indisponibles → 3 alternatives proposées ; modification de dates (même durée) | OK |
| Abonnement : renouvellement par lien de paiement | OK en tests unitaires ; première échéance réelle le 16/12 |
| Notifications : email + in-app | OK ; push corrigé, réception sur téléphone non vérifiable ici ; SMS non testé |

## D. Intégrations

| Intégration | Résultat |
|---|---|
| Genius Pay | OK (paiement réel, webhook signé, non signé → 400) |
| Brevo | OK (DKIM/SPF/DMARC valides, 13 expéditeurs, webhook signé) |
| OneSignal | Push corrigé ; secret de webhook manquant ; test sur téléphone requis |
| SMS | Non testé (OTP par email) |
| Cloudinary | OK (KYC privés, liens signés) |
| Geoapify | OK (recherche géographique, 0 annonce active sans coordonnées) |
| Upstash Redis | OK (cache des stats, limitation) |
| Sentry | OK ; 2 alertes générées par l'audit résolues |

## E. Sécurité

Aucune faille trouvée : 19 routes protégées → 401 sans jeton, 9 routes admin → 403 avec un jeton
client, jeton forgé → 401, injections SQL/NoSQL/XSS → 400/403 (jamais 5xx), JSON mal formé → 400,
webhooks non signés refusés (Genius Pay, Brevo, OneSignal), HSTS + CSP + nosniff + frame-ancestors
sur les 5 domaines, CORS fermé aux origines inconnues, mot de passe oublié sans énumération
d'emails. À faire : 2FA du super-admin, rotation de la clé Genius Pay, détection de réutilisation
des refresh tokens (Supabase).

## F. Régressions re-testées

OK : 3 options de paiement, acceptation de réservation, création de code promo, téléchargement CV,
retrait minimum 1 000 FCFA, codes parrainage courts, dates alternatives, formulaires → 400, règles du
mot de passe affichées, OTP 10 min, messages d'erreur en français, webhooks signés, crash
`removeChild` / navigation rapide (5 comptes, 0 erreur JS), statistiques par annonce, facture avec
remise, envoi groupé (pages admin). Non re-testé ici : visite 3D, lecture vidéo au défilement, boosts
dans la recherche (aucun boost actif en ce moment), connexion Google.

## H. Actions de votre ressort

1. Passer l'API Render au plan payant « Starter » au minimum (pas de mise en veille).
2. Changer la clé secrète Genius Pay, puis `GENIUS_PAY_SECRET_API_KEY` sur Render.
3. Activer la 2FA du super-admin ; activer la détection des refresh tokens réutilisés (Supabase).
4. Renseigner `ONESIGNAL_WEBHOOK_SECRET` ; tester push et SMS sur un téléphone.
5. Compléter RCCM / NCC / ARTCI dans les pages légales.
6. Publier quelques articles de blog avant l'ouverture.
7. Confirmer la libération des 3 jours bloqués (requête SQL fournie dans la réponse).
