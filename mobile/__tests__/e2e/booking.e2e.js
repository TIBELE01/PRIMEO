// E2E tests for booking flow (Detox)
describe('Booking flow', () => {
  it('should open property detail screen', async () => {
    await element(by.id('property-card-0')).tap();
    await expect(element(by.id('property-detail-screen'))).toBeVisible();
  });

  it('should show payment options on booking screen', async () => {
    await element(by.text('Réserver')).tap();
    await expect(element(by.text('Options de paiement'))).toBeVisible();
  });

  it('should display booking confirmation after payment', async () => {
    await element(by.text('Paiement intégral')).tap();
    await element(by.text('Confirmer')).tap();
    await expect(element(by.text('Réservation confirmée'))).toBeVisible();
  });
});
