# Compte-rendu — Paiements Genius Pay & Workflow KYC

Date : 2026-06-07

Ce document récapitule les corrections apportées aux paiements Genius Pay et la mise
en place complète du workflow KYC, ainsi que la procédure de test end-to-end.

---

## Partie 1 — Genius Pay

### 1.1 Configuration vérifiée

Variables d'environnement (présentes en production, valeurs non affichées ici) :

| Variable | Rôle | État |
|---|---|---|
| `GENIUS_PAY_API_KEY` | Clé publique (`pk_live_…`) | ✅ présente |
| `GENIUS_PAY_SECRET_API_KEY` | Clé secrète (`sk_live_…`) | ✅ présente |
| `GENIUS_PAY_API_URL` | `https://pay.genius.ci/api/v1/merchant` | ✅ présente |
| `GENIUS_PAY_WEBHOOK_SECRET` | Secret HMAC (`whsec_…`) | ✅ présente |

### 1.2 Bugs corrigés

1. **URL de webhook erronée** — `genius-pay.service.ts` construisait l'URL de
   notification comme `${BACKEND_URL}/webhooks/genius-pay`, alors que le routeur est
   monté sous **`/api/webhooks`** (voir `app.ts`). Genius Pay appelait donc une URL en
   404 et aucun webhook n'était reçu. Corrigé → `${BACKEND_URL}/api/webhooks/genius-pay`.

2. **Authentification du remboursement** — `refund.service.ts` utilisait
   `Authorization: Bearer <apiKey>`, ce que l'API Genius Pay rejette. Le service a été
   réécrit pour **déléguer à `geniusPayService.refundPayment`**, qui utilise les bons
   en-têtes `X-API-Key` / `X-API-Secret` et le bon payload
   (`amount`, `currency`, `reason`). Le service met désormais à jour la transaction
   d'origine (`refunded`) et trace une transaction dédiée de type `refund`.

### 1.3 Flux d'initiation de paiement

- `POST /payments` → `geniusPayService.initiatePayment` envoie `amount`, `currency`,
  `customer{name,phone,email}`, `return_url`, `callback_url`/`webhook_url`, `metadata`.
- La réponse est dénormalisée (`unwrap` + `pick`) pour extraire `checkout_url` et
  `reference` quelle que soit la convention de nommage renvoyée.
- Le téléphone client est obligatoire (Genius Pay en déduit l'opérateur Mobile Money).

### 1.4 Webhooks — sécurité et idempotence

L'endpoint `POST /api/webhooks/genius-pay` applique le pipeline (`webhooks.service.ts`) :

1. **HMAC-SHA256** sur le corps brut (`X-Genius-Signature`) vs `GENIUS_PAY_WEBHOOK_SECRET`.
2. **Anti-rejeu** : fenêtre de timestamp ±5 min.
3. **Déduplication** : nonce stocké en Redis (TTL 5 min).
4. **Traitement idempotent** : `processSuccessfulPayment` / `processFailedPayment`
   ignorent les transactions déjà traitées.

### 1.5 Gestion des erreurs & rattrapage

- Paiement échoué → transaction `failed`, réservation `cancelled_by_client`,
  notifications (email + push) envoyées au client.
- Webhook manqué → le cron **`webhook-recovery.job`** (toutes les heures) interroge
  `getPaymentStatus` pour les transactions `initiated` de +10 min et applique le
  bon traitement (succès/échec).

### 1.6 Tests automatisés ajoutés

`refund.service.spec.ts` (5 cas) :
- remboursement éligible (vérifie l'usage de `X-API-Key`/`X-API-Secret` via le service) ;
- transaction inexistante → 404 ;
- transaction non réussie → 400 ;
- montant > montant payé → 400 ;
- échec Genius Pay → 502 sans marquer l'original comme remboursé.

### 1.7 Procédure de test end-to-end (à exécuter avec accord explicite)

> ⚠️ Les clés sont **live** : un paiement de test débite réellement un compte. Cette
> étape n'a pas été exécutée automatiquement et nécessite votre validation.

1. Dans le dashboard Genius Pay, configurer le webhook :
   `https://primeo-api.onrender.com/api/webhooks/genius-pay`.
2. Créer une réservation de test à faible montant (ex. 100 FCFA).
3. Vérifier que `POST /payments` renvoie une `checkout_url`.
4. Régler via la page de checkout (Mobile Money).
5. Vérifier la réception du webhook (logs `Genius Pay webhook — event=payment.success`)
   et le passage de la réservation en `confirmed`.
6. Rembourser via l'action admin (litige) et vérifier le statut `refunded`.

---

## Partie 2 — Workflow KYC

### 2.1 Problème initial

`POST /professional/kyc` levait `Error('Not implemented')`. Les professionnels ne
pouvaient pas soumettre de pièces ; l'admin validait à l'aveugle.

### 2.2 Backend — implémentation

- **`professionalService.submitKyc(userId, input, files)`** :
  - met à jour (ou crée) le `ProfessionalProfile` (businessName, rccm, taxId,
    touristLicense, adresse, description) ;
  - téléverse chaque document vers **Cloudinary** (dossier `primeo/kyc`, mode `auto`
    pour gérer images **et** PDF) ;
  - enregistre les URLs dans `professional_documents` ;
  - repasse `verificationStatus` à `pending` et réinitialise `verifiedAt/By/notes`
    (cas d'une re-soumission après rejet).
- **Validation** : type MIME (`jpeg/png/webp/pdf`) et taille (≤ 10 Mo) par fichier.
- **Route multipart** : `multer.fields([id_card, rccm_extract, tax_id_certificate,
  tourist_license, other])`, puis validation Zod des champs texte.
- **`getKycStatus`** renvoie désormais le statut, le motif de rejet et la liste des
  documents soumis.
- **Upload Cloudinary** : ajout d'un paramètre `resourceType` (`image|auto|raw`) à
  `uploadToCloudinary` pour router correctement les PDF.

### 2.3 Validation admin (déjà en place, vérifiée)

- `GET /admin/users/:id/kyc-documents` → profil + documents.
- `POST .../kyc/approve` → statut `approved`, compte `active`, abonnement initial créé,
  audit log + notification `kyc_approved` (email + push).
- `POST .../kyc/reject` → statut `rejected` + motif, audit log + notification
  `kyc_rejected`.

### 2.4 Mobile — (re)soumission

- Nouveau service `kycUpload.ts` : construit le multipart (web `File`/`blob:` **et**
  React Native `uri`) et mappe les clés mobiles (`identity`…) vers les champs backend
  (`id_card`…).
- Nouveau endpoint `professionalApi` : `getKycStatus`, `submitKyc(FormData)`.
- À l'inscription : les documents sont téléversés après authentification
  (mode bypass dans `Step5Validation`, sinon après OTP dans `OtpVerificationScreen`).
- Écran **Statut KYC** désormais fonctionnel (composant partagé `KycStatusScreenBase`)
  pour les 4 verticales : affiche le statut, le motif de rejet, les documents soumis,
  et permet la re-soumission tant que le compte n'est pas approuvé.

### 2.5 Tests automatisés ajoutés

`professional.service.spec.ts` (4 cas) :
- re-soumission : upload de 2 documents en mode `auto`, statut remis à `pending` ;
- création du profil si absent ;
- rejet d'un format de fichier non autorisé (400) ;
- soumission sans fichier (mise à jour des infos seule).

---

## Résultat

- TypeScript : 0 erreur (backend + mobile).
- Tests : backend **133 ✓**, mobile **46 ✓**.
- Aucune référence Moneroo résiduelle dans le code.
- ⏳ Reste à exécuter (avec accord) : le paiement live de bout en bout (§1.7).
