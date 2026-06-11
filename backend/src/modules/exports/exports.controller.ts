// Exports controller — endpoints du tableau de bord professionnel
import { Request, Response, NextFunction } from 'express';
import { exportsService } from './exports.service';

export async function createExport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const record = await exportsService.createExport(req.user!.sub, req.body);
    res.status(202).json({
      message: 'Export en cours de génération. Vous recevrez un email dès qu\'il sera prêt.',
      export: record,
    });
  } catch (err) {
    next(err);
  }
}

export async function listExports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const exports = await exportsService.listMyExports(req.user!.sub);
    res.json(exports);
  } catch (err) {
    next(err);
  }
}

export async function getExport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const record = await exportsService.getExport(req.user!.sub, req.params.id);
    res.json(record);
  } catch (err) {
    next(err);
  }
}

export async function downloadExport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url } = await exportsService.getDownloadUrl(req.user!.sub, req.params.id);
    // Redirection vers l'URL Cloudinary (non devinable) après contrôle d'accès
    res.redirect(url);
  } catch (err) {
    next(err);
  }
}
