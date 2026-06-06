// E2E tests for property search (Detox)
describe('Property Search', () => {
  it('should display search bar on home screen', async () => {
    await expect(element(by.id('search-bar'))).toBeVisible();
  });

  it('should show results when searching', async () => {
    await element(by.id('search-bar')).tap();
    await element(by.id('search-bar')).typeText('Abidjan');
    await expect(element(by.id('search-results'))).toBeVisible();
  });

  it('should open filter sheet', async () => {
    await element(by.id('filter-btn')).tap();
    await expect(element(by.text('Filtres'))).toBeVisible();
  });
});
