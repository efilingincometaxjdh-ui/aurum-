import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { fetchAgent02State, generateCandles, getMarketTicker } from './src/server/market.js';
import { fetchAgent01State, fetchAgent03State } from './src/server/macro.js';
import { buildTraderViewSnapshot, evaluateAgent04, evaluateAgent05, evaluateAgent06 } from './src/server/engine.js';
import { getHistoryAnalytics, getHistoricalObservations } from './src/server/history.js';

let customApiKey = process.env.TWELVE_DATA_API_KEY || '';
let minConfidenceSetting = 55;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Pipeline cache
  let cachedPipelineData: any = null;
  let lastPipelineRun = 0;

  async function runFullPipeline() {
    const agent01 = fetchAgent01State();
    const agent02 = await fetchAgent02State(customApiKey);
    const agent03 = await fetchAgent03State();

    const agent04 = evaluateAgent04(agent03.data, agent02.data);
    const agent05 = evaluateAgent05(agent04.data, minConfidenceSetting);

    const upstreamStatus = {
      Agent01: agent01.status,
      Agent02: agent02.status,
      Agent03: agent03.status,
      Agent04: agent04.status,
      Agent05: agent05.status
    };

    const agent06 = evaluateAgent06(agent05, upstreamStatus);
    const trader_view = buildTraderViewSnapshot(agent06, agent04, agent03);
    const market_ticker = getMarketTicker();

    cachedPipelineData = {
      agent01,
      agent02,
      agent03,
      agent04,
      agent05,
      agent06,
      trader_view,
      market_ticker,
      min_confidence: minConfidenceSetting,
      has_api_key: Boolean(customApiKey)
    };
    lastPipelineRun = Date.now();
    return cachedPipelineData;
  }

  // Initial pipeline execution
  await runFullPipeline();

  // API ROUTES
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Aurum XAUUSD Intelligence Engine' });
  });

  app.get('/api/pipeline/status', async (req, res) => {
    // Refresh pipeline data if older than 10 seconds
    if (!cachedPipelineData || Date.now() - lastPipelineRun > 10000) {
      await runFullPipeline();
    }
    res.json(cachedPipelineData);
  });

  app.post('/api/pipeline/run', async (req, res) => {
    const data = await runFullPipeline();
    res.json({ success: true, timestamp: new Date().toISOString(), data });
  });

  app.get('/api/market/ticker', (req, res) => {
    res.json(getMarketTicker());
  });

  app.get('/api/market/candles', (req, res) => {
    const timeframe = (req.query.timeframe as string) || 'M5';
    const count = parseInt(req.query.count as string) || 30;
    res.json(generateCandles(count, timeframe));
  });

  app.get('/api/history/analytics', (req, res) => {
    res.json(getHistoryAnalytics());
  });

  app.get('/api/history/observations', (req, res) => {
    res.json(getHistoricalObservations());
  });

  app.post('/api/settings', (req, res) => {
    const { apiKey, minConfidence } = req.body;
    if (typeof apiKey === 'string') {
      customApiKey = apiKey;
    }
    if (typeof minConfidence === 'number' && minConfidence >= 0 && minConfidence <= 100) {
      minConfidenceSetting = minConfidence;
    }
    runFullPipeline();
    res.json({
      success: true,
      has_api_key: Boolean(customApiKey),
      min_confidence: minConfidenceSetting
    });
  });

  // Serve Frontend
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AURUM] Intelligence Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
