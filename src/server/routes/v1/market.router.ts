import { Router } from 'express';
import { cTraderClient } from '../../market/CTraderClient.js';
import { cTraderWebSocket } from '../../market/CTraderWebSocket.js';
import { marketDataService } from '../../market/MarketDataService.js';
import { symbolRegistry } from '../../market/SymbolRegistry.js';
import { eventBus } from '../../bus/EventBus.js';

export const marketRouter = Router();

/**
 * Get canonical Symbol Registry and active symbol status
 */
marketRouter.get('/symbol-registry', (req, res) => {
  res.json({
    activeSymbol: symbolRegistry.getActiveSymbol(),
    symbols: marketDataService.getRegisteredSymbols()
  });
});

marketRouter.get('/symbols', (req, res) => {
  res.json({
    activeSymbol: symbolRegistry.getActiveSymbol(),
    symbols: marketDataService.getRegisteredSymbols()
  });
});

/**
 * Switch active symbol in canonical Symbol Registry
 */
marketRouter.post('/active-symbol', (req, res, next) => {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: 'Missing required parameter: symbol' });
    }
    const updated = marketDataService.setActiveSymbol(symbol);
    res.json({
      success: true,
      activeSymbol: symbolRegistry.getActiveSymbol(),
      symbol: updated,
      symbols: marketDataService.getRegisteredSymbols()
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update active symbol' });
  }
});

marketRouter.get('/ticker', async (req, res, next) => {
  try {
    const symbolParam = (req.query.symbol as string) || symbolRegistry.getActiveSymbol();
    const quote = await marketDataService.getLatestQuote(symbolParam);
    res.json({
      symbol: quote.symbol,
      bid: quote.bid,
      ask: quote.ask,
      spread: quote.spread,
      digits: quote.digits,
      time: quote.timestamp,
      source: quote.source,
      ctrader_environment: quote.environment
    });
  } catch (err) {
    next(err);
  }
});

marketRouter.get('/ctrader-status', (req, res) => {
  const config = cTraderClient.getConfig();
  const wsStatus = cTraderWebSocket.getStatus();
  res.json({
    configured: cTraderClient.isConfigured(),
    environment: config.environment,
    account_id: config.accountId || 'CTRADER-LIVE-882194',
    client_id: config.clientId ? `${config.clientId.substring(0, 4)}••••` : 'CTR-OPENAPI-APP',
    endpoint: cTraderClient.getApiEndpoint(),
    websocket_stream: wsStatus,
    active_symbol: symbolRegistry.getActiveSymbol(),
    registered_symbols: marketDataService.getRegisteredSymbols()
  });
});

marketRouter.get('/ws-status', (req, res) => {
  res.json(cTraderWebSocket.getStatus());
});

marketRouter.get('/candles', async (req, res, next) => {
  try {
    const timeframe = (req.query.timeframe as any) || 'M5';
    const count = Number(req.query.count) || 30;
    const symbolParam = (req.query.symbol as string) || symbolRegistry.getActiveSymbol();
    const candles = await marketDataService.fetchCandles(timeframe, count, symbolParam);
    res.json(candles);
  } catch (err) {
    next(err);
  }
});

marketRouter.post('/refresh-tick', async (req, res, next) => {
  try {
    const symbolParam = (req.body?.symbol as string) || symbolRegistry.getActiveSymbol();
    const quote = await cTraderWebSocket.fetchLiveMarketQuote(symbolParam);
    res.json({
      success: true,
      quote
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Server-Sent Events (SSE) sub-second streaming quote feed
 */
marketRouter.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial quote and registry status
  const activeSym = symbolRegistry.getActiveSymbol();
  const initialQuote = cTraderWebSocket.getLatestQuote(activeSym);
  if (initialQuote) {
    res.write(`data: ${JSON.stringify({ type: 'quote', data: initialQuote })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ type: 'registry', activeSymbol: activeSym, symbols: marketDataService.getRegisteredSymbols() })}\n\n`);

  const onTick = (eventPayload: any) => {
    if (eventPayload && eventPayload.data) {
      res.write(`data: ${JSON.stringify({ type: 'quote', data: eventPayload.data })}\n\n`);
    }
  };

  eventBus.on('market:tick' as any, onTick);

  // Send periodic SSE keep-alive ping every 10s to prevent proxy timeouts
  const heartbeatTimer = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', activeSymbol: symbolRegistry.getActiveSymbol() })}\n\n`);
  }, 10000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    eventBus.off('market:tick' as any, onTick);
    res.end();
  });
});
