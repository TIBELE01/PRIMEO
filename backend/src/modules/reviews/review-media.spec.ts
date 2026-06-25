jest.mock('../../common/handlers/http-error.handler', () => ({
  HttpError: class HttpError extends Error { statusCode: number; constructor(s: number, m: string) { super(m); this.statusCode = s; } },
}));

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../notifications/notifications.service', () => ({
  notificationsService: { notify: jest.fn(async () => undefined) },
}));

const mockUpload = jest.fn(async () => ({ url: 'https://res.cloudinary.com/test/image/upload/v1/primeo/reviews/test.jpg', optimizedUrl: 'https://res.cloudinary.com/test/image/upload/f_auto,q_auto,w_1600/primeo/reviews/test.jpg', publicId: 'primeo/reviews/test', format: 'jpg', bytes: 100 }));
const mockDelete = jest.fn(async () => undefined);
jest.mock('../../modules/media/media.service', () => ({ mediaService: { upload: mockUpload, delete: mockDelete } }));

const mockPrisma: Record<string, any> = {
  review: { findUnique: jest.fn() },
  reviewMedia: { count: jest.fn(async () => 0), create: jest.fn(async (a: any) => ({ id: 'm1', ...a.data })), findUnique: jest.fn(), delete: jest.fn(async () => ({})) },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { reviewsService } from './reviews.service';

const fakeFile = { buffer: Buffer.from('img'), originalname: 'test.jpg', mimetype: 'image/jpeg', size: 100 } as any;

beforeEach(() => jest.clearAllMocks());

describe('uploadMedia', () => {
  it('uploads a photo and creates ReviewMedia with publicId', async () => {
    mockPrisma.review.findUnique.mockResolvedValue({ id: 'r1', authorId: 'u1' });
    mockPrisma.reviewMedia.count.mockResolvedValue(0);
    const res = await reviewsService.uploadMedia('r1', 'u1', fakeFile);
    expect(mockUpload).toHaveBeenCalledWith(fakeFile, 'primeo/Users/Clients/u1/reviews');
    expect(mockPrisma.reviewMedia.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ publicId: 'primeo/reviews/test' }) }),
    );
    expect(res).toMatchObject({ id: 'm1' });
  });
  it('refuses more than 3 photos (400)', async () => {
    mockPrisma.review.findUnique.mockResolvedValue({ id: 'r1', authorId: 'u1' });
    mockPrisma.reviewMedia.count.mockResolvedValue(3);
    await expect(reviewsService.uploadMedia('r1', 'u1', fakeFile)).rejects.toMatchObject({ statusCode: 400 });
  });
  it('refuses if not the author (403)', async () => {
    mockPrisma.review.findUnique.mockResolvedValue({ id: 'r1', authorId: 'other' });
    await expect(reviewsService.uploadMedia('r1', 'u1', fakeFile)).rejects.toMatchObject({ statusCode: 403 });
  });
  it('404 if review not found', async () => {
    mockPrisma.review.findUnique.mockResolvedValue(null);
    await expect(reviewsService.uploadMedia('r1', 'u1', fakeFile)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('deleteMedia', () => {
  it('deletes the Cloudinary asset then the DB record', async () => {
    mockPrisma.reviewMedia.findUnique.mockResolvedValue({ id: 'm1', publicId: 'primeo/reviews/test', review: { authorId: 'u1' } });
    const res = await reviewsService.deleteMedia('m1', 'u1');
    expect(mockDelete).toHaveBeenCalledWith('primeo/reviews/test');
    expect(mockPrisma.reviewMedia.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    expect(res).toEqual({ removed: true });
  });
  it('skips Cloudinary deletion when publicId is null', async () => {
    mockPrisma.reviewMedia.findUnique.mockResolvedValue({ id: 'm1', publicId: null, review: { authorId: 'u1' } });
    const res = await reviewsService.deleteMedia('m1', 'u1');
    expect(mockDelete).not.toHaveBeenCalled();
    expect(res).toEqual({ removed: true });
  });
  it('404 if not found', async () => {
    mockPrisma.reviewMedia.findUnique.mockResolvedValue(null);
    await expect(reviewsService.deleteMedia('m1', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });
  it('403 if not author', async () => {
    mockPrisma.reviewMedia.findUnique.mockResolvedValue({ id: 'm1', publicId: null, review: { authorId: 'other' } });
    await expect(reviewsService.deleteMedia('m1', 'u1')).rejects.toMatchObject({ statusCode: 403 });
  });
});
