// Tests unitaires — utilitaires du stockage privé (CV de candidats).
jest.mock('../../config/env.config', () => ({ env: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' } }));
jest.mock('./logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import {
  isAllowedDocument, contentTypeFor, extensionOf, parseStorageRef, safeFilename, STORAGE_PREFIX,
} from './private-storage';

describe('private-storage', () => {
  it('accepte PDF et documents Word, refuse le reste', () => {
    ['cv.pdf', 'CV Final.DOCX', 'cv.doc', 'cv.rtf', 'cv.odt'].forEach((f) => expect(isAllowedDocument(f)).toBe(true));
    ['virus.exe', 'photo.png', 'script.js', 'cv'].forEach((f) => expect(isAllowedDocument(f)).toBe(false));
  });

  it('déduit le type MIME et l\'extension', () => {
    expect(contentTypeFor('a.pdf')).toBe('application/pdf');
    expect(contentTypeFor('a.docx')).toContain('wordprocessingml');
    expect(contentTypeFor('a.bin')).toBe('application/octet-stream');
    expect(extensionOf('Mon CV.Final.PDF')).toBe('pdf');
  });

  it('analyse la référence de stockage', () => {
    expect(parseStorageRef(`${STORAGE_PREFIX}careers-cv/2026/ab-cv.pdf`)).toEqual({ bucket: 'careers-cv', path: '2026/ab-cv.pdf' });
    expect(parseStorageRef('https://res.cloudinary.com/x/image/upload/a.pdf')).toBeNull();
    expect(parseStorageRef(null)).toBeNull();
  });

  it('assainit les noms de fichiers', () => {
    expect(safeFilename('Mon CV (é).pdf')).toBe('Mon_CV____.pdf');
  });
});
