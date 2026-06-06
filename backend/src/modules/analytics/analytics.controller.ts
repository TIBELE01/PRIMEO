// Analytics controller
import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { MarketReportType } from '../../common/utils/market-report';

export async function getRevenue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getRevenue(req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPropertyStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getPropertyStats(req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBookingStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getBookingStats(req.user!.sub, req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDetailedStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getDetailedStats(req.user!.sub, req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMarketReportTypes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const types = analyticsService.getMarketReportTypes();
    res.json(types);
  } catch (err) {
    next(err);
  }
}

export async function listMarketReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reports = await analyticsService.listMarketReports(req.user!.sub);
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

export async function getOccupancyRate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getOccupancyRate(req.user!.sub, req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function purchaseMarketReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.purchaseMarketReport(
      req.user!.sub,
      req.body.reportType as MarketReportType,
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
