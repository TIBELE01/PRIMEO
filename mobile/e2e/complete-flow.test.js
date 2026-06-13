// Scénario E2E complet (Detox) — parcours client de bout en bout :
//   lancement → inscription client → recherche d'un bien → ouverture de la fiche
//   → réservation option « 10 % en ligne » → écran de confirmation.
//
// Sélecteurs : on privilégie les testID (stables) avec repli sur le texte FR
// visible. Les testID attendus par ce scénario sont listés dans
// docs/E2E-DETOX.md (section « testID requis ») — à ajouter aux écrans si absents.
//
// helper : tape le premier élément disponible parmi plusieurs matchers (rend le
// test résilient aux variations d'UI / libellés).
async function tapFirst(matchers) {
  for (const m of matchers) {
    try {
      await waitFor(element(m)).toBeVisible().withTimeout(4000);
      await element(m).tap();
      return true;
    } catch (_e) { /* essaie le matcher suivant */ }
  }
  throw new Error('Aucun élément tappable trouvé parmi les matchers fournis');
}

const uniqueEmail = `e2e+${Date.now()}@primeo.ci`;

describe('Parcours client complet', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES', location: 'inuse' } });
  });

  it('1. lance l\'application sur l\'écran public', async () => {
    await expect(element(by.text('PRIMEO'))).toBeVisible();
  });

  it('2. inscrit un nouveau client', async () => {
    // Accès à l'onglet/bouton Connexion puis bascule vers l'inscription
    await tapFirst([by.id('tab-Connexion'), by.text('Connexion'), by.text('Se connecter')]);
    await tapFirst([by.id('go-register'), by.text('Créer un compte'), by.text("S'inscrire")]);

    await element(by.id('register-firstName')).typeText('Koffi');
    await element(by.id('register-lastName')).typeText('E2E');
    await element(by.id('register-email')).typeText(uniqueEmail);
    await element(by.id('register-phone')).typeText('0700000010');
    await element(by.id('register-password')).typeText('Client1234!');
    await tapFirst([by.id('register-submit'), by.text("S'inscrire"), by.text('Créer mon compte')]);

    // Client : pas d'OTP requis → arrivée sur l'app authentifiée (onglet Accueil)
    await waitFor(element(by.id('tab-Accueil'))).toBeVisible().withTimeout(15000);
  });

  it('3. recherche un bien', async () => {
    await tapFirst([by.id('tab-Rechercher'), by.text('Rechercher')]);
    await element(by.id('search-bar')).tap();
    await element(by.id('search-bar')).typeText('Abidjan\n');
    await waitFor(element(by.id('search-results'))).toBeVisible().withTimeout(10000);
  });

  it('4. ouvre la fiche détail du premier résultat', async () => {
    await tapFirst([by.id('property-card-0'), by.id('search-result-0')]);
    await waitFor(element(by.id('property-detail-screen'))).toBeVisible().withTimeout(8000);
  });

  it('5. réserve avec l\'option « 10 % en ligne »', async () => {
    await tapFirst([by.id('cta-reserve'), by.text('Réserver')]);
    // Sélection de l'option de paiement 10 %
    await tapFirst([by.id('payment-option-ten_percent_online'), by.text('10% en ligne'), by.text('Payer 10%')]);
    await tapFirst([by.id('booking-confirm'), by.text('Confirmer'), by.text('Payer maintenant')]);
  });

  it('6. affiche la confirmation de réservation', async () => {
    await waitFor(element(by.id('booking-confirmation-screen')))
      .toBeVisible()
      .withTimeout(20000);
    await expect(element(by.text('Réservation confirmée'))).toBeVisible();
  });
});
