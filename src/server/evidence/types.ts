import { CTraderQuote, CTraderCandle } from '../market/CTraderClient.js';
import { MacroData } from '../macro.js';
import { TimeframeTechnical } from '../../types.js';

export interface MarketEvidence {
  quote: CTraderQuote;
  candles: Record<'M5' | 'M15' | 'H1' | 'H4', CTraderCandle[]>;
  calculatedTechnicals: Record<'M5' | 'M15' | 'H1' | 'H4', TimeframeTechnical>;
  dataQualityScore: number; // 0-100
}

export interface MacroEvidence {
  macroData: MacroData;
  source: string;
  freshnessSeconds: number;
}

export interface SentimentEvidence {
  newsSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  institutionalBias: string;
  sourceCount: number;
}

export interface AgentExecutionContext {
  canonicalSymbol: string;
  brokerSymbolId: number;
  currentBid: number;
  currentAsk: number;
  spread: number;
  timeframe: string;
  brokerTimestamp: string;
  candles: Record<'M5' | 'M15' | 'H1' | 'H4', CTraderCandle[]>;
}

export interface EvidencePackage {
  id: string;
  traceId: string;
  collectedAt: string;
  context: AgentExecutionContext;
  market: MarketEvidence;
  macro: MacroEvidence;
  sentiment: SentimentEvidence;
  isStale: boolean;
  coverageScore: number; // 0-100
  health: 'FULL_COVERAGE' | 'PARTIAL_COVERAGE' | 'DEGRADED';
  missingEvidence: string[];
  validationFlags: string[];
}
