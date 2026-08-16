import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    logger.info(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`,
      'HTTP',
      req.traceId,
      {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: duration,
        ip: req.ip
      }
    );
  });
  next();
}
