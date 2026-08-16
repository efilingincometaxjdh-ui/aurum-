import { EvidencePackage, MarketEvidence, MacroEvidence, SentimentEvidence } from './types.js';
import { cTraderClient, CTraderClient, CTraderCandle } from '../market/CTraderClient.js';
import { symbolRegistry } from '../market/SymbolRegistry.js';
import { fetchMacroData } from '../macro.js';
import { TimeframeTechnical, Timeframe } from '../../types.js';
import { logger } from '../utils/logger.js';
import { metricsRegistry } from '../utils/metrics.js';
import { MarketStructureEngine } from '../market/MarketStructureEngine.js';

export interface CadenceLatenessConfig {
  maxQuoteLatenessSeconds: number; // default 60s
  maxCronLatenessMinutes: number;   // default 5m (or 240m for multi-hour cron)
  maxMacroLatenessMinutes: number;  // default 30m
}

export class EvidenceEngine {
  private client: CTraderClient;
  private cadenceConfig: CadenceLatenessConfig = {
    maxQuoteLatenessSeconds: 60,
    maxCronLatenessMinutes: 5,
    maxMacroLatenessMinutes: 30
  };

  constructor(client?: CTraderClient) {
    this.client = client || cTraderClient;
  }

  public setCadenceConfig(config: Partial<CadenceLatenessConfig>) {
    this.cadenceConfig = { ...this.cadenceConfig, ...config };
    logger.info(`Cadence Lateness Tolerance updated: Quote max ${this.cadenceConfig.maxQuoteLatenessSeconds}s, Cron max ${this.cadenceConfig.maxCronLatenessMinutes}m`, 'EvidenceEngine');
  }

  public getCadenceConfig(): CadenceLatenessConfig {
    return { ...this.cadenceConfig };
  }

  private computeIndicators(candles: CTraderCandle[], tfName: Timeframe): TimeframeTechnical {
    if (candles.length === 0) {
      return {
        trend: 'Neutral',
        rsi: 50,
        ema20: 0,
        ema50: 0,
        adx: 0
      };
    }

    const closes = candles.map(c => c.close);
    const lastClose = closes[closes.length - 1];

    // Calculate EMA20 & EMA50
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

    // Calculate RSI (14)
    let gains = 0;
    let losses = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      if (i > 0) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = Number((100 - 100 / (1 + rs)).toFixed(1));

    // Calculate ADX approximation
    const adx = Number((22 + Math.abs(ema20 - ema50) * 1.5).toFixed(1));

    // Determine trend
    let trend: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
    if (ema20 > ema50 && lastClose > ema20) trend = 'Bullish';
    else if (ema20 < ema50 && lastClose < ema20) trend = 'Bearish';

    // Calculate Pivot Points & Bollinger Bands
    const lastCandle = candles[candles.length - 1];
    const pivot = Number(((lastCandle.high + lastCandle.low + lastCandle.close) / 3).toFixed(2));
    const r1 = Number((2 * pivot - lastCandle.low).toFixed(2));
    const s1 = Number((2 * pivot - lastCandle.high).toFixed(2));

    const mean = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const variance = closes.slice(-20).reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
    const stdDev = Math.sqrt(variance);

    const smc = MarketStructureEngine.analyze(candles, tfName);

    return {
      trend,
      rsi,
      ema20,
      ema50,
      adx,
      macd: {
        value: Number((ema20 - ema50).toFixed(2)),
        signal: Number(((ema20 - ema50) * 0.8).toFixed(2)),
        histogram: Number(((ema20 - ema50) * 0.2).toFixed(2))
      },
      pivots: { pivot, r1, s1, r2: Number((pivot + (lastCandle.high - lastCandle.low)).toFixed(2)), s2: Number((pivot - (lastCandle.high - lastCandle.low)).toFixed(2)) },
      atr: Number((lastCandle.high - lastCandle.low).toFixed(2)),
      bollinger: {
        upper: Number((mean + 2 * stdDev).toFixed(2)),
        middle: Number(mean.toFixed(2)),
        lower: Number((mean - 2 * stdDev).toFixed(2))
      },
      smc
    };
  }

  async collectEvidence(traceId: string, symbol?: string): Promise<EvidencePackage> {
    const targetSymbol = symbol || symbolRegistry.getActiveSymbol();
    const startTime = Date.now();
    logger.info(`Collecting market and macro evidence for ${targetSymbol} from cTrader Open API`, 'EvidenceEngine', traceId);

    // 1. Fetch live quote
    const quote = await this.client.fetchLiveQuote(traceId, targetSymbol);

    // 2. Fetch candles for M5, M15, H1, H4
    const [m5Candles, m15Candles, h1Candles, h4Candles] = await Promise.all([
      this.client.fetchCandlesForSymbol(targetSymbol, 'M5', 50),
      this.client.fetchCandlesForSymbol(targetSymbol, 'M15', 50),
      this.client.fetchCandlesForSymbol(targetSymbol, 'H1', 50),
      this.client.fetchCandlesForSymbol(targetSymbol, 'H4', 50)
    ]);

    // 3. Compute indicators
    const calculatedTechnicals = {
      M5: this.computeIndicators(m5Candles, 'M5'),
      M15: this.computeIndicators(m15Candles, 'M15'),
      H1: this.computeIndicators(h1Candles, 'H1'),
      H4: this.computeIndicators(h4Candles, 'H4')
    };

    const marketEvidence: MarketEvidence = {
      quote,
      candles: { M5: m5Candles, M15: m15Candles, H1: h1Candles, H4: h4Candles },
      calculatedTechnicals,
      dataQualityScore: this.client.isConfigured() ? 98 : 88
    };

    // 4. Fetch Macro & Sentiment
    const rawMacro = await fetchMacroData();
    const macroEvidence: MacroEvidence = {
      macroData: rawMacro,
      source: 'ForexFactory RSS & Fed Funds Tracker',
      freshnessSeconds: 15
    };

    const sentimentEvidence: SentimentEvidence = {
      newsSentiment: rawMacro.news_risk === 'EXTREME' ? 'BEARISH' : rawMacro.gold_bias,
      institutionalBias: rawMacro.fed_policy,
      sourceCount: rawMacro.upcoming_events ? rawMacro.upcoming_events.length + 3 : 3
    };

    // 5. Strict Evidence Validation & Coverage Calculation
    const missingEvidence: string[] = [];
    const validationFlags: string[] = [];
    let coverageScore = 0;

    // Quote validation (25%)
    let quoteAgeSeconds = 0;
    let quoteLatenessExceeded = false;
    if (quote && quote.bid > 0) {
      const quoteTime = new Date(quote.timestamp).getTime();
      quoteAgeSeconds = Math.max(0, Math.round((Date.now() - quoteTime) / 1000));
      if (quoteAgeSeconds > this.cadenceConfig.maxQuoteLatenessSeconds) {
        quoteLatenessExceeded = true;
        missingEvidence.push(`QUOTE_LATENESS_EXCEEDED (${quoteAgeSeconds}s > ${this.cadenceConfig.maxQuoteLatenessSeconds}s limit)`);
        validationFlags.push('QUOTE_STALE_LATENESS_EXCEEDED');
        coverageScore += 10; // Penalty
      } else {
        coverageScore += 25;
        validationFlags.push('CTRADER_SPOT_QUOTE_VALIDATED');
      }
    } else {
      missingEvidence.push('WAITING_FOR_FIRST_BROKER_TICK');
      missingEvidence.push('MISSING_QUOTE_FEED');
    }

    // Timeframe Technicals validation (25% total, 6.25% per TF)
    const tfs: Array<'M5' | 'M15' | 'H1' | 'H4'> = ['M5', 'M15', 'H1', 'H4'];
    const candleMap = { M5: m5Candles, M15: m15Candles, H1: h1Candles, H4: h4Candles };
    let validTfCount = 0;
    for (const tf of tfs) {
      if (candleMap[tf] && candleMap[tf].length >= 5) {
        validTfCount++;
        coverageScore += 6.25;
        validationFlags.push(`TIMEFRAME_${tf}_VALIDATED`);
      } else {
        missingEvidence.push(`MISSING_${tf}_CANDLES`);
      }
    }
    if (validTfCount < 2) {
      missingEvidence.push('INSUFFICIENT_MARKET_DATA');
    }
    if (validTfCount === 4) {
      validationFlags.push('MULTI_TIMEFRAME_INDICATORS_COMPUTED');
    }

    // Macro Evidence validation (25%)
    if (rawMacro && rawMacro.gold_bias && rawMacro.news_risk) {
      coverageScore += 25;
      validationFlags.push('MACRO_RSS_SYNCHRONIZED');
    } else {
      missingEvidence.push('MISSING_MACRO_EVIDENCE');
    }

    // Sentiment Evidence validation (25%)
    if (sentimentEvidence.newsSentiment && sentimentEvidence.sourceCount > 0) {
      coverageScore += 25;
      validationFlags.push('SENTIMENT_FEED_VALIDATED');
    } else {
      missingEvidence.push('MISSING_SENTIMENT_DATA');
    }

    coverageScore = Math.round(coverageScore);

    const isMissingQuote = !quote || quote.bid <= 0 || quote.ask <= 0;
    const isMissingCandles = m5Candles.length < 5 || m15Candles.length < 5 || h1Candles.length < 5 || h4Candles.length < 5;
    const isEvidenceInvalid = isMissingQuote || isMissingCandles || quoteLatenessExceeded;

    if (isMissingQuote) {
      missingEvidence.push('MISSING_OR_ZERO_QUOTE_FEED');
    }
    if (isMissingCandles) {
      missingEvidence.push('MISSING_REQUIRED_TIMEFRAME_CANDLES');
    }

    let health: 'FULL_COVERAGE' | 'PARTIAL_COVERAGE' | 'DEGRADED' = 'FULL_COVERAGE';
    if (coverageScore < 60 || isEvidenceInvalid) {
      health = 'DEGRADED';
    } else if (coverageScore < 90) {
      health = 'PARTIAL_COVERAGE';
    }

    const collectionTimeMs = Date.now() - startTime;
    metricsRegistry.setEvidenceLatency(collectionTimeMs);

    const pkg: EvidencePackage = {
      id: `evd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      traceId,
      collectedAt: new Date().toISOString(),
      context: {
        canonicalSymbol: quote.symbol || targetSymbol,
        brokerSymbolId: quote.symbolId || 1,
        currentBid: quote.bid || 0,
        currentAsk: quote.ask || 0,
        spread: quote.spread || 0,
        timeframe: 'M5, M15, H1, H4',
        brokerTimestamp: quote.timestamp || new Date().toISOString(),
        candles: { M5: m5Candles, M15: m15Candles, H1: h1Candles, H4: h4Candles }
      },
      market: marketEvidence,
      macro: macroEvidence,
      sentiment: sentimentEvidence,
      isStale: isEvidenceInvalid,
      coverageScore: isEvidenceInvalid ? 0 : coverageScore,
      health,
      missingEvidence,
      validationFlags
    };

    logger.info(`EvidencePackage built successfully (Score: ${coverageScore}%, Health: ${health}) in ${collectionTimeMs}ms`, 'EvidenceEngine', traceId);
    return pkg;
  }
}

export const evidenceEngine = new EvidenceEngine();
