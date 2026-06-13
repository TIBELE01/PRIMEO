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

## [0.1.0] — 2026-06-01

### Ajouté
- Version initiale de la plateforme Primeo (Côte d'Ivoire)
- Authentification JWT, gestion des rôles (client / professionnel / admin)
- Réservations, paiements Genius Pay, messagerie temps réel (Socket.io)
- Abonnements professionnels avec publications et boosts
- Application mobile React Native / Expo
