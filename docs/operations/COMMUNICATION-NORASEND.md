# Communication WhatsApp & Telegram (Norasend)

Section **Communication** du dashboard admin (Super Admin uniquement) : messages à un ou
plusieurs destinataires, diffusions avec variables (`{{prenom}}`), historique des envois et
liste de désinscriptions. L'envoi passe par l'API Norasend (`https://api.norasend.com`),
documentation : <https://norasend.com/docs/api>.

## 1. Mise en service

1. **Clé d'API** Norasend dans la variable Render `NORASEND_API_KEY` (service `api-primeo`).
2. **WhatsApp** : dans le tableau de bord Norasend, connectez le numéro d'envoi en **scannant le QR code**
   (WhatsApp → Appareils connectés). Aucun identifiant de session n'est à copier : la clé suffit.
3. **Telegram** : créez un bot avec **@BotFather** (`/newbot`) et enregistrez son jeton dans Norasend.
   Un bot ne peut écrire qu'aux personnes qui lui ont **écrit en premier**, ou aux canaux/groupes dont il est administrateur.
4. Variables optionnelles : `NORASEND_API_URL` (défaut `https://api.norasend.com`),
   `NORASEND_AUTH_SCHEME` (`bearer` par défaut, ou `x-api-key`).

La page Communication affiche l'état de chaque canal (quota Norasend interrogé en direct). Un canal non connecté
(HTTP 409) est signalé avec la marche à suivre.

## 2. Ce que le code fait (selon la documentation officielle)

- Endpoints : `POST /api/v1/{whatsapp,telegram}/{send,broadcast}`, `GET /api/v1/{whatsapp,telegram}/quota`.
- Réponses enveloppées `{ success, data, error{code,message,field}, timestamp }`.
- **« Accepté » ≠ « livré »** : un succès signifie que Norasend a mis le message en file. L'historique affiche donc « Accepté ».
- **Diffusion WhatsApp** (réponse 202, asynchrone) : un appel par 100 destinataires, gabarit brut + variables **par numéro**
  (`{ "2250700000001": { "prenom": "Awa" } }`) ; Norasend renvoie `accepted / skippedQuota / skippedInvalid`. Si
  `accepted` est inférieur au nombre de destinataires, la campagne passe en « partielle » avec une explication.
- **Diffusion Telegram** : variables substituées côté Primeo ; destinataires au texte identique regroupés (100 max).
- **Média** : toujours envoyé destinataire par destinataire (`/send`).
- **Délais entre messages** imposés par Norasend : WhatsApp 3 000 à 30 000 ms (défaut 4 000), Telegram 500 à 10 000 ms (défaut 1 000).
- **Erreurs** : 401 clé refusée · 402 abonnement/quota · 409 canal non connecté · 422/400 message refusé (champ indiqué) ·
  429 nouvel essai automatique (1 s puis 2 s, max 2 fois) · 5xx/absence de réponse : **aucun nouvel essai**
  (pas de clé d'idempotence : risque de doublon), message d'avertissement « vérifiez l'historique Norasend ».

## 3. Garde-fous

- **Consentement obligatoire** : case à cocher stockée avec la campagne. Les envois non sollicités sont contraires à la loi
  ivoirienne n°2013-450 et aux règles de WhatsApp/Telegram ; sur une session WhatsApp non officielle, les envois massifs
  non sollicités exposent le numéro au **bannissement** (Norasend recommande WhatsApp Pro, API officielle Meta, pour le marketing de masse).
- **Désinscriptions** par canal : jamais contactés, même dans une campagne ultérieure.
- **Variables** : un message n'est jamais envoyé avec un `{{prenom}}` non rempli (refus avant tout envoi).
- **Plafonds** : 500 destinataires par campagne, 4 000 caractères.
- **Historique** : `messaging_campaigns`, `messaging_campaign_recipients`, `messaging_opt_outs` + journal d'audit.
- **Au-delà de 5 destinataires** l'envoi continue en arrière-plan ; une campagne interrompue par un redémarrage est clôturée au démarrage.

## 4. Test réel

Depuis la page **Communication** (envoi simple puis diffusion), ou depuis `backend/` :

```bash
NORASEND_TEST_WHATSAPP="2250700000001,2250700000002,2250700000003" \
NORASEND_TEST_TELEGRAM="123456789,987654321,@mon_canal" \
npx tsx scripts/norasend-smoke.ts --i-have-consent
```

N'utilisez que des numéros/chats dont les titulaires acceptent de recevoir le test.

## 5. Limites connues

- Pas de réception : une réponse « STOP » n'est pas détectée ; ajoutez le contact aux désinscriptions.
- Envoi en mémoire du processus : pour de très gros volumes, prévoir une file d'attente.
