import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      startTime?: number;
    }
  }
}

export function traceIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const existingTraceId = req.headers['x-trace-id'] as string;
  const traceId = existingTraceId || `trc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  req.traceId = traceId;
  req.startTime = Date.now();
  res.setHeader('X-Trace-ID', traceId);
  next();
}
