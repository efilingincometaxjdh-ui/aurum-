import { Router } from 'express';
import { cTraderClient } from '../../market/CTraderClient.js';
import { stateRepository } from '../../repositories/PostgresObservationRepository.js';
import { redisRepository } from '../../repositories/RedisCacheRepository.js';
import { metricsRegistry } from '../../utils/metrics.js';

export const healthRouter = Router();

healthRouter.get('/health', async (req, res) => {
  const stateHealth = await stateRepository.getHealthStatus();
  const redisHealth = await redisRepository.getHealthStatus();

  res.json({
    status: 'HEALTHY',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
    services: {
      ctrader_connector: {
        status: cTraderClient.isConfigured() ? 'ONLINE' : 'SANDBOX_MODE',
        environment: cTraderClient.getConfig().environment,
        endpoint: cTraderClient.getApiEndpoint()
      },
      evidence_engine: { status: 'ONLINE' },
      state_repository: stateHealth,
      cache_repository: redisHealth
    },
    uptime_seconds: Math.floor(process.uptime())
  });
});

healthRouter.get('/metrics', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
    metrics: metricsRegistry.getMetrics()
  });
});
