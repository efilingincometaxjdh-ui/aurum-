export type HealthStatus = 'SUCCESS' | 'DEGRADED' | 'FAILED';
export type GoldBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type NewsRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
export type TrendDirection = 'Bullish' | 'Bearish' | 'Neutral';
export type DecisionState = 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH' | 'NO_TRADE';
export type PermissionState = 'ALLOW_BUYS' | 'ALLOW_SELLS' | 'ALLOW_BOTH' | 'CAUTION' | 'BLOCK_TRADING';
export type Timeframe = 'M5' | 'M15' | 'H1' | 'H4';

export interface TimeframeTechnical {
  ema20?: number;
  ema50?: number;
  rsi?: number;
  adx?: number;
  atr?: number;
  trend?: TrendDirection;
  structure?: string;
  close_price?: number;
}

export interface Agent01State {
  agent: 'Agent01';
  version: string;
  generated_at: string;
  status: HealthStatus;
  data: {
    gold_bias: GoldBias;
    usd_bias: GoldBias;
    confidence: number;
    news_risk: NewsRisk;
  };
  errors?: string[];
}

export interface Agent02State {
  agent: 'Agent02';
  version: string;
  generated_at: string;
  status: HealthStatus;
  data: {
    M5?: TimeframeTechnical;
    M15?: TimeframeTechnical;
    H1?: TimeframeTechnical;
    H4?: TimeframeTechnical;
  };
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface NewsHeadline {
  title: string;
  pubDate: string;
  source: string;
  impact_score: number; // -10 to +10
  bias: GoldBias;
}

export interface Agent03State {
  agent: 'Agent03';
  version: string;
  generated_at: string;
  status: HealthStatus;
  data: {
    gold_bias: GoldBias;
    macro_score: number;
    confidence: number;
    news_risk: NewsRisk;
    headlines?: NewsHeadline[];
  };
  errors?: string[];
}

export interface Agent04State {
  agent: 'Agent04';
  version: string;
  generated_at: string;
  status: HealthStatus;
  data: {
    decision: DecisionState;
    confidence: number;
    risk: NewsRisk;
    reasons: string[];
  };
  errors?: string[];
  metadata?: {
    technical_fusion?: {
      usable_timeframes: Timeframe[];
      trend_votes: {
        bullish: number;
        bearish: number;
        neutral: number;
      };
      weighted_averages?: {
        ema20: number;
        ema50: number;
        rsi: number;
        adx: number;
      };
      alignment?: {
        state: 'ALIGNED' | 'CONFLICT' | 'NEUTRAL';
        higher_timeframe_conflict?: boolean;
        lower_timeframe_conflict?: boolean;
        cross_group_conflict?: boolean;
        timeframe_trends?: Record<string, string>;
      };
    };
  };
}

export interface Agent05State {
  agent: 'Agent05';
  version: string;
  generated_at: string;
  status: HealthStatus;
  data: {
    permission: PermissionState;
    reason: string;
    minimum_confidence_required: number;
  };
  errors?: string[];
}

export interface Agent06State {
  agent: 'Agent06';
  version: string;
  generated_at: string;
  status: HealthStatus;
  data: {
    permission: PermissionState;
    reason: string;
    fresh: boolean;
    upstream_status: Record<string, HealthStatus>;
    execution_enabled: boolean;
  };
  errors?: string[];
}

export interface TraderViewSnapshot {
  symbol: string;
  decision: DecisionState;
  permission: PermissionState;
  confidence: number;
  risk: NewsRisk;
  macro_bias: GoldBias;
  news_risk: NewsRisk;
  timeframes: Timeframe[];
  trend_votes: {
    bullish: number;
    bearish: number;
    neutral?: number;
  };
  timeframe_conflict: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe_alignment: 'ALIGNED' | 'CONFLICT' | 'NEUTRAL';
  timeframe_trends: Record<string, string>;
  higher_timeframe_conflict: boolean;
  lower_timeframe_conflict: boolean;
  cross_group_conflict: boolean;
  reasons: string[];
  fresh: boolean;
  execution_enabled: boolean;
  mode: 'READ_ONLY';
  last_updated: string;
}

export interface PipelineSummary {
  agent01: Agent01State;
  agent02: Agent02State;
  agent03: Agent03State;
  agent04: Agent04State;
  agent05: Agent05State;
  agent06: Agent06State;
  trader_view: TraderViewSnapshot;
  market_ticker: {
    symbol: string;
    price: number;
    change_24h: number;
    change_percent_24h: number;
    high_24h: number;
    low_24h: number;
    updated_at: string;
  };
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalObservation {
  id: string;
  timestamp: string;
  price: number;
  decision: DecisionState;
  permission: PermissionState;
  confidence: number;
  risk: NewsRisk;
  outcome?: {
    price_after_1h?: number;
    price_after_4h?: number;
    pnl_pip?: number;
    win?: boolean;
  };
}
