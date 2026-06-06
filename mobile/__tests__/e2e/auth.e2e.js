// E2E tests for authentication flows (Detox)
describe('Auth flows', () => {
  beforeAll(async () => { await device.launchApp(); });

  it('should show welcome screen on first launch', async () => {
    await expect(element(by.text('PRIMEO'))).toBeVisible();
  });

  it('should navigate to login screen', async () => {
    await element(by.text('Se connecter')).tap();
    await expect(element(by.id('email-input'))).toBeVisible();
  });

  it('should show error on invalid credentials', async () => {
    await element(by.id('email-input')).typeText('invalid@test.com');
    await element(by.id('password-input')).typeText('wrongpassword');
    await element(by.text('Se connecter')).tap();
    await expect(element(by.text('Email ou mot de passe incorrect'))).toBeVisible();
  });
});
