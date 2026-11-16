import { Request, Response, NextFunction } from 'express';
import { withdrawalsService, PayoutAccountDto, WithdrawalRequestDto } from './withdrawals.service';
import { HttpError } from '../../common/handlers/http-error.handler';

type H = (req: Request, res: Response) => Promise<unknown>;
const wrap = (fn: H) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { await fn(req, res); } catch (e) { next(e); }
};
const idParam = (req: Request): string => {
  const id = req.params['id'];
  if (!id) throw new HttpError(400, 'Identifiant manquant');
  return id;
};

export const getPayoutAccount = wrap(async (req, res) => {
  res.json({ data: (await withdrawalsService.getAccount(req.user!.sub)) ?? null });
});
export const savePayoutAccount = wrap(async (req, res) => {
  const parsed = PayoutAccountDto.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Coordonnées invalides');
  res.json({ data: await withdrawalsService.saveAccount(req.user!.sub, parsed.data) });
});
export const listMyWithdrawals = wrap(async (req, res) => {
  res.json({ data: await withdrawalsService.listMine(req.user!.sub) });
});
export const requestWithdrawal = wrap(async (req, res) => {
  const parsed = WithdrawalRequestDto.safeParse(req.body ?? {});
  if (!parsed.success) throw new HttpError(400, 'Montant invalide');
  res.status(201).json({ data: await withdrawalsService.request(req.user!.sub, parsed.data.amount) });
});
export const cancelWithdrawal = wrap(async (req, res) => {
  res.json({ data: await withdrawalsService.cancel(req.user!.sub, idParam(req)) });
});

// Administration
export const adminListWithdrawals = wrap(async (req, res) => {
  const status = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
  res.json({ data: await withdrawalsService.listAll(status) });
});
export const adminMarkWithdrawalPaid = wrap(async (req, res) => {
  const reference = typeof req.body?.reference === 'string' ? req.body.reference : undefined;
  res.json({ data: await withdrawalsService.markPaid(req.user!.sub, idParam(req), reference) });
});
export const adminRejectWithdrawal = wrap(async (req, res) => {
  res.json({ data: await withdrawalsService.reject(req.user!.sub, idParam(req), String(req.body?.reason ?? '')) });
});
