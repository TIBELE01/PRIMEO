// Upload direct Cloudinary : sur le web, expo-image-picker renvoie une URI data: (ou un File).
jest.mock('../src/services/api/endpoints/properties', () => ({
  propertiesApi: { signMediaUpload: jest.fn(async () => ({ data: { data: { signature: 's', timestamp: 1, apiKey: 'k', cloudName: 'c', folder: 'f' } } })) },
}));
import { uploadToCloudinary } from '../src/services/cloudinary';

describe('uploadToCloudinary', () => {
  let sent: FormData | null = null;
  beforeEach(() => {
    sent = null;
    (global as any).fetch = jest.fn(async (_url: string, init: { body: FormData }) => {
      sent = init.body;
      return { ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/c/image/upload/v1/f/x.jpg', public_id: 'f/x' }) };
    });
  });

  it("URI data: (web) : envoyée telle quelle comme fichier (plus d'objet invalide)", async () => {
    const uri = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const r = await uploadToCloudinary(uri, 'plat.jpg');
    expect(sent!.get('file')).toBe(uri);
    expect(r.url).toContain('res.cloudinary.com');
  });

  it("objet File (web) : prioritaire sur l'URI", async () => {
    const file = new File(['abc'], 'table.jpg', { type: 'image/jpeg' });
    await uploadToCloudinary('blob:x', 'table.jpg', 'properties', file);
    expect(sent!.get('file')).toBeInstanceOf(File);
  });
});
