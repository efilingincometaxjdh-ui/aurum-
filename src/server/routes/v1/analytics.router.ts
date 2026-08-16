import { Router } from 'express';
import { getHistoryAnalytics, getHistoricalObservations } from '../../history.js';
import { stateRepository } from '../../repositories/PostgresObservationRepository.js';
import { 
  runStrategySimulation, 
  findSimilarHistoricalPatterns, 
  generateMLFeatureDataset, 
  optimizeWeights 
} from '../../sandbox.js';

export const analyticsRouter = Router();

analyticsRouter.get('/history', async (req, res, next) => {
  try {
    const records = await stateRepository.getObservationsHistory(50);
    if (records.length > 0) {
      const mapped = records.map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        trader_view: r.traderView
      }));
      return res.json(mapped);
    }
    const legacyHistory = await getHistoricalObservations();
    res.json(legacyHistory);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/analytics', async (req, res, next) => {
  try {
    const stats = await getHistoryAnalytics();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/stats', async (req, res, next) => {
  try {
    const stats = await getHistoryAnalytics();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/db-indexes', async (req, res, next) => {
  try {
    const metrics = await stateRepository.getDatabaseIndexMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/query', async (req, res, next) => {
  try {
    const { traceId, decision, permission, minConfidence, fromDate, toDate, limit } = req.query;
    const records = await stateRepository.queryObservations({
      traceId: traceId ? String(traceId) : undefined,
      decision: decision ? String(decision) : undefined,
      permission: permission ? String(permission) : undefined,
      minConfidence: minConfidence ? Number(minConfidence) : undefined,
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      limit: limit ? Number(limit) : 50
    });
    res.json({
      count: records.length,
      filters: { traceId, decision, permission, minConfidence, fromDate, toDate, limit },
      records
    });
  } catch (err) {
    next(err);
  }
});

analyticsRouter.post('/sandbox', async (req, res, next) => {
  try {
    const params = req.body;
    const results = await runStrategySimulation({
      minConfidence: Number(params.minConfidence ?? 55),
      macroWeight: Number(params.macroWeight ?? 15),
      technicalWeight: Number(params.technicalWeight ?? 15),
      h4Weight: Number(params.h4Weight ?? 4),
      h1Weight: Number(params.h1Weight ?? 3),
      m15Weight: Number(params.m15Weight ?? 2),
      m5Weight: Number(params.m5Weight ?? 1),
      rsiOverbought: Number(params.rsiOverbought ?? 70),
      rsiOversold: Number(params.rsiOversold ?? 30),
      adxThreshold: Number(params.adxThreshold ?? 25),
      emaCrossBonus: Number(params.emaCrossBonus ?? 10)
    });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/pattern-recognition', async (req, res, next) => {
  try {
    const rsi = Number(req.query.rsi ?? 50);
    const adx = Number(req.query.adx ?? 20);
    const bias = String(req.query.bias ?? 'BULLISH');
    const matches = await findSimilarHistoricalPatterns(rsi, adx, bias);
    res.json(matches);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/feature-store', async (req, res, next) => {
  try {
    const dataset = await generateMLFeatureDataset();
    
    // Check if user requested CSV download format
    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=aurum_ml_features.csv');
      
      const headers = Object.keys(dataset[0]).join(',');
      const rows = dataset.map((row: any) => 
        Object.values(row).map(val => typeof val === 'string' ? `"${val}"` : val).join(',')
      );
      
      return res.send([headers, ...rows].join('\n'));
    }
    
    res.json(dataset);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/optimize-weights', async (req, res, next) => {
  try {
    const tuned = await optimizeWeights();
    res.json(tuned);
  } catch (err) {
    next(err);
  }
});
