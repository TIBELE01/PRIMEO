// Disputes routes — open and track booking disputes
import { Router } from 'express';
import {
  createDispute,
  getDispute,
  listMyDisputes,
  getDisputeMessages,
  sendDisputeMessage,
} from './disputes.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { parseId } from '../../common/validators/parse-id.middleware';
import { CreateDisputeDto } from './dto/dispute.dto';

export const disputesRouter = Router();

disputesRouter.use(authenticate);

disputesRouter.get('/me', listMyDisputes);
disputesRouter.get('/:id', parseId, getDispute);
disputesRouter.post('/', validate(CreateDisputeDto), createDispute);

// Dispute messaging (REST fallback + history)
disputesRouter.get('/:id/messages', parseId, getDisputeMessages);
disputesRouter.post('/:id/messages', parseId, sendDisputeMessage);
