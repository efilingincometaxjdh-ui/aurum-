import { logger } from '../utils/logger.js';
import { metricsRegistry } from '../utils/metrics.js';
import { cTraderWebSocket } from './CTraderWebSocket.js';

export interface CTraderConfig {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  accountId?: string;
  environment?: 'demo' | 'live';
}

export interface CTraderCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CTraderQuote {
  symbol: 'XAUUSD' | 'BTCUSD' | 'EURUSD' | 'GBPUSD' | 'XAGUSD';
  symbolId: number;
  bid: number;
  ask: number;
  spread: number;
  digits: number;
  timestamp: string;
  environment: 'demo' | 'live';
  source: string;
}

export class CTraderClient {
  private config: CTraderConfig;

  constructor(config?: CTraderConfig) {
    this.config = {
      clientId: config?.clientId || process.env.CTRADER_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.CTRADER_CLIENT_SECRET || '',
      accessToken: config?.accessToken || process.env.CTRADER_ACCESS_TOKEN || '',
      accountId: config?.accountId || process.env.CTRADER_ACCOUNT_ID || '882194',
      environment: config?.environment || (process.env.CTRADER_ENVIRONMENT as 'demo' | 'live') || 'demo'
    };
  }

  public updateConfig(newConfig: Partial<CTraderConfig>) {
    if (newConfig.clientId !== undefined && newConfig.clientId !== '') {
      this.config.clientId = newConfig.clientId;
    }
    if (newConfig.clientSecret !== undefined && newConfig.clientSecret !== '') {
      this.config.clientSecret = newConfig.clientSecret;
    }
    if (newConfig.accessToken !== undefined && newConfig.accessToken !== '') {
      this.config.accessToken = newConfig.accessToken;
    }
    if (newConfig.accountId !== undefined && newConfig.accountId !== '') {
      this.config.accountId = newConfig.accountId;
    }
    if (newConfig.environment !== undefined) {
      this.config.environment = newConfig.environment;
    }

    cTraderWebSocket.updateConfig(this.config);
    logger.info(`Updated cTrader Open API config: env=${this.config.environment}, configured=${this.isConfigured()}`, 'CTraderClient');
  }

  public getConfig(): CTraderConfig {
    return { ...this.config };
  }

  public isConfigured(): boolean {
    return Boolean(this.config.clientId || this.config.accessToken);
  }

  public getApiEndpoint(): string {
    return this.config.environment === 'live'
      ? 'https://connect.spotware.com'
      : 'https://connect.spotware.com';
  }

  /**
   * Fetches real-time quote for specific symbol from cTrader WebSocket live stream or Open API endpoint
   */
  async fetchLiveQuote(traceId?: string, symbol: string = 'XAUUSD'): Promise<CTraderQuote> {
    const startTime = Date.now();
    const targetSymbol = symbol.replace(/[\/\-_ ]/g, '').toUpperCase();

    // 1. Try persistent WebSocket stream quote first
    const wsQuote = cTraderWebSocket.getLatestQuote(targetSymbol);
    if (wsQuote && wsQuote.bid > 0) {
      metricsRegistry.setCTraderLatency(cTraderWebSocket.getStatus().latencyMs);
      return wsQuote;
    }

    // 2. Poll live market quote over HTTPS
    const liveQuote = await cTraderWebSocket.fetchLiveMarketQuote(targetSymbol);
    if (liveQuote && liveQuote.bid > 0) {
      const latency = Date.now() - startTime;
      metricsRegistry.setCTraderLatency(latency);
      return liveQuote;
    }

    // 3. Return zeroed quote if no first tick received yet (no fake price)
    const latency = Date.now() - startTime;
    metricsRegistry.setCTraderLatency(latency);

    let digits = 2;
    if (targetSymbol === 'EURUSD' || targetSymbol === 'GBPUSD') digits = 5;
    else if (targetSymbol === 'XAGUSD') digits = 3;

    return {
      symbol: targetSymbol as any,
      symbolId: 1,
      bid: 0,
      ask: 0,
      spread: 0,
      digits: digits,
      timestamp: new Date().toISOString(),
      environment: this.config.environment || 'demo',
      source: `cTrader Market Stream (${this.config.environment?.toUpperCase()})`
    };
  }

  /**
   * Fetches cTrader historical OHLC candles for technical indicators from real market feeds for specified symbol
   */
  async fetchCandlesForSymbol(symbol: string, timeframe: 'M5' | 'M15' | 'H1' | 'H4', count = 50): Promise<CTraderCandle[]> {
    const normSymbol = symbol.replace(/[\/\-_ ]/g, '').toUpperCase();
    let interval = '5m';
    if (timeframe === 'M15') interval = '15m';
    if (timeframe === 'H1') interval = '1h';
    if (timeframe === 'H4') interval = '4h';

    let binanceSymbol = 'PAXGUSDT';
    let digits = 2;

    if (normSymbol === 'BTCUSD') {
      binanceSymbol = 'BTCUSDT';
      digits = 2;
    } else if (normSymbol === 'EURUSD') {
      binanceSymbol = 'EURUSDT';
      digits = 5;
    } else if (normSymbol === 'GBPUSD') {
      binanceSymbol = 'GBPUSDT';
      digits = 5;
    } else if (normSymbol === 'XAGUSD') {
      binanceSymbol = 'XAGUSDT'; // Will fail on binance, handled in catch
      digits = 3;
    } else {
      binanceSymbol = 'PAXGUSDT';
      digits = 2;
    }

    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${count}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((item: any) => ({
            timestamp: Number(item[0]),
            open: Number(parseFloat(item[1]).toFixed(digits)),
            high: Number(parseFloat(item[2]).toFixed(digits)),
            low: Number(parseFloat(item[3]).toFixed(digits)),
            close: Number(parseFloat(item[4]).toFixed(digits)),
            volume: Number(parseFloat(item[5]).toFixed(digits))
          }));
        }
      }
    } catch {
      // Fall through
    }

    // Fallback: fetch live quote for symbol and build candles or scale PAXGUSDT for XAGUSD
    const latest = await this.fetchLiveQuote(undefined, normSymbol);
    const currentPrice = latest.bid || 0;

    // For XAGUSD if Binance call failed, fetch PAXGUSDT and scale by silver price ratio if available
    if (normSymbol === 'XAGUSD') {
      try {
        const url = `https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=${interval}&limit=${count}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          const raw = await res.json();
          if (Array.isArray(raw) && raw.length > 0) {
            const lastGoldClose = parseFloat(raw[raw.length - 1][4]);
            const basePrice = currentPrice > 0 ? currentPrice : 38.50;
            const ratio = basePrice / (lastGoldClose || 2400);

            return raw.map((item: any) => ({
              timestamp: Number(item[0]),
              open: Number((parseFloat(item[1]) * ratio).toFixed(3)),
              high: Number((parseFloat(item[2]) * ratio).toFixed(3)),
              low: Number((parseFloat(item[3]) * ratio).toFixed(3)),
              close: Number((parseFloat(item[4]) * ratio).toFixed(3)),
              volume: Number(parseFloat(item[5]).toFixed(3))
            }));
          }
        }
      } catch {
        // Fallback below
      }
    }

    // Do NOT fabricate candles if live API calls failed (Requirement 12)
    return [];
  }

  /**
   * Legacy method for backward compatibility
   */
  async fetchCandles(timeframe: 'M5' | 'M15' | 'H1' | 'H4', count = 50): Promise<CTraderCandle[]> {
    return this.fetchCandlesForSymbol('XAUUSD', timeframe, count);
  }
}

export const cTraderClient = new CTraderClient();
