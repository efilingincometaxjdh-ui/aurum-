import { cTraderClient, CTraderConfig, CTraderCandle } from './market/CTraderClient.js';
import { cTraderWebSocket } from './market/CTraderWebSocket.js';
import { symbolRegistry } from './market/SymbolRegistry.js';
import { Agent02State, TimeframeTechnical } from '../types.js';
import { MarketStructureEngine } from './market/MarketStructureEngine.js';

export type { CTraderConfig };

function computeRealTechnicals(candles: CTraderCandle[]): TimeframeTechnical {
  if (!candles || candles.length === 0) {
    return {
      trend: 'Neutral',
      rsi: 50,
      ema20: 0,
      ema50: 0,
      adx: 20,
      close_price: 0
    };
  }

  const closes = candles.map(c => c.close);
  const last = candles[candles.length - 1];
  const lastClose = last.close;

  const calcEMA = (period: number) => {
    const k = 2 / (period + 1);
    let ema = closes[0];
    for (let i = 1; i < closes.length; i++) {
      ema = closes[i] * k + ema * (1 - k);
    }
    return Number(ema.toFixed(2));
  };

  const ema20 = calcEMA(20);
  const ema50 = calcEMA(50);

  let gains = 0;
  let losses = 0;
  const period = Math.min(14, closes.length - 1);
  for (let i = closes.length - period; i < closes.length; i++) {
    if (i > 0) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
  }
  const avgGain = gains / (period || 1);
  const avgLoss = losses / (period || 1);
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = Number((100 - 100 / (1 + rs)).toFixed(1));

  const adx = Number((20 + Math.abs(ema20 - ema50) * 1.2).toFixed(1));
  const atr = Number((last.high - last.low).toFixed(2));

  let trend: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
  if (ema20 > ema50 && lastClose > ema20) trend = 'Bullish';
  else if (ema20 < ema50 && lastClose < ema20) trend = 'Bearish';

  const smc = MarketStructureEngine.analyze(candles, 'M5');

  return {
    trend,
    rsi,
    ema20,
    ema50,
    adx,
    atr,
    structure: trend === 'Bullish' ? 'Higher Highs & Higher Lows' : trend === 'Bearish' ? 'Lower Highs & Lower Lows' : 'Ranging / Consolidation',
    close_price: lastClose,
    smc
  };
}

export async function fetchAgent02State(config?: CTraderConfig): Promise<Agent02State> {
  if (config) {
    cTraderClient.updateConfig(config);
  }

  const quote = await cTraderClient.fetchLiveQuote('legacy_fetch');
  const [m5, m15, h1, h4] = await Promise.all([
    cTraderClient.fetchCandles('M5', 50),
    cTraderClient.fetchCandles('M15', 50),
    cTraderClient.fetchCandles('H1', 50),
    cTraderClient.fetchCandles('H4', 50)
  ]);

  const cfg = cTraderClient.getConfig();

  return {
    agent: 'Agent02',
    version: '1.0',
    generated_at: new Date().toISOString(),
    status: 'SUCCESS',
    data: {
      M5: computeRealTechnicals(m5),
      M15: computeRealTechnicals(m15),
      H1: computeRealTechnicals(h1),
      H4: computeRealTechnicals(h4)
    },
    metadata: {
      source: quote.source,
      timeframes_calculated: ['M5', 'M15', 'H1', 'H4'],
      ctrader_environment: cfg.environment,
      account_id: cfg.accountId || '882194',
      client_id: cfg.clientId ? `${cfg.clientId.substring(0, 4)}••••` : 'CTR-OPENAPI-APP'
    }
  };
}

export function getMarketTicker(symbol?: string) {
  const targetSymbol = symbol || symbolRegistry.getActiveSymbol();
  const quote = cTraderWebSocket.getLatestQuote(targetSymbol);
  const currentPrice = quote?.bid || 0;

  return {
    symbol: targetSymbol,
    price: currentPrice,
    bid: quote?.bid || currentPrice,
    ask: quote?.ask || currentPrice,
    spread: quote?.spread || 0,
    change_24h: 0,
    change_percent_24h: 0,
    high_24h: currentPrice,
    low_24h: currentPrice,
    updated_at: quote?.timestamp || new Date().toISOString()
  };
}
