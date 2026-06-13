# Tests End‑to‑End (Detox) — mobile Primeo

Dernière mise à jour : 2026-06-13

Detox pilote l'app **réelle** sur un émulateur/simulateur et rejoue un parcours
utilisateur complet. Primeo étant une app **Expo managed**, Detox a besoin d'un
binaire natif : on génère d'abord les projets natifs avec `expo prebuild`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `.detoxrc.js` | Configuration Detox (apps, devices, configurations) |
| `e2e/jest.config.js` | Runner Jest dédié à Detox |
| `e2e/complete-flow.test.js` | **Scénario complet** : inscription client → recherche → réservation 10 % → confirmation |
| `__tests__/e2e/*.e2e.js` | Anciens fragments (auth/search/booking) — historiques, non exécutés par le runner ci‑dessus |

## Pré-requis locaux

- **Android** : Android SDK + un AVD nommé `Pixel_6_API_34` (modifiable dans
  `.detoxrc.js`), Java 17.
- **iOS** (macOS only) : Xcode + `applesimutils` (`brew tap wix/brew && brew install applesimutils`).
- Detox CLI : `npm i -g detox-cli` (optionnel ; les scripts npm utilisent le binaire local).

## Lancer en local (Android)

```bash
cd mobile
npm install --legacy-peer-deps
npm run e2e:prebuild          # expo prebuild --platform android (génère android/)
npm run e2e:build:android     # detox build (gradle assembleDebug + androidTest)
npm run e2e:test:android      # detox test sur l'émulateur
```

Pour iOS : `detox build --configuration ios.sim.debug` puis
`detox test --configuration ios.sim.debug`.

## Intégration continue

Workflow `.github/workflows/ci-mobile.yml`, job **`e2e-detox-android`** :

- **non bloquant** (`continue-on-error: true`) — un échec ne casse pas la CI ;
- exécute `expo prebuild` → `detox build` → `detox test` sur un émulateur
  Android (`reactivecircus/android-emulator-runner`, API 34, x86_64, KVM activé).

À stabiliser avant de le rendre bloquant : voir « testID requis » ci‑dessous.

## testID requis par `complete-flow.test.js`

Le scénario privilégie les `testID` (stables) avec repli sur le texte FR visible.
Pour une exécution fiable, ajouter ces `testID` aux écrans concernés (certains
existent déjà) :

| testID | Écran |
|---|---|
| `tab-Connexion`, `tab-Accueil`, `tab-Rechercher` | navigateurs à onglets |
| `go-register`, `register-firstName/lastName/email/phone/password`, `register-submit` | inscription |
| `search-bar`, `search-results`, `property-card-0` | recherche |
| `property-detail-screen`, `cta-reserve` | fiche détail |
| `payment-option-ten_percent_online`, `booking-confirm` | tunnel de réservation |
| `booking-confirmation-screen` | confirmation |

Les `tapFirst([...])` du scénario tolèrent l'absence de certains `testID` en
retombant sur les libellés (`Réserver`, `10% en ligne`, `Confirmer`,
`Réservation confirmée`…), mais l'ajout des `testID` rend le test déterministe.

## Limites connues

- Le parcours fait une vraie réservation **option 10 %** : prévoir un
  environnement de test (backend staging + Genius Pay sandbox) ; la WebView de
  paiement n'est pas automatisée ici (le scénario s'arrête à la confirmation
  côté app, le webhook étant couvert par les tests d'intégration backend
  `payment-options.int.spec.ts`).
- L'app Expo managed impose `expo prebuild` à chaque build natif.
