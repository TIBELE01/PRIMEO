// Properties routes — search, CRUD, media, geo autocomplete, admin moderation
// IMPORTANT: specific paths must be registered BEFORE /:id to avoid shadowing
import { Router } from 'express';
import { restaurantRouter } from '../restaurant/restaurant.router';
import multer from 'multer';
import {
  listProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  publishProperty,
  getMyProperties,
  addressAutocomplete,
  signUpload,
  addMedia,
  deleteMedia,
  uploadMediaFile,
  setMediaType,
  list3dScenes,
  upload3dScene,
  delete3dScene,
  suspendProperty,
  getPropertyStats,
  approveProperty,
  rejectProperty,
  expressPropertyInterest,
} from './properties.controller';

// Multer : mémoire tampon (pas de disque), 100 Mo max (vidéos)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
// Multer dédié aux photos 360° : 10 Mo max après compression
const upload360 = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { requireKycApproved } from '../professional/middlewares/professional.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { parseId } from '../../common/validators/parse-id.middleware';
import { PROFESSIONAL_ROLES } from '../../common/constants/roles';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  SearchPropertiesDto,
  AddMediaDto,
  RejectPropertyDto,
} from './dto/property.dto';

export const propertiesRouter = Router();

// ── Public routes ────────────────────────────────────────────────────────────

// Address autocomplete via Geoapify (API key stays on the server)
propertiesRouter.get('/autocomplete', addressAutocomplete);
// List / search
propertiesRouter.get('/', validate(SearchPropertiesDto, 'query'), listProperties);

// ── Authenticated routes ─────────────────────────────────────────────────────

// My listings (must be BEFORE /:id to avoid being caught by it)
propertiesRouter.get('/my/listings', authenticate, getMyProperties);

// Cloudinary signed upload (any authenticated user owning a property)
propertiesRouter.get('/media/sign', authenticate, signUpload);

// Create listing (professionals only)
propertiesRouter.post(
  '/',
  authenticate,
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  requireKycApproved,
  validate(CreatePropertyDto),
  createProperty
);

// ── Admin moderation routes (before /:id to avoid shadowing) ─────────────────

propertiesRouter.post(
  '/:id/approve',
  authenticate,
  authorize('admin'),
  parseId,
  approveProperty
);
propertiesRouter.post(
  '/:id/reject',
  authenticate,
  authorize('admin'),
  parseId,
  validate(RejectPropertyDto),
  rejectProperty
);

// ── Property detail and mutations ────────────────────────────────────────────

// Public detail
propertiesRouter.get('/:id', parseId, getProperty);

// Statistiques d'une annonce (propriétaire uniquement)
propertiesRouter.get('/:id/stats', authenticate, authorize(...PROFESSIONAL_ROLES), requireKycApproved, parseId, getPropertyStats);

// Immobilier : exprimer son intérêt pour un bien (client authentifié)
propertiesRouter.post('/:id/interest', authenticate, parseId, expressPropertyInterest);

// Propriétaire : suspendre une annonce active (professionnels uniquement)
propertiesRouter.post(
  '/:id/suspend',
  authenticate,
  authorize(...PROFESSIONAL_ROLES),
  requireKycApproved,
  parseId,
  suspendProperty
);

// Media management (owner only — professionnels)
// Upload fichier → Supabase Storage (prioritaire sur l'upload direct Cloudinary)
propertiesRouter.post('/:id/media/upload', authenticate, authorize(...PROFESSIONAL_ROLES), requireKycApproved, parseId, upload.single('file'), uploadMediaFile);
// Type de média exclusif du bien — photos | video | threed (purge les autres types)
propertiesRouter.put('/:id/media-type', authenticate, authorize(...PROFESSIONAL_ROLES), requireKycApproved, parseId, setMediaType);
propertiesRouter.post('/:id/media', authenticate, authorize(...PROFESSIONAL_ROLES), requireKycApproved, parseId, validate(AddMediaDto), addMedia);
propertiesRouter.delete('/:id/media/:mediaId', authenticate, authorize(...PROFESSIONAL_ROLES), requireKycApproved, parseId, deleteMedia);

// Visite 3D — scènes panoramiques 360° (lecture publique, écriture Entreprise)
propertiesRouter.get('/:id/3d-scenes', parseId, list3dScenes);
propertiesRouter.post('/:id/3d-scenes', authenticate, authorize(...PROFESSIONAL_ROLES), requireKycApproved, parseId, upload360.single('file'), upload3dScene);
propertiesRouter.delete('/:id/3d-scenes/:sceneId', authenticate, authorize(...PROFESSIONAL_ROLES), requireKycApproved, parseId, delete3dScene);

// Owner submits draft for review
propertiesRouter.post(
  '/:id/publish',
  authenticate,
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  requireKycApproved,
  parseId,
  publishProperty
);

// Update (owner or admin)
propertiesRouter.patch(
  '/:id',
  authenticate,
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur', 'admin'),
  requireKycApproved,
  parseId,
  validate(UpdatePropertyDto),
  updateProperty
);

// Logical delete (owner or admin)
propertiesRouter.delete(
  '/:id',
  authenticate,
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur', 'admin'),
  requireKycApproved,
  parseId,
  deleteProperty
);

// ── Restaurant sub-routes (:id maps to :propertyId via mergeParams) ──────────
propertiesRouter.use('/:propertyId', restaurantRouter);
