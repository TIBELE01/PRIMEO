/**
 * Génère assets/docs/primeo-dossier-partenariat.pdf à partir de dossier.html (A4, 4 pages).
 * Usage : node scripts/dossier-partenariat/render.js   (nécessite Playwright + Chromium)
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const src = path.join(__dirname, 'dossier.html');
  const out = path.join(__dirname, '..', '..', 'assets', 'docs', 'primeo-dossier-partenariat.pdf');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + src, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log('PDF généré :', out);
})();
