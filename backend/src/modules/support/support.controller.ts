// Support controller — ticket management + chatbot
import { Request, Response, NextFunction } from 'express';
import { supportService } from './support.service';
import { chatbotService } from './chatbot/chatbot.service';
import { AdminListTicketsDto, AssignTicketDto, ChangeStatusDto, AdminAddCommentDto } from './dto/support.dto';

// ── User handlers ─────────────────────────────────────────────────────────────

export async function createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ticket = await supportService.create(req.user!.sub, req.body);
    res.status(201).json(ticket);
  } catch (err) { next(err); }
}

export async function listMyTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 20;
    res.json(await supportService.listForUser(req.user!.sub, page, limit));
  } catch (err) { next(err); }
}

export async function getTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await supportService.getById(req.params['id']!, req.user!.sub));
  } catch (err) { next(err); }
}

export async function addUserComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const comment = await supportService.addUserComment(req.params['id']!, req.user!.sub, req.body.content);
    res.status(201).json(comment);
  } catch (err) { next(err); }
}

// ── Chatbot handler ───────────────────────────────────────────────────────────

export async function chatbot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query, sessionId } = req.body as { query: string; sessionId: string };
    const userId = req.user?.sub;
    const result = chatbotService.respond(query, sessionId, userId);
    res.json(result);
  } catch (err) { next(err); }
}

// ── Admin handlers ────────────────────────────────────────────────────────────

export async function adminListTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = AdminListTicketsDto.parse({
      status:   req.query.status,
      category: req.query.category,
      priority: req.query.priority,
      page:     req.query.page,
      limit:    req.query.limit,
    });
    res.json(await supportService.adminListAll(parsed));
  } catch (err) { next(err); }
}

export async function adminGetTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await supportService.adminGetById(req.params['id']!));
  } catch (err) { next(err); }
}

export async function adminAssignTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { assigneeId } = AssignTicketDto.parse(req.body);
    res.json(await supportService.assign(req.params['id']!, assigneeId));
  } catch (err) { next(err); }
}

export async function adminChangeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = ChangeStatusDto.parse(req.body);
    res.json(await supportService.changeStatus(req.params['id']!, input));
  } catch (err) { next(err); }
}

export async function adminAddComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { content, isInternal } = AdminAddCommentDto.parse(req.body);
    const comment = await supportService.adminAddComment(req.params['id']!, req.user!.sub, content, isInternal);
    res.status(201).json(comment);
  } catch (err) { next(err); }
}

export async function adminGetStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await supportService.adminGetStats());
  } catch (err) { next(err); }
}

// ── Chatbot admin handlers ────────────────────────────────────────────────────

export async function adminGetChatbotStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await supportService.adminGetChatbotStats());
  } catch (err) { next(err); }
}

export async function adminGetChatbotConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Number(req.query.limit) || 20;
    res.json(await supportService.adminGetRecentChatbotConversations(limit));
  } catch (err) { next(err); }
}

export async function adminGetUnansweredQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Number(req.query.limit) || 50;
    res.json(await supportService.adminGetUnansweredQuestions(limit));
  } catch (err) { next(err); }
}

export async function adminGetChatbotFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stored = await supportService.adminGetChatbotFaq();
    const defaults = chatbotService.getDefaultFaq();
    res.json({ faq: stored ?? defaults, isCustom: stored !== null });
  } catch (err) { next(err); }
}

export async function adminUpdateChatbotFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await supportService.adminUpdateChatbotFaq(req.body.faq, req.user!.sub);
    res.json({ message: 'FAQ mise à jour' });
  } catch (err) { next(err); }
}
