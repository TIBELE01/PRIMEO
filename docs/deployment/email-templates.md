# Templates email (Brevo) — Référence

## Modèle d'envoi : rendu local, pas de dashboard Brevo

Primeo **n'utilise pas** les templates du dashboard Brevo. Tous les emails sont
rendus en HTML côté serveur (`renderLocalTemplate` dans
`backend/src/common/utils/mailer.ts`) puis envoyés en **HTML brut** via l'API
transactionnelle Brevo (`POST /v3/smtp/email`).

**Conséquence : il n'y a aucun template à créer dans Brevo.** Seule la clé
`BREVO_API_KEY` est requise pour l'envoi. Les « IDs » ci-dessous sont des
sélecteurs internes (`switch`) vers le bon HTML local, pas des IDs Brevo.

## Les 11 templates référencés (`backend/src/config/brevo.config.ts`)

| ID | Clé | Déclencheur | Rendu local |
|----|-----|-------------|-------------|
| 1  | `welcomeClient` | Inscription client | ✓ |
| 2  | `welcomeProfessional` | Inscription pro | ✓ |
| 3  | `bookingConfirmation` | Réservation confirmée | ✓ |
| 4  | `bookingCancellation` | Réservation annulée | ✓ |
| 5  | `paymentReceipt` | Paiement réussi | ✓ |
| 6  | `kycApproved` | KYC validé | ✓ |
| 7  | `kycRejected` | KYC refusé | ✓ |
| 8  | `subscriptionRenewal` / `boostExpiryReminder` | Renouvellement abo / rappel boost (ID partagé) | ✓ |
| 9  | `otpCode` | Code de vérification | ✓ |
| 10 | `passwordReset` | Réinitialisation mot de passe | ✓ |
| 11 | `referralReward` | Récompense parrainage | ✓ |

> Le mot de passe oublié passe principalement par `sendPasswordResetEmail()`
> (HTML inline avec lien expirable). Le `case 10` de `renderLocalTemplate`
> garantit un rendu dédié si l'ID 10 est appelé directement.

## Vérification

```bash
cd backend
npx tsx scripts/verify-brevo-templates.ts
```

Le script :
1. liste les 11 IDs et confirme que chacun a un rendu HTML dédié (pas le fallback générique) ;
2. teste la connexion à l'API Brevo si `BREVO_API_KEY` est défini.

## Procédure manuelle (si migration future vers des templates Brevo)

Si un jour vous souhaitez gérer les templates dans le dashboard Brevo :

1. **Brevo → Campaigns → Templates → New template**
2. Recréer chaque HTML depuis `renderLocalTemplate` (copier le HTML généré)
3. Noter l'ID Brevo réel attribué et le reporter dans `brevo.config.ts`
4. Remplacer dans `mailer.ts` l'appel `htmlContent` par `templateId` + `params`
   dans l'appel API Brevo (`templateId` + `params` au lieu de `htmlContent`)

Ce n'est **pas nécessaire** aujourd'hui — le rendu local est plus simple à versionner.
