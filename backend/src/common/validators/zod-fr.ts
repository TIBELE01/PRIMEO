// Messages de validation Zod en français + message d'erreur lisible par l'utilisateur.
// Les messages personnalisés des DTO (déjà en français) sont conservés tels quels.
import { z, ZodIssueCode, type ZodError, type ZodErrorMap } from 'zod';

const plural = (n: number | bigint, word: string) => `${n} ${word}${Number(n) > 1 ? 's' : ''}`;

export const frenchErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') return { message: 'Champ obligatoire' };
      return { message: 'Valeur invalide' };
    case ZodIssueCode.too_small:
      if (issue.type === 'string') return { message: issue.minimum === 1 ? 'Champ obligatoire' : `${plural(issue.minimum, 'caractère')} minimum` };
      if (issue.type === 'array') return { message: `${plural(issue.minimum, 'élément')} minimum` };
      if (issue.type === 'number' || issue.type === 'bigint') return { message: `Doit être supérieur ou égal à ${issue.minimum}` };
      return { message: 'Valeur trop petite' };
    case ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `${plural(issue.maximum, 'caractère')} maximum` };
      if (issue.type === 'array') return { message: `${plural(issue.maximum, 'élément')} maximum` };
      if (issue.type === 'number' || issue.type === 'bigint') return { message: `Doit être inférieur ou égal à ${issue.maximum}` };
      return { message: 'Valeur trop grande' };
    case ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'Adresse email invalide' };
      if (issue.validation === 'url') return { message: 'Adresse web invalide' };
      if (issue.validation === 'date' || issue.validation === 'datetime') return { message: 'Date invalide' };
      if (issue.validation === 'uuid' || issue.validation === 'cuid') return { message: 'Identifiant invalide' };
      return { message: 'Format invalide' };
    case ZodIssueCode.invalid_enum_value:
    case ZodIssueCode.invalid_literal:
    case ZodIssueCode.invalid_union:
    case ZodIssueCode.invalid_union_discriminator:
      return { message: 'Valeur non autorisée' };
    case ZodIssueCode.invalid_date:
      return { message: 'Date invalide' };
    case ZodIssueCode.unrecognized_keys:
      return { message: 'Champ non autorisé' };
    case ZodIssueCode.not_multiple_of:
      return { message: 'Valeur invalide' };
    default:
      return { message: ctx.defaultError };
  }
};

z.setErrorMap(frenchErrorMap);

const FIELD_LABELS: Record<string, string> = {
  email: 'Email', password: 'Mot de passe', newPassword: 'Nouveau mot de passe', currentPassword: 'Mot de passe actuel',
  phone: 'Téléphone', firstName: 'Prénom', lastName: 'Nom', name: 'Nom', contactName: 'Nom du contact', companyName: 'Entreprise',
  subject: 'Objet', message: 'Message', content: 'Contenu', comment: 'Commentaire', rating: 'Note', title: 'Titre',
  description: 'Description', startDate: 'Date d’arrivée', endDate: 'Date de départ', guests: 'Nombre de personnes',
  amount: 'Montant', reason: 'Motif', code: 'Code', otp: 'Code', address: 'Adresse', city: 'Ville', price: 'Prix',
  birthDate: 'Date de naissance', pseudo: 'Pseudo', partnershipType: 'Type de partenariat',
};

/** Message unique lisible : « Mot de passe : 8 caractères minimum ». */
export function readableZodMessage(err: ZodError): string {
  const issue = err.issues[0];
  if (!issue) return 'Données invalides';
  const field = issue.path.find((p): p is string => typeof p === 'string');
  const label = field ? FIELD_LABELS[field] : undefined;
  return label ? `${label} : ${issue.message}` : issue.message || 'Données invalides';
}
