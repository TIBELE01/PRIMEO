# Changelog

Tous les changements notables de ce projet sont documentés dans ce fichier.  
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### Ajouté
- Synchronisation iCal (Airbnb, Booking) — import automatique des dates bloquées externes
- Templates de messages rapides — CRUD pro, chips génériques client
- Photos sur les avis — jusqu'à 3 photos par avis, carrousel sur la fiche détail
- Notification 24 h avant l'expiration d'un boost
- Listes de favoris synchronisées en base de données (migration depuis AsyncStorage)
- Publications supplémentaires activées immédiatement après paiement (polling Genius Pay)

### Modifié
- Réorganisation du dépôt : documentation rangée par thème dans `docs/`, tests de charge regroupés dans `tests/load/`

### Supprimé
- Code jamais importé, fichiers vides, doublons, ressources de la vitrine non chargées, dépendances inutilisées, dossiers `infra/` et `packages/shared-types/` — détail fichier par fichier dans [docs/maintenance/nettoyage-2026-11.md](docs/maintenance/nettoyage-2026-11.md)

## [0.1.0] — 2026-06-01

### Ajouté
- Version initiale de la plateforme Primeo (Côte d'Ivoire)
- Authentification JWT, gestion des rôles (client / professionnel / admin)
- Réservations, paiements Genius Pay, messagerie temps réel (Socket.io)
- Abonnements professionnels avec publications et boosts
- Application mobile React Native / Expo
