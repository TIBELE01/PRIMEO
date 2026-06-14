// Exports routes — export de données professionnel (CSV/PDF asynchrone)
import { Router } from 'express';
import { createExport, listExports, getExport, downloadExport } from './exports.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { requireKycApproved } from '../professional/middlewares/professional.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { CreateExportDto } from './dto/create-export.dto';

export const exportsRouter = Router();

exportsRouter.use(authenticate);
exportsRouter.use(requireKycApproved);

exportsRouter.post('/', validate(CreateExportDto), createExport);
exportsRouter.get('/', listExports);
exportsRouter.get('/:id', getExport);
exportsRouter.get('/:id/download', downloadExport);
