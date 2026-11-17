// Questions fréquentes par défaut du centre d'aide (utilisées si la table `faqs` est vide).
// Source de vérité du contenu : rédigé d'après le fonctionnement réel de l'application.
export const DEFAULT_FAQ: Array<{ category: string; question: string; answer: string; order: number }> = [
  {
    "category": "Compte et authentification",
    "question": "Comment créer un compte client ?",
    "answer": "<p>Dans l’application, touchez <strong>Créer un compte</strong> puis choisissez <strong>Client</strong>. Renseignez votre prénom, nom, e-mail, téléphone ivoirien (+225) et un mot de passe, acceptez les CGU et la politique de confidentialité : votre compte est créé immédiatement et vous êtes connecté.</p><p>Détails : <a href=\"/documentation/guide-client.html#compte\">guide du client</a>.</p>",
    "order": 1
  },
  {
    "category": "Compte et authentification",
    "question": "Quelles sont les règles du mot de passe ?",
    "answer": "<p>Le mot de passe doit contenir au moins <strong>8 caractères</strong>, <strong>1 lettre majuscule</strong>, <strong>1 lettre minuscule</strong> et <strong>1 chiffre</strong>.</p>",
    "order": 2
  },
  {
    "category": "Compte et authentification",
    "question": "Je n’ai pas reçu mon code de vérification. Que faire ?",
    "answer": "<p>Le code est envoyé <strong>par e-mail</strong>. Vérifiez vos courriers indésirables, puis touchez « Renvoyer le code ». Il est valable <strong>10 minutes</strong> et vous disposez de <strong>5 essais</strong> ; après 5 codes erronés, demandez-en un nouveau. Le nombre de demandes de code est limité par heure : en cas de blocage, réessayez plus tard.</p>",
    "order": 3
  },
  {
    "category": "Compte et authentification",
    "question": "Puis-je m’inscrire ou me connecter avec Google ?",
    "answer": "<p>Oui, mais <strong>uniquement pour les comptes clients</strong>. Les professionnels se connectent avec leur e-mail et leur mot de passe.</p>",
    "order": 4
  },
  {
    "category": "Compte et authentification",
    "question": "Comment créer un compte professionnel ?",
    "answer": "<p>Touchez <strong>Inscription professionnelle</strong> et choisissez votre activité : <strong>Résidence / Appartement</strong>, <strong>Hôtel</strong>, <strong>Immobilier</strong> ou <strong>Restaurateur</strong>. Vous renseignez vos informations personnelles et professionnelles (nom de l’établissement, adresse, numéro RCCM, numéro de contribuable), téléversez votre <strong>pièce d’identité</strong> et votre <strong>extrait RCCM</strong> (la licence touristique est facultative), puis validez le code reçu par e-mail.</p><p>Votre dossier est ensuite vérifié par l’équipe Primeo, généralement sous <strong>24 à 48 h</strong>. Guide : <a href=\"/documentation/guide-residence.html#compte\">créer son compte professionnel</a>.</p>",
    "order": 5
  },
  {
    "category": "Compte et authentification",
    "question": "Mon compte professionnel est « en attente de validation » ou refusé. Que faire ?",
    "answer": "<p>En attente : la vérification prend généralement 24 à 48 h ; vous êtes prévenu par e-mail et notification dès l’activation.</p><p>Refusé : le <strong>motif du refus</strong> s’affiche dans l’application. Corrigez vos informations ou documents et soumettez une nouvelle demande, ou contactez le support.</p>",
    "order": 6
  },
  {
    "category": "Compte et authentification",
    "question": "J’ai oublié mon mot de passe.",
    "answer": "<p>Sur l’écran de connexion, touchez <strong>Mot de passe oublié</strong> et saisissez votre e-mail. Vous recevez un lien de réinitialisation valable <strong>1 heure</strong>.</p>",
    "order": 7
  },
  {
    "category": "Compte et authentification",
    "question": "Comment activer la double authentification (2FA) ?",
    "answer": "<ol><li>Ouvrez <strong>Profil → Authentification 2FA</strong>.</li><li>Scannez le QR code avec Google Authenticator, Authy, Microsoft Authenticator ou une application équivalente.</li><li>Saisissez le code à 6 chiffres puis confirmez.</li></ol><p>Un code vous sera demandé à chaque connexion. Après 5 codes erronés, la connexion est bloquée pendant 15 minutes.</p>",
    "order": 8
  },
  {
    "category": "Compte et authentification",
    "question": "Comment modifier mes informations, désactiver ou supprimer mon compte ?",
    "answer": "<p>Dans <strong>Profil</strong> : « Modifier mes informations », « Changer le mot de passe », « Exporter mes données », « Désactiver mon compte » et « Supprimer mon compte ». La suppression est refusée tant que vous avez des <strong>réservations à venir</strong> : annulez-les d’abord. Un compte désactivé ne peut être réactivé que par le support.</p>",
    "order": 9
  },
  {
    "category": "Réservations et paiements",
    "question": "Comment réserver un hébergement ?",
    "answer": "<ol><li>Trouvez un bien avec la recherche et ses filtres.</li><li>Choisissez vos dates et le nombre de personnes (dans la limite de la capacité).</li><li>Choisissez l’option de paiement proposée par l’hôte.</li><li>Appliquez un éventuel code promo, vérifiez le récapitulatif et confirmez.</li></ol><p>Guide complet : <a href=\"/documentation/guide-client.html#reserver\">réserver un hébergement</a>.</p>",
    "order": 1
  },
  {
    "category": "Réservations et paiements",
    "question": "Quelles sont les options de paiement d’une réservation ?",
    "answer": "<ul><li><strong>Paiement 100 % en ligne</strong> : vous payez tout à la réservation.</li><li><strong>Acompte de 10 % en ligne</strong> : vous payez 10 % en ligne, le solde est réglé en espèces à l’arrivée.</li><li><strong>Paiement 100 % sur place</strong> : rien en ligne, la réservation est confirmée immédiatement et vous payez en espèces auprès de l’hôte.</li></ul><p>Seules les options activées par l’hôte pour son annonce vous sont proposées.</p>",
    "order": 2
  },
  {
    "category": "Réservations et paiements",
    "question": "Quels moyens de paiement sont acceptés en ligne ?",
    "answer": "<p>Le paiement en ligne s’effectue sur la page sécurisée de notre prestataire <strong>Genius Pay</strong> : Mobile Money (par exemple Wave, Orange Money) et les autres moyens affichés sur cette page. Un <strong>numéro de téléphone</strong> doit figurer dans votre profil pour payer en ligne.</p>",
    "order": 3
  },
  {
    "category": "Réservations et paiements",
    "question": "Primeo ajoute-t-il des frais de service à mon prix ?",
    "answer": "<p>Non. Le prix affiché est le prix à payer : le récapitulatif de réservation n’ajoute aucun frais de service.</p>",
    "order": 4
  },
  {
    "category": "Réservations et paiements",
    "question": "De combien de temps dispose-je pour payer ?",
    "answer": "<p>Après une réservation avec paiement en ligne, vous avez <strong>2 heures</strong> pour finaliser le paiement. Passé ce délai sans paiement, la réservation est <strong>annulée automatiquement</strong> et votre solde portefeuille et votre code promo éventuels vous sont restitués.</p>",
    "order": 5
  },
  {
    "category": "Réservations et paiements",
    "question": "Ma réservation est « en attente de paiement ». Que faire ?",
    "answer": "<p>Terminez le paiement sur la page Genius Pay (si elle s’est fermée, rouvrez la réservation depuis l’onglet Réservations). Dès que le paiement est validé, la réservation passe à « Confirmée ». Si vous avez été débité mais que la réservation n’est pas confirmée, contactez le support avec votre numéro de réservation ou ouvrez un litige « Problème de paiement ».</p>",
    "order": 6
  },
  {
    "category": "Réservations et paiements",
    "question": "Puis-je modifier les dates d’une réservation ?",
    "answer": "<p>L’application ne propose pas la modification des dates. Pour changer de dates, <strong>annulez</strong> la réservation (selon le barème d’annulation) puis effectuez une nouvelle réservation.</p>",
    "order": 7
  },
  {
    "category": "Réservations et paiements",
    "question": "Comment utiliser un code promo ou mon solde portefeuille ?",
    "answer": "<p>Saisissez le code promo à l’étape de réservation. Si votre portefeuille Primeo est crédité (remboursement, parrainage…), le solde est <strong>automatiquement déduit</strong> du prix et apparaît dans le récapitulatif.</p>",
    "order": 8
  },
  {
    "category": "Réservations et paiements",
    "question": "Quand vois-je l’adresse exacte du logement ?",
    "answer": "<p>L’adresse exacte est affichée dans le détail de la réservation <strong>une fois celle-ci confirmée</strong>.</p>",
    "order": 9
  },
  {
    "category": "Réservations et paiements",
    "question": "Comment réserver une table dans un restaurant ?",
    "answer": "<p>Sur la fiche du restaurant, touchez <strong>Réserver une table</strong>, choisissez la date, l’heure et le nombre de couverts, puis indiquez vos coordonnées. La réservation est <strong>gratuite</strong> et <strong>confirmée immédiatement</strong> ; elle est refusée si le restaurant est complet pour ce jour.</p>",
    "order": 10
  },
  {
    "category": "Réservations et paiements",
    "question": "Comment commander un plat ? Dois-je payer en ligne ?",
    "answer": "<p>Ajoutez des plats au panier et choisissez <strong>sur place</strong>, <strong>à emporter</strong> ou <strong>livraison</strong> (adresse obligatoire). Il n’y a <strong>aucun paiement en ligne</strong> : vous réglez auprès du restaurant. Vous suivez la commande : en attente, confirmée, en préparation, prête, livrée.</p>",
    "order": 11
  },
  {
    "category": "Réservations et paiements",
    "question": "Comment acheter ou louer un bien immobilier ?",
    "answer": "<p>Pour l’immobilier, il n’y a ni réservation ni paiement en ligne. Touchez <strong>Exprimer mon intérêt</strong> sur la fiche : l’agent est notifié et vous échangez par messagerie pour organiser la visite. Votre demande apparaît dans Réservations avec le statut « Intérêt exprimé ».</p>",
    "order": 12
  },
  {
    "category": "Réservations et paiements",
    "question": "Où trouver ma facture ?",
    "answer": "<p>Dans le détail de la réservation, via le bouton de téléchargement de la facture, dès qu’elle est générée (elle peut n’être disponible que dans les 24 heures qui suivent le séjour).</p>",
    "order": 13
  },
  {
    "category": "Réservations et paiements",
    "question": "Puis-je voir les prix dans ma devise ?",
    "answer": "<p>Oui : dans les paramètres, choisissez la devise d’affichage (FCFA, euro, dollar US, livre sterling, dollar canadien, franc suisse, dirham marocain, cedi ghanéen, naira nigérian). La conversion utilise les taux du jour et est donnée à titre indicatif.</p>",
    "order": 14
  },
  {
    "category": "Annulations et remboursements",
    "question": "Comment annuler une réservation ?",
    "answer": "<ol><li>Ouvrez <strong>Réservations</strong> puis la réservation concernée.</li><li>Touchez « Annuler la réservation ».</li><li>Indiquez un motif (5 caractères minimum) : la fenêtre affiche le pourcentage et le montant remboursés.</li><li>Confirmez l’annulation.</li></ol><p>L’annulation est possible tant que la date d’arrivée n’est pas passée.</p>",
    "order": 1
  },
  {
    "category": "Annulations et remboursements",
    "question": "Quel est le barème de remboursement ?",
    "answer": "<p>Il dépend du nombre de jours restant avant l’arrivée et porte sur le montant payé en ligne :</p><ul><li><strong>7 jours ou plus</strong> : remboursement de 100 %.</li><li><strong>De 3 à 6 jours</strong> : remboursement de 50 %.</li><li><strong>Moins de 3 jours</strong> : aucun remboursement.</li></ul><p>Ce barème s’applique quand c’est <strong>vous</strong> qui annulez. Si l’annulation vient de l’hôte, le remboursement est intégral. Une réservation payée 100 % sur place n’a aucun paiement en ligne à rembourser.</p>",
    "order": 2
  },
  {
    "category": "Annulations et remboursements",
    "question": "Où est versé mon remboursement ?",
    "answer": "<p>Le remboursement est <strong>crédité sur votre portefeuille Primeo</strong> et déduit automatiquement de vos prochaines réservations.</p>",
    "order": 3
  },
  {
    "category": "Annulations et remboursements",
    "question": "Que se passe-t-il si je n’ai pas payé ma réservation ?",
    "answer": "<p>Rien n’a été débité. Si vous l’annulez (ou si elle expire au bout de 2 heures), le solde portefeuille et le code promo utilisés sont rendus intégralement.</p>",
    "order": 4
  },
  {
    "category": "Annulations et remboursements",
    "question": "L’hôte a annulé ma réservation. Que se passe-t-il ?",
    "answer": "<p>Vous êtes notifié par push et e-mail et la réservation passe au statut « Annulée ». Quand l’annulation vient de l’hôte, vous êtes <strong>remboursé intégralement</strong> du montant payé en ligne, quelle que soit la date (le barème 100 % / 50 % / 0 % ne concerne que les annulations faites par le client), crédité sur votre portefeuille Primeo. Si le remboursement n’arrive pas, ouvrez un litige ou contactez le support.</p>",
    "order": 5
  },
  {
    "category": "Annulations et remboursements",
    "question": "Comment ouvrir un litige ?",
    "answer": "<ol><li>Depuis le détail de la réservation, touchez « Signaler un problème ».</li><li>Choisissez la catégorie : non-conformité, problème de paiement, annulation abusive, accès impossible ou autre.</li><li>Décrivez le problème (20 caractères minimum) et joignez photos ou PDF.</li><li>Soumettez : un administrateur examine le dossier et décide d’un rejet, d’un remboursement partiel ou total. Vous suivez l’avancement dans « Mes litiges ».</li></ol><p>Les deux parties (client et professionnel) peuvent ouvrir un litige ; un seul litige est possible par réservation.</p>",
    "order": 6
  },
  {
    "category": "Comptes professionnels",
    "question": "Comment recevoir l’argent de mes réservations ?",
    "answer": "<p>Chaque jour, les paiements en ligne de vos réservations confirmées sont <strong>reversés automatiquement sur votre portefeuille Primeo</strong>. Ce portefeuille est <strong>virtuel</strong> : il ne détient pas d’argent. Pour recevoir votre dû, ouvrez <strong>Reversements</strong>, renseignez vos <strong>coordonnées de versement</strong> (Orange Money, MTN Money, Wave, Moov Money ou compte bancaire) puis touchez <strong>« Demander un versement »</strong> (minimum 1 000 FCFA ; tout le solde ou un montant au choix).</p><p>Le montant est retiré de votre solde et Primeo vire la somme sur vos coordonnées. La demande passe de « En attente » à « Versé » (avec la référence du virement) ou « Refusé » avec un motif — le montant est alors remis sur votre solde. Vous pouvez annuler une demande en attente. Les paiements en espèces sont encaissés directement par vous : touchez « Marquer paiement cash reçu » pour clôturer la réservation.</p>",
    "order": 1
  },
  {
    "category": "Comptes professionnels",
    "question": "Pourquoi mon annonce n’apparaît-elle pas aux clients ?",
    "answer": "<p>Vérifiez son statut : <strong>Brouillon</strong> (non soumise), <strong>En validation</strong> (examen par la modération), <strong>Rejetée</strong> (à corriger puis soumettre à nouveau) ou <strong>Suspendue</strong> (masquée temporairement). Seules les annonces <strong>Actives</strong> sont visibles. Modifier une annonce active la renvoie en validation.</p>",
    "order": 2
  },
  {
    "category": "Visite 3D, vidéos et médias",
    "question": "Quels médias puis-je ajouter à une annonce ?",
    "answer": "<p><strong>Un seul type de média par annonce</strong> : des photos, ou une vidéo, ou une visite 3D. Changer de type supprime les médias déjà ajoutés (une confirmation est demandée).</p>",
    "order": 1
  },
  {
    "category": "Visite 3D, vidéos et médias",
    "question": "Quelles sont les règles pour les photos ?",
    "answer": "<p>Jusqu’à <strong>20 photos</strong> par annonce, au format JPG, PNG ou WebP, <strong>5 Mo maximum</strong> chacune. La première photo devient l’image principale.</p>",
    "order": 2
  },
  {
    "category": "Visite 3D, vidéos et médias",
    "question": "Comment ajouter une vidéo ?",
    "answer": "<p>Choisissez le type de média « Vidéo » à l’étape Médias de l’annonce : <strong>1 vidéo</strong> de présentation (MP4 ou MOV), <strong>100 Mo maximum</strong>. Cette option n’est pas disponible sur tous les comptes : l’application vous l’indique au moment du choix.</p>",
    "order": 3
  },
  {
    "category": "Visite 3D, vidéos et médias",
    "question": "Comment créer une visite 3D ?",
    "answer": "<p>Choisissez le type de média « Visite 3D » à l’étape Médias : ajoutez jusqu’à <strong>10 photos 360°</strong> (équirectangulaires 2:1, 4000×2000 px minimum, 10 Mo maximum chacune). Chaque photo devient une pièce : nommez-les puis créez des liens entre les pièces dans « Visite 3D & navigation ». Cette option n’est pas disponible sur tous les comptes.</p>",
    "order": 4
  },
  {
    "category": "Visite 3D, vidéos et médias",
    "question": "Quels formats pour les documents KYC ?",
    "answer": "<p>Images ou PDF. Taille maximale : 5 Mo pour une image, 10 Mo pour un PDF.</p>",
    "order": 5
  },
  {
    "category": "Messagerie et notifications",
    "question": "Comment contacter un hôte ?",
    "answer": "<p>La messagerie est rattachée à une réservation (ou à une demande d’intérêt pour l’immobilier). Ouvrez le détail de votre réservation et touchez <strong>Message</strong> ; les échanges se font en temps réel.</p>",
    "order": 1
  },
  {
    "category": "Messagerie et notifications",
    "question": "Quelles notifications vais-je recevoir ?",
    "answer": "<p>Confirmation ou annulation de réservation, paiement réussi ou échoué, nouveaux messages, rappels de séjour, avis reçus et réponses, récompenses de parrainage, et pour les professionnels les nouvelles réservations et demandes d’intérêt. Selon le cas, elles arrivent par notification push, e-mail et dans l’application.</p>",
    "order": 2
  },
  {
    "category": "Messagerie et notifications",
    "question": "Comment gérer mes notifications ?",
    "answer": "<p>Dans <strong>Profil → Préférences de notifications</strong>, activez ou désactivez les alertes de réservations, de messages et d’offres. Vérifiez aussi que les notifications sont autorisées pour Primeo dans les réglages de votre téléphone.</p>",
    "order": 3
  },
  {
    "category": "Messagerie et notifications",
    "question": "Comment répondre plus vite à mes clients (professionnels) ?",
    "answer": "<p>Créez jusqu’à <strong>30 modèles de réponses rapides</strong> (libellé + message) dans la messagerie.</p>",
    "order": 4
  },
  {
    "category": "Avis et évaluations",
    "question": "Qui peut laisser un avis, et quand ?",
    "answer": "<p>Le client d’une réservation <strong>Terminée</strong>, une fois la date de départ passée. Une réservation confirmée passe automatiquement à « Terminée » le lendemain de la date de départ. Un seul avis par réservation.</p>",
    "order": 1
  },
  {
    "category": "Avis et évaluations",
    "question": "Que contient un avis ?",
    "answer": "<p>Une note globale de 1 à 5, des sous-critères facultatifs (propreté, communication, conformité à l’annonce, emplacement, rapport qualité/prix ; pour un restaurant : cuisine, service, ambiance), un commentaire facultatif de 10 à 2 000 caractères et jusqu’à <strong>3 photos</strong>. L’avis est publié immédiatement.</p>",
    "order": 2
  },
  {
    "category": "Avis et évaluations",
    "question": "Puis-je modifier ou supprimer mon avis ?",
    "answer": "<p>Oui, pendant <strong>7 jours</strong> après sa publication, depuis <strong>Profil → Mes avis publiés</strong>.</p>",
    "order": 3
  },
  {
    "category": "Avis et évaluations",
    "question": "Comment répondre à un avis (professionnels) ?",
    "answer": "<p>Dans « Avis reçus & réponses », répondez publiquement (5 à 1 000 caractères). Vous ne pouvez répondre qu’aux avis publiés sur vos annonces.</p>",
    "order": 4
  },
  {
    "category": "Avis et évaluations",
    "question": "Les professionnels peuvent-ils évaluer les clients ?",
    "answer": "<p>Oui : après le séjour, le professionnel peut évaluer le client (respect, communication, ponctualité, respect des règles), une seule fois par séjour. Le client retrouve ces notes dans « Évaluations reçues ».</p>",
    "order": 5
  },
  {
    "category": "Avis et évaluations",
    "question": "Je ne peux pas laisser d’avis. Pourquoi ?",
    "answer": "<p>L’avis n’est possible que lorsque la réservation est au statut <strong>Terminée</strong> et que la date de départ est passée. Une réservation confirmée passe automatiquement à « Terminée » <strong>le lendemain de la date de départ</strong> : si vous venez de quitter le logement, réessayez le lendemain. Une réservation annulée ou non payée ne peut pas être notée.</p>",
    "order": 6
  },
  {
    "category": "Avis et évaluations",
    "question": "Comment signaler un avis inapproprié ?",
    "answer": "<p>Contactez le support en indiquant l’annonce et l’avis concernés : la modération peut masquer un avis qui enfreint les règles.</p>",
    "order": 7
  },
  {
    "category": "Parrainage",
    "question": "Comment fonctionne le parrainage ?",
    "answer": "<ol><li>Dans <strong>Profil → Parrainage</strong>, partagez votre code personnel.</li><li>Votre filleul le saisit une seule fois après son inscription (il ne peut pas utiliser son propre code).</li><li>Vous recevez <strong>250 FCFA</strong> quand un client parrainé effectue sa première réservation confirmée, ou <strong>1 000 FCFA</strong> quand un professionnel parrainé voit son dossier validé.</li></ol><p>Les récompenses sont créditées sur votre portefeuille Primeo, une seule fois par filleul.</p>",
    "order": 1
  },
  {
    "category": "Parrainage",
    "question": "Où saisir un code de parrainage reçu ?",
    "answer": "<p>À l’inscription (champ facultatif) ou ensuite dans <strong>Profil → Parrainage</strong>, rubrique « Vous avez été invité ? ». Le code ne peut être renseigné qu’une fois.</p>",
    "order": 2
  },
  {
    "category": "Problèmes techniques",
    "question": "L’application ne s’ouvre pas ou affiche une erreur.",
    "answer": "<p>Vérifiez votre connexion internet, fermez puis rouvrez l’application et installez la dernière mise à jour. Si l’écran « Maintenance » s’affiche, Primeo est temporairement indisponible : réessayez un peu plus tard.</p>",
    "order": 1
  },
  {
    "category": "Problèmes techniques",
    "question": "Mon paiement n’aboutit pas.",
    "answer": "<p>Vérifiez votre solde et votre connexion, puis relancez le paiement depuis la réservation (dans la limite de 2 heures). Le message « Un numéro de téléphone est requis pour le paiement en ligne » signifie qu’il faut renseigner votre téléphone dans <strong>Profil → Modifier mes informations</strong>. Si le problème persiste, contactez le support.</p>",
    "order": 2
  },
  {
    "category": "Problèmes techniques",
    "question": "Que se passe-t-il si je perds ma connexion ?",
    "answer": "<p>Certaines actions sont mises en attente et <strong>synchronisées automatiquement</strong> au retour de la connexion ; l’application vous le signale.</p>",
    "order": 3
  },
  {
    "category": "Problèmes techniques",
    "question": "La synchronisation de mon calendrier iCal ne fonctionne pas.",
    "answer": "<p>Vérifiez que l’adresse du flux commence par <strong>http://</strong> ou <strong>https://</strong> et est valide, puis touchez « Synchroniser ». La synchronisation importe les dates d’un calendrier externe dans Primeo ; l’export du calendrier Primeo en iCal n’est pas disponible pour le moment.</p>",
    "order": 4
  },
  {
    "category": "Problèmes techniques",
    "question": "Comment contacter le support ?",
    "answer": "<ul><li>L’<strong>Assistant Primeo</strong> de l’application répond instantanément aux questions courantes.</li><li>Créez un <strong>ticket de support</strong> depuis l’application et suivez-le dans « Mes tickets de support ».</li><li>Via la <a href=\"/contact/\">page de contact</a> : lundi–vendredi 9h–18h, samedi 10h–16h, dimanche fermé (heure d’Abidjan).</li></ul>",
    "order": 5
  },
  {
    "category": "Sécurité et confidentialité",
    "question": "Mes paiements sont-ils sécurisés ?",
    "answer": "<p>Les paiements en ligne sont traités sur la page sécurisée de notre prestataire <strong>Genius Pay</strong>. Ne payez jamais en dehors de l’application ou de cette page, et ne communiquez jamais votre code secret de Mobile Money.</p>",
    "order": 1
  },
  {
    "category": "Sécurité et confidentialité",
    "question": "Comment protéger mon compte ?",
    "answer": "<p>Utilisez un mot de passe robuste et unique, activez la <strong>double authentification</strong> (Profil → Authentification 2FA) et ne partagez jamais vos codes de vérification. Primeo ne vous demandera jamais votre mot de passe par message.</p>",
    "order": 2
  },
  {
    "category": "Sécurité et confidentialité",
    "question": "Comment mes données personnelles sont-elles utilisées ?",
    "answer": "<p>Elles servent à gérer votre compte, vos réservations et la sécurité de la plateforme. Le détail figure dans la <strong>Politique de confidentialité</strong> (lien en bas de chaque page du site). Vous pouvez à tout moment <strong>exporter vos données</strong> ou <strong>supprimer votre compte</strong> depuis votre profil.</p>",
    "order": 3
  },
  {
    "category": "Sécurité et confidentialité",
    "question": "À quoi servent les documents demandés aux professionnels ?",
    "answer": "<p>La pièce d’identité et l’extrait RCCM servent à <strong>vérifier l’identité et l’activité</strong> des professionnels (KYC) avant l’accès à l’espace professionnel, afin de protéger les clients.</p>",
    "order": 4
  },
  {
    "category": "Sécurité et confidentialité",
    "question": "Mon adresse est-elle visible de tous ?",
    "answer": "<p>L’adresse exacte d’un logement n’est communiquée au client qu’après la confirmation de la réservation.</p>",
    "order": 5
  },
  {
    "category": "Sécurité et confidentialité",
    "question": "Comment signaler un contenu ou un comportement abusif ?",
    "answer": "<p>Pour une réservation, utilisez « Signaler un problème ». Pour un contenu (annonce, avis, message), contactez le support avec les détails ; consultez aussi la page « Signalement de contenus » du site légal (liens en bas de page).</p>",
    "order": 6
  }
];
