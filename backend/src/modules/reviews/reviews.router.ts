// Reviews routes — client reviews on completed bookings
import { Router } from 'express';
import multer from 'multer';
import {
  createReview,
  updateReview,
  deleteReview,
  getPropertyReviews,
  listMyReviews,
  replyToReview,
  uploadReviewMedia,
  deleteReviewMedia,
} from './reviews.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { requireKycApproved } from '../professional/middlewares/professional.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { parseId } from '../../common/validators/parse-id.middleware';
import { CreateReviewDto, UpdateReviewDto, ReviewReplyDto } from './dto/review.dto';

export const reviewsRouter = Router();

// Public: view property reviews
reviewsRouter.get('/property/:id', parseId, getPropertyReviews);

// Authenticated routes
reviewsRouter.use(authenticate);

// Client: manage own reviews (specific paths before :id)
reviewsRouter.get('/mine', listMyReviews);
reviewsRouter.post('/', validate(CreateReviewDto), createReview);
reviewsRouter.patch('/:id', parseId, validate(UpdateReviewDto), updateReview);
reviewsRouter.delete('/:id', parseId, deleteReview);

// Professional: reply to a review
reviewsRouter.post(
  '/:id/reply',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  requireKycApproved,
  parseId,
  validate(ReviewReplyDto),
  replyToReview,
);

// Client: upload/delete review photos (max 3)
reviewsRouter.post('/:id/media', parseId, upload.single('file'), uploadReviewMedia);
reviewsRouter.delete('/:id/media/:mediaId', parseId, deleteReviewMedia);
