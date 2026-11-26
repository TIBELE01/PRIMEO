jest.mock('./env.config', () => ({ env: {} }));
import { EMAILS, contactRecipientFor, mailboxLabel } from './emails.config';

describe('adresses email professionnelles', () => {
  it('valeurs par défaut : vraies adresses primeo.ci, aucune adresse de substitution', () => {
    expect(EMAILS.from).toBe('noreply@primeo.ci');
    expect(EMAILS.replyTo).toBe('contact@primeo.ci');
    expect(EMAILS.supportFrom).toBe('support@primeo.ci');
    expect(EMAILS.admin).toBe('admin@primeo.ci');
    expect(EMAILS.careers).toBe('recrutement@primeo.ci');
    expect(EMAILS.partnership).toBe('partenariat@primeo.ci');
    expect(EMAILS.legal).toBe('legal@primeo.ci');
    for (const v of Object.values(EMAILS)) {
      if (v.includes('@')) expect(v).toMatch(/@primeo\.ci$/);
    }
  });

  it('formulaire de contact : chaque sujet va vers la bonne boîte', () => {
    expect(contactRecipientFor('Question générale')).toBe('contact@primeo.ci');
    expect(contactRecipientFor('Support technique')).toBe('support@primeo.ci');
    expect(contactRecipientFor('Litige')).toBe('reclamation@primeo.ci');
    expect(contactRecipientFor('Partenariat')).toBe('partenariat@primeo.ci');
    expect(contactRecipientFor('Devenir professionnel')).toBe('professionnel@primeo.ci');
    expect(contactRecipientFor(undefined)).toBe('contact@primeo.ci');
  });

  it('formulaire du site légal : sujets juridiques, données et paiements', () => {
    expect(contactRecipientFor('Question juridique — CGU')).toBe('legal@primeo.ci');
    expect(contactRecipientFor('Protection des données personnelles')).toBe('dpo@primeo.ci');
    expect(contactRecipientFor('Suppression de compte et des données')).toBe('dpo@primeo.ci');
    expect(contactRecipientFor('Litige de paiement')).toBe('reclamation@primeo.ci');
    expect(contactRecipientFor('Partenariat professionnel')).toBe('partenariat@primeo.ci');
    expect(contactRecipientFor('Signalement de contenu')).toBe('contact@primeo.ci');
  });

  it('libellés des boîtes internes', () => {
    expect(mailboxLabel('recrutement@primeo.ci')).toBe('Primeo Recrutement');
    expect(mailboxLabel('dpo@primeo.ci')).toBe('Primeo Protection des données');
    expect(mailboxLabel('inconnue@primeo.ci')).toBe('Primeo');
  });
});
