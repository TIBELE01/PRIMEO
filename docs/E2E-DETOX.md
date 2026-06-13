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

## testID implémentés (utilisés par `complete-flow.test.js`)

Les `testID` ci-dessous ont été **ajoutés aux écrans** pour rendre le parcours
déterministe. Le scénario garde des replis sur le texte FR via `tapFirst([...])`.

| testID | Écran / fichier |
|---|---|
| _(onglets)_ | ciblés par **libellé** (`by.label('Connexion'/'Accueil'/'Rechercher')`) — `tabBarButtonTestID` non typé en bottom-tabs v6 |
| `go-register` | `screens/auth/WelcomeScreen.tsx` |
| `register-firstName/lastName/email/phone` | `RegisterScreen/Step2PersonalInfo.tsx` (helper `field`) |
| `register-password`, `register-confirmPassword`, `register-next` | `RegisterScreen/Step2PersonalInfo.tsx` |
| `register-accept-terms`, `register-submit` | `RegisterScreen/Step5Validation.tsx` |
| `search-bar`, `search-results`, `property-card-<index>` | `screens/client/Search/SearchScreen.tsx` (+ `Home/PropertyCard.tsx`) |
| `property-detail-screen`, `cta-reserve` | `screens/client/PropertyDetail/PropertyDetailScreen.tsx` |
| `payment-option-<full_online\|ten_percent_online\|zero_online>` | `components/booking/PaymentOptionCard.tsx` |
| `booking-confirm` | `screens/client/Booking/BookingScreen.tsx` |
| `booking-confirmation-screen` | `screens/client/Booking/BookingConfirmationScreen.tsx` |

> Flux d'inscription **client** (role=client) : `Step2 PersonalInfo` →
> `register-next` → `Step5 Validation` → `register-accept-terms` →
> `register-submit`. (Les étapes pro KYC sont ignorées pour un client.)

## Limites connues

- Le parcours fait une vraie réservation **option 10 %** : prévoir un
  environnement de test (backend staging + Genius Pay sandbox) ; la WebView de
  paiement n'est pas automatisée ici (le scénario s'arrête à la confirmation
  côté app, le webhook étant couvert par les tests d'intégration backend
  `payment-options.int.spec.ts`).
- L'app Expo managed impose `expo prebuild` à chaque build natif.
