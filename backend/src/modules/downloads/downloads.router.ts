// Routes de téléchargement signées (factures, exports). Pas d'authentification
// par session : l'autorisation est portée par le jeton chiffré dans `?t=`.
import { Router } from 'express';
import { downloadInvoice, downloadExportFile } from './downloads.controller';

export const downloadsRouter = Router();

downloadsRouter.get('/invoice', downloadInvoice);
downloadsRouter.get('/export', downloadExportFile);
