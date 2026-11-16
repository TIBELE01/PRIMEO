// Routes admin « Communication » — WhatsApp / Telegram via Norasend.
// Montées sur /api/admin/communications (derrière authenticate + authorize('admin')) ;
// réservées au Super Admin : ces envois touchent de vrais clients.
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { communicationsService, MAX_RECIPIENTS_PER_CAMPAIGN } from './communications.service';

export const communicationsRouter = Router();

async function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { accountType: true, adminRole: true },
    });
    if (!me || me.accountType !== 'admin') throw new HttpError(403, 'Accès réservé aux administrateurs');
    if ((me.adminRole ?? 'super_admin') !== 'super_admin') throw new HttpError(403, 'Action réservée au Super Admin');
    next();
  } catch (err) {
    next(err);
  }
}
communicationsRouter.use(requireSuperAdmin);

const Channel = z.enum(['whatsapp', 'telegram']);

const Recipient = z.object({
  to: z.string().trim().min(1).max(64),
  variables: z.record(z.string().max(200)).optional(),
});

const CampaignBody = z
  .object({
    channel: Channel,
    recipients: z.array(Recipient).min(1).max(MAX_RECIPIENTS_PER_CAMPAIGN),
    text: z.string().max(4000),
    title: z.string().trim().max(120).optional(),
    mediaUrl: z.string().max(2000).optional(),
    parseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional(),
    variables: z.record(z.string().max(200)).optional(),
    delayMs: z.number().int().min(0).max(60_000).optional(),
    consentConfirmed: z.boolean(),
  })
  .strict();

const handle =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };

const parse = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) throw new HttpError(400, 'Données invalides', result.error.flatten());
  return result.data;
};

// État des canaux (sans secret)
communicationsRouter.get('/status', handle(async (_req, res) => {
  res.json(communicationsService.getStatus());
}));

// Envoi direct : un message par destinataire
communicationsRouter.post('/send', handle(async (req, res) => {
  const body = parse(CampaignBody, req.body);
  const campaign = await communicationsService.createCampaign({ ...body, mode: 'direct' }, req.user!.sub);
  res.status(campaign.status === 'processing' ? 202 : 201).json(campaign);
}));

// Diffusion (broadcast) avec variables {{prenom}}
communicationsRouter.post('/broadcast', handle(async (req, res) => {
  const body = parse(CampaignBody, req.body);
  const campaign = await communicationsService.createCampaign({ ...body, mode: 'broadcast' }, req.user!.sub);
  res.status(campaign.status === 'processing' ? 202 : 201).json(campaign);
}));

// Historique
communicationsRouter.get('/campaigns', handle(async (req, res) => {
  const q = parse(
    z.object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      channel: Channel.optional(),
      status: z.enum(['processing', 'completed', 'partial', 'failed']).optional(),
    }),
    req.query,
  );
  res.json(await communicationsService.listCampaigns(q));
}));

communicationsRouter.get('/campaigns/:id', handle(async (req, res) => {
  res.json(await communicationsService.getCampaign(req.params.id));
}));

// Désinscriptions
communicationsRouter.get('/opt-outs', handle(async (req, res) => {
  const channel = req.query.channel ? parse(Channel, req.query.channel) : undefined;
  res.json(await communicationsService.listOptOuts(channel));
}));

communicationsRouter.post('/opt-outs', handle(async (req, res) => {
  const body = parse(z.object({ channel: Channel, recipient: z.string().trim().min(1).max(64), reason: z.string().max(200).optional() }).strict(), req.body);
  res.status(201).json(await communicationsService.addOptOut(body.channel, body.recipient, body.reason, req.user!.sub));
}));

communicationsRouter.delete('/opt-outs/:id', handle(async (req, res) => {
  await communicationsService.removeOptOut(req.params.id);
  res.status(204).send();
}));
