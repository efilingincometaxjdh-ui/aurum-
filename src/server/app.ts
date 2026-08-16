import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { traceIdMiddleware } from './middleware/traceId.js';
import { requestLoggerMiddleware } from './middleware/logger.js';
import { healthRouter } from './routes/v1/health.router.js';
import { marketRouter } from './routes/v1/market.router.js';
import { pipelineRouter } from './routes/v1/pipeline.router.js';
import { analyticsRouter } from './routes/v1/analytics.router.js';
import { settingsRouter } from './routes/v1/settings.router.js';
import { decisionRouter } from './routes/v1/decision.router.js';
import { logger } from './utils/logger.js';

export async function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Attach Trace ID & Structured Request Logger
  app.use(traceIdMiddleware);
  app.use(requestLoggerMiddleware);

  // Version 1 Public API Routes
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', decisionRouter);
  app.use('/api/v1/market', marketRouter);
  app.use('/api/v1/pipeline', pipelineRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/settings', settingsRouter);

  // Backward Compatibility Aliases for Frontend
  app.use('/api/pipeline', pipelineRouter);
  app.use('/api/market', marketRouter);
  app.use('/api/history', analyticsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api', decisionRouter);

  // Catch-all 404 handler for API routes to prevent Vite SPA HTML fallback on unmatched /api endpoints
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      error: true,
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      traceId: req.traceId,
      timestamp: new Date().toISOString()
    });
  });

  // Global API Error Handler
  app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error(`API Error: ${err.message}`, 'App', req.traceId, { stack: err.stack });
    res.status(err.status || 500).json({
      error: true,
      message: err.message || 'Internal Server Error',
      traceId: req.traceId,
      timestamp: new Date().toISOString()
    });
  });

  // Vite Middleware for Development / Static serving for Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}
