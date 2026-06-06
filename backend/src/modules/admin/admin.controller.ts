// Admin controller — platform management operations
import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';

export async function getSubscriptionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.getSubscriptionHistory(req.params['id']!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function forceRecalculateBenefits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.forceRecalculateBenefits(req.params['id']!, req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPaymentFailures(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt((req.query['page'] as string) ?? '1');
    const limit = parseInt((req.query['limit'] as string) ?? '20');
    const result = await adminService.getPaymentFailures(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export async function getDashboardStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function getAdvancedStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await adminService.getAdvancedStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

// ── User management ────────────────────────────────────────────────────────────

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listUsers(req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await adminService.getUser(req.params['id']!);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.suspendUser(req.params['id']!, req.user!.sub, req.body.reason);
    res.json({ message: 'Compte suspendu' });
  } catch (err) {
    next(err);
  }
}

export async function reactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.reactivateUser(req.params['id']!, req.user!.sub);
    res.json({ message: 'Compte réactivé' });
  } catch (err) {
    next(err);
  }
}

export async function banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.banUser(req.params['id']!, req.user!.sub);
    res.json({ message: 'Compte banni' });
  } catch (err) {
    next(err);
  }
}

export async function updateUserNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.updateUserNotes(req.params['id']!, req.user!.sub, req.body.notes);
    res.json({ message: 'Notes mises à jour' });
  } catch (err) {
    next(err);
  }
}

export async function getKycDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await adminService.getKycDocuments(req.params['id']!);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function forcePasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.forcePasswordReset(req.params['id']!, req.user!.sub);
    res.json({ message: 'Email de réinitialisation envoyé' });
  } catch (err) {
    next(err);
  }
}

export async function approveKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.approveKyc(req.params['id']!, req.user!.sub);
    res.json({ message: 'KYC approuvé' });
  } catch (err) {
    next(err);
  }
}

export async function rejectKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.rejectKyc(req.params['id']!, req.user!.sub, req.body.reason);
    res.json({ message: 'KYC refusé' });
  } catch (err) {
    next(err);
  }
}

export async function revoke2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.revoke2fa(req.params['id']!, req.user!.sub);
    res.json({ message: 'Double authentification révoquée' });
  } catch (err) {
    next(err);
  }
}

// ── Liste complète des propriétés ─────────────────────────────────────────────

export async function listAllProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listAllProperties(req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPropertyDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await adminService.getPropertyDetail(req.params['id']!);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

export async function reactivateProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.reactivateProperty(req.params['id']!, req.user!.sub);
    res.json({ message: 'Annonce réactivée' });
  } catch (err) {
    next(err);
  }
}

// ── Property moderation ────────────────────────────────────────────────────────

export async function listPendingProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listPendingProperties(req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function approveProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.approveProperty(req.params['id']!, req.user!.sub);
    res.json({ message: 'Annonce approuvée' });
  } catch (err) {
    next(err);
  }
}

export async function rejectProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.rejectProperty(req.params['id']!, req.user!.sub, req.body.reason);
    res.json({ message: 'Annonce refusée' });
  } catch (err) {
    next(err);
  }
}

export async function requestPropertyModifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.requestPropertyModifications(req.params['id']!, req.user!.sub, req.body.feedback);
    res.json({ message: 'Demande de modifications envoyée' });
  } catch (err) {
    next(err);
  }
}

export async function suspendProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.suspendProperty(req.params['id']!, req.user!.sub, req.body.reason);
    res.json({ message: 'Annonce suspendue' });
  } catch (err) {
    next(err);
  }
}

export async function deleteProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.deleteProperty(req.params['id']!, req.user!.sub);
    res.json({ message: 'Annonce supprimée définitivement' });
  } catch (err) {
    next(err);
  }
}

// ── Bookings ────────────────────────────────────────────────────────────────────

export async function listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listBookings(req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const booking = await adminService.getBookingById(req.params['id']!);
    res.json(booking);
  } catch (err) {
    next(err);
  }
}

// ── Disputes ────────────────────────────────────────────────────────────────────

export async function listDisputes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listDisputes(req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDispute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dispute = await adminService.getDisputeById(req.params['id']!);
    res.json(dispute);
  } catch (err) {
    next(err);
  }
}

export async function resolveDispute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.resolveDispute(req.params['id']!, req.user!.sub, req.body);
    res.json({ message: 'Litige résolu' });
  } catch (err) {
    next(err);
  }
}

export async function refundDispute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.refundDispute(req.params['id']!, req.user!.sub, req.body);
    res.json({ message: 'Remboursement initié' });
  } catch (err) {
    next(err);
  }
}

// ── Platform config ────────────────────────────────────────────────────────────

export async function getAllConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const config = await adminService.getAllConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
}

export async function upsertConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.upsertConfig(req.body.key, req.body.value, req.user!.sub);
    res.json({ message: 'Configuration mise à jour' });
  } catch (err) {
    next(err);
  }
}

// ── Audit logs ──────────────────────────────────────────────────────────────────

export async function listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listAuditLogs(req.query as never);
    if ('csv' in result) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      res.send(result.csv);
    } else {
      res.json(result);
    }
  } catch (err) {
    next(err);
  }
}

// ── Promo codes ──────────────────────────────────────────────────────────────────

export async function listPromoCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listPromoCodes(req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createPromoCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promo = await adminService.createPromoCode(req.body, req.user!.sub);
    res.status(201).json(promo);
  } catch (err) {
    next(err);
  }
}

export async function updatePromoCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promo = await adminService.updatePromoCode(req.params['id']!, req.body, req.user!.sub);
    res.json(promo);
  } catch (err) {
    next(err);
  }
}

export async function deletePromoCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.deletePromoCode(req.params['id']!, req.user!.sub);
    res.json({ message: 'Code promo supprimé' });
  } catch (err) {
    next(err);
  }
}

// ── Email templates ────────────────────────────────────────────────────────────

export async function listEmailTemplates(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const templates = await adminService.listEmailTemplates();
    res.json(templates);
  } catch (err) {
    next(err);
  }
}

export async function upsertEmailTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.upsertEmailTemplate(req.params['name']!, req.body, req.user!.sub);
    res.json({ message: 'Template mis à jour' });
  } catch (err) {
    next(err);
  }
}

// ── Client ratings moderation ──────────────────────────────────────────────────

export async function listReportedClientRatings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listReportedClientRatings(req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function hideClientRating(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.hideClientRating(req.params['id']!, req.user!.sub);
    res.json({ message: 'Évaluation masquée' });
  } catch (err) {
    next(err);
  }
}

export async function restoreClientRating(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.restoreClientRating(req.params['id']!, req.user!.sub);
    res.json({ message: 'Évaluation restaurée' });
  } catch (err) {
    next(err);
  }
}

export async function changeUserPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.changeUserPlan(req.params['id']!, req.user!.sub, req.body.plan, req.ip);
    res.json({ message: 'Formule mise à jour' });
  } catch (err) {
    next(err);
  }
}
