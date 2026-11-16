# Communication WhatsApp & Telegram (Norasend)

Section **Communication** du dashboard admin (Super Admin uniquement) : messages à un ou
plusieurs destinataires, diffusions avec variables (`{{prenom}}`), historique des envois et
liste de désinscriptions. L'envoi passe par l'API Norasend (`https://api.norasend.com`).

## 1. Mise en service (actions à faire vous-même)

1. **Compte Norasend** : récupérez la clé d'API.
2. **WhatsApp** : dans l'interface Norasend, créez une session et **scannez le QR code** avec le
   téléphone du numéro à connecter (WhatsApp → Appareils connectés). Notez l'identifiant de session.
3. **Telegram** : créez un bot avec **@BotFather** (`/newbot`), puis enregistrez son jeton dans
   Norasend. Notez l'identifiant du bot. Pour écrire à un canal ou un groupe, ajoutez le bot comme administrateur.
4. **Render** (service `api.primeo`, onglet Environment) :

   | Variable | Valeur |
   |---|---|
   | `NORASEND_API_KEY` | clé d'API Norasend |
   | `WHATSAPP_SESSION_ID` | identifiant de la session WhatsApp |
   | `TELEGRAM_BOT_ID` | identifiant du bot Telegram |
   | `NORASEND_API_URL` | `https://api.norasend.com` (défaut) |
   | `NORASEND_AUTH_SCHEME` | `bearer` (défaut) ou `x-api-key` |

   Tant que `NORASEND_API_KEY` est absente, la page Communication affiche « non configuré » et refuse les envois.
5. **Test réel** (depuis `backend/`, avec le `.env` de production ou de test) :

   ```bash
   NORASEND_TEST_WHATSAPP="2250700000001,2250700000002,2250700000003" \
   NORASEND_TEST_TELEGRAM="123456789,987654321,@mon_canal" \
   npx tsx scripts/norasend-smoke.ts --i-have-consent
   ```

   Il envoie un message WhatsApp, un message Telegram, puis une diffusion à 3 sur chaque canal.

## 2. Points à confirmer avec la documentation Norasend

Le code suit les formats communiqués (`/api/v1/{whatsapp,telegram}/{send,broadcast}`, `to`/`type`/`text`,
`recipients`, `chatId`, `delayMs`). Ces points n'étaient **pas** dans les informations reçues et reposent
sur des hypothèses, toutes isolées dans `modules/communications/` :

- **Authentification** : `Authorization: Bearer <clé>` par défaut ; `NORASEND_AUTH_SCHEME=x-api-key`
  bascule sur l'en-tête `X-API-Key`. Une erreur 401 s'affiche avec ce rappel.
- **Session / bot** : `WHATSAPP_SESSION_ID` est envoyé dans le champ `sessionId`, `TELEGRAM_BOT_ID`
  dans `botId` (uniquement s'ils sont définis).
- **Diffusion Telegram** : la liste des chats est envoyée dans `chatIds`.
- **Pièces jointes** : champs `mediaUrl` et `caption` ; types `image` / `file` (WhatsApp) et `photo` / `document` (Telegram).
- **Réponses** : succès = HTTP 2xx sans `success:false` ni `error` ; un détail par destinataire est lu s'il est fourni (`results`).

## 3. Fonctionnement et garde-fous

- **Consentement obligatoire** : chaque envoi exige la case « les destinataires ont accepté de recevoir ces messages »
  (stockée avec la campagne). Les envois non sollicités sont contraires à la loi ivoirienne n°2013-450 et aux règles
  de WhatsApp et Telegram ; Norasend déconseille les envois massifs non sollicités sur une session WhatsApp non
  officielle (bannissement du numéro) et recommande WhatsApp Pro (API officielle Meta) pour le marketing de masse.
- **Désinscriptions** : un contact listé n'est jamais contacté (par canal), même dans une campagne ultérieure.
- **Variables** : `{{prenom}}`, `{{nom}}` (une valeur par destinataire, ou une valeur par défaut). Elles sont
  remplacées par Primeo avant l'envoi ; un message n'est **jamais** envoyé avec un `{{prenom}}` non rempli.
  Les destinataires dont le texte final est identique sont regroupés dans un seul appel de diffusion (100 max).
- **Plafonds** : 500 destinataires par campagne, 4000 caractères, pause entre envois de 3 s (WhatsApp) / 1 s
  (Telegram) par défaut, modifiable (0 à 60 s).
- **Historique** : tables `messaging_campaigns`, `messaging_campaign_recipients` (statut et motif d'échec par
  destinataire) et `messaging_opt_outs`. Chaque campagne est aussi tracée dans le journal d'audit.
- **Au-delà de 5 destinataires**, l'envoi se poursuit en arrière-plan ; l'historique se met à jour seul. Une campagne
  interrompue par un redémarrage du serveur est clôturée au démarrage (destinataires non envoyés marqués en échec).

## 3 bis. Limites connues

- Pas de réception : une réponse « STOP » d'un client n'est pas détectée automatiquement ; ajoutez le contact
  à la liste de désinscriptions.
- L'envoi est en mémoire du processus : pour de très gros volumes, prévoir une file d'attente.
