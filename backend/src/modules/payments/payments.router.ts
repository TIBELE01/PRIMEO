// Payments routes — Genius Pay integration
import { Router } from 'express';
import { initiatePayment, getPaymentStatus, listMyTransactions } from './payments.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { InitiatePaymentDto } from './dto/payment.dto';

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

paymentsRouter.post('/initiate', validate(InitiatePaymentDto), initiatePayment);
paymentsRouter.get('/status/:transactionId', getPaymentStatus);
paymentsRouter.get('/transactions', listMyTransactions);
