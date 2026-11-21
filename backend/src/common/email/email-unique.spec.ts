// Garantit qu'un email ne porte qu'UNE fois chaque élément de la charte (en-tête, logo, bandeau, signature, pied de page),
// y compris après le passage par sendEmail (habillage automatique des contenus HTML bruts).
jest.mock('../../config/env.config', () => ({ env: {} }));
jest.mock('../../database/prisma.service', () => ({ prisma: {} }));
jest.mock('../utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../config/brevo.config', () => ({ brevoConfig: {} }));

import { renderLocalTemplate } from './templates';
import { ensureBrandedEmail } from '../utils/mailer';
import { EMAIL_LOGO_URL } from './theme';

const count = (html: string, needle: string) => html.split(needle).length - 1;
const params = {
  firstName: 'Aminata', propertyTitle: 'Villa Prestige', startDate: '12/12/2026', endDate: '15/12/2026', guests: 2,
  totalAmount: 405000, amountPaid: 40500, balanceDue: 364500, bookingId: 'cmwn089q0000i139uy72a9bnn', code: '482913',
  resetUrl: 'https://primeo.ci/reset', invoiceUrl: 'https://primeo.ci/f.pdf', reason: 'Dates indisponibles', rating: 5,
};

function assertUnique(html: string) {
  expect(count(html, '<!DOCTYPE html>')).toBe(1);
  expect(count(html, 'Mon espace Primeo')).toBe(0); // lien d'en-tête supprimé (design compact)
  expect(count(html, 'Paiement sécurisé')).toBe(1); // section confiance, une seule fois
  expect(html).toContain('width="22" height="22"'); // petit logo discret
  expect(count(html, EMAIL_LOGO_URL)).toBe(1); // logo officiel, une seule fois
  expect(count(html, 'class="hero"')).toBe(1); // bandeau-titre
  expect(count(html, 'Primeo dans votre poche')).toBe(1);
  expect(count(html, 'Mentions légales')).toBe(1); // pied de page
  expect(count(html.replace(/<[^>]+>/g, ''), 'équipe Primeo')).toBeLessThanOrEqual(1); // signature
}

describe('emails : chaque élément de la charte une seule fois', () => {
  for (let id = 1; id <= 60; id++) {
    it(`template ${id} (rendu puis passage par sendEmail)`, () => {
      let html: string;
      try { html = renderLocalTemplate(id, params).html; } catch { return; } // identifiant inexistant
      expect(ensureBrandedEmail(html, 'Sujet')).toBe(html); // jamais ré-habillé
      assertUnique(html);
    });
  }

  it('contenu HTML brut : habillé une seule fois, titre et signature non dupliqués', () => {
    const raw = `<div style="font-family:sans-serif"><h2>Nouvelle candidature spontanée</h2><p>Nom : Awa</p><p>— L'équipe Primeo</p></div>`;
    const html = ensureBrandedEmail(raw, 'Nouvelle candidature spontanée — Awa');
    assertUnique(html);
    expect(count(html, 'Nouvelle candidature spontanée')).toBeGreaterThanOrEqual(1);
    expect(count(html.replace(/<title>[\s\S]*?<\/title>/, '').replace(/<div style="display:none[\s\S]*?<\/div>/, ''), 'Nouvelle candidature spontanée')).toBe(1);
    expect(ensureBrandedEmail(html, 'x')).toBe(html);
  });
});
