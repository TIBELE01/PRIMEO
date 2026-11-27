jest.mock('../../config/cloudinary.config', () => ({ cloudinaryConfig: { cloudName: 'demo', apiKey: '123', apiSecret: 'sec' } }));
import { kycDocumentViewUrl } from './s3-client';

describe('kycDocumentViewUrl — documents KYC privés', () => {
  it('document « authenticated » → lien de téléchargement signé (jamais l\'URL brute)', () => {
    const u = kycDocumentViewUrl('https://res.cloudinary.com/demo/image/authenticated/v1795/primeo/Users/kyc/cni/abc.jpg')!;
    expect(u).toContain('https://api.cloudinary.com/v1_1/demo/image/download?');
    expect(u).toContain('type=authenticated');
    expect(u).toContain('public_id=primeo%2FUsers%2Fkyc%2Fcni%2Fabc');
    expect(u).toContain('format=jpg');
    expect(u).toContain('signature=');
  });
  it('ancien document public → inchangé', () => {
    const p = 'https://res.cloudinary.com/demo/image/upload/v1/a.jpg';
    expect(kycDocumentViewUrl(p)).toBe(p);
  });
});
