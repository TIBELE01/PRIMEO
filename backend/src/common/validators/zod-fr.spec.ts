import { z } from 'zod';
import { readableZodMessage } from './zod-fr';

const msg = (schema: z.ZodTypeAny, v: unknown) => {
  const r = schema.safeParse(v);
  return r.success ? null : readableZodMessage(r.error);
};

describe('messages de validation en français', () => {
  it('traduit les messages par défaut et nomme le champ', () => {
    expect(msg(z.object({ email: z.string().email() }), { email: 'x' })).toBe('Email : Adresse email invalide');
    expect(msg(z.object({ newPassword: z.string().min(8) }), { newPassword: 'abc' })).toBe('Nouveau mot de passe : 8 caractères minimum');
    expect(msg(z.object({ name: z.string() }), {})).toBe('Nom : Champ obligatoire');
    expect(msg(z.object({ guests: z.number().max(10) }), { guests: 12 })).toBe('Nombre de personnes : Doit être inférieur ou égal à 10');
  });
  it('conserve les messages personnalisés des DTO', () => {
    expect(msg(z.object({ phone: z.string().regex(/^\d+$/, 'Numéro de téléphone invalide') }), { phone: 'a' })).toBe('Téléphone : Numéro de téléphone invalide');
  });
  it('champ sans libellé connu : message seul', () => {
    expect(msg(z.object({ foo: z.string().min(3) }), { foo: 'a' })).toBe('3 caractères minimum');
  });
});
