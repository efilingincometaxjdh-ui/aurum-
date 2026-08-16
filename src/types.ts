export type HealthStatus = 'SUCCESS' | 'DEGRADED' | 'FAILED';
export type GoldBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type NewsRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
export type TrendDirection = 'Bullish' | 'Bearish' | 'Neutral';
export type DecisionState = 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH' | 'NO_TRADE';
export type PermissionState = 'ALLOW_BUYS' | 'ALLOW_SELLS' | 'ALLOW_BOTH' | 'CAUTION' | 'BLOCK_TRADING';
export type Timeframe = 'M5' | 'M15' | 'H1' | 'H4';

export type SymbolStatus =
  | 'REGISTERED'
  | 'SUBSCRIBED'
  | 'CONNECTED_STREAMING'
  | 'WAITING_FOR_FIRST_BROKER_TICK'
  | 'DISCONNECTED';

export interface RegisteredSymbol {
  symbol: string;
  displayName: string;
  category: 'Metals' | 'Crypto' | 'Forex';
  symbolId: number;
  digits: number;
  pipSize: number;
  status: SymbolStatus;
  subscribed: boolean;
  firstTickReceived: boolean;
  lastQuote: {
    symbol: string;
    bid: number;
    ask: number;
    spread: number;
    digits: number;
    timestamp: string;
    source: string;
  } | null;
}

export interface SymbolRegistryResponse {
  activeSymbol: string;
  symbols: RegisteredSymbol[];
}

export interface MarketStructureData {
  timeframe: string;
  swings: {
    type: 'HH' | 'HL' | 'LH' | 'LL' | 'High' | 'Low';
    price: number;
    index: number;
    timestamp: string;
  }[];
  bos: {
    type: 'BOS_BULLISH' | 'BOS_BEARISH';
    price: number;
    timestamp: string;
    confirmed: boolean;
  }[];
  choch: {
    type: 'CHOCH_BULLISH' | 'CHOCH_BEARISH';
    price: number;
    timestamp: string;
    confirmed: boolean;
  }[];
  orderBlocks: {
    type: 'BULLISH' | 'BEARISH';
    open: number;
    high: number;
    low: number;
    close: number;
    timestamp: string;
    volume: number;
    mitigated: boolean;
  }[];
  fvgs: {
    type: 'BULLISH' | 'BEARISH';
    top: number;
    bottom: number;
    candle1Index: number;
    candle3Index: number;
    mitigated: boolean;
    timestamp: string;
  }[];
  liquidity: {
    equalHighs: { price: number; indexes: number[] }[];
    equalLows: { price: number; indexes: number[] }[];
    sweeps: {
      type: 'SWEEP_HIGH' | 'SWEEP_LOW';
      sweepPrice: number;
      triggerPrice: number;
      timestamp: string;
    }[];
  };
  context: {
    dealingRange: { low: number; high: number };
    pricingZone: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM';
    currentSession: 'ASIA' | 'LONDON' | 'NEWYORK' | 'GAP';
    imbalanceRatio: number;
  };
  regime: {
    classification: 'TRENDING_BULLISH' | 'TRENDING_BEARISH' | 'RANGING' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY';
    volatilityIndex: number;
    strength: number;
  };
}

export interface TimeframeTechnical {
  ema20?: number;
  ema50?: number;
  rsi?: number;
  adx?: number;
  atr?: number;
  trend?: TrendDirection;
  structure?: string;
  close_price?: number;
  macd?: {
    value: number;
    signal: number;
    histogram: number;
  };
  pivots?: {
    pivot: number;
    r1: number;
    s1: number;
    r2: number;
    s2: number;
  };
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
  };
  smc?: MarketStructureData;
}

export interface Agent01State {
  agent: string;
  version: string;
  generated_at: string;
  status: HealthStatus;
  data: {
    gold_bias: GoldBias;
    usd_bias: GoldBias;
    confidence: number;
    news_risk: NewsRisk;
    narrative?: string;
    key_drivers?: string[];
    sentiment_score?: number;
    risk_factors?: string[];
  };
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface Agent02State {
  agent: string;
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

export interface EconomicCalendarEvent {
  id: string;
  title: string;
  country: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scheduled_time: string;
  time_until_minutes: number;
  actual?: string;
  forecast?: string;
  previous?: string;
  blackout_active: boolean;
  blackout_window_minutes: number;
}

export interface Agent03State {
  agent: string;
  version: string;
  generated_at: string;
  status: HealthStatus;
  data: {
    gold_bias: GoldBias;
    macro_score: number;
    confidence: number;
    news_risk: NewsRisk;
    headlines?: NewsHeadline[];
    calendar_events?: EconomicCalendarEvent[];
    blackout_active?: boolean;
    active_blackout_event?: string;
    us10y_yield?: number;
    dxy_index?: number;
  };
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface Agent04State {
  agent: string;
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
  metadata?: Record<string, any>;
}

export interface Agent05State {
  agent: string;
  version: string;
  generated_at: string;
  status: HealthStatus;
  data: {
    permission: PermissionState;
    reason: string;
    minimum_confidence_required: number;
  };
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface Agent06State {
  agent: string;
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
  metadata?: Record<string, any>;
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
  correlations?: Record<string, number>;
  multi_timeframe_confluence?: {
    score: number;
    signal: 'BULLISH' | 'BEARISH' | 'CONSOLIDATING';
    description: string;
  };
}

export interface CadenceConfig {
  maxQuoteLatenessSeconds: number;
  maxCronLatenessMinutes: number;
  maxMacroLatenessMinutes: number;
}

export interface EvidenceCoverageInfo {
  score: number;
  health: 'FULL_COVERAGE' | 'PARTIAL_COVERAGE' | 'DEGRADED';
  missing: string[];
  flags: string[];
  lateness_metrics?: {
    quote_age_seconds: number;
    quote_lateness_exceeded: boolean;
    cron_age_seconds: number;
    cron_lateness_exceeded: boolean;
    macro_age_minutes: number;
    macro_lateness_exceeded: boolean;
  };
}

export interface PipelineSummary {
  generated_at: string;
  trace_id?: string;
  evidence_coverage?: EvidenceCoverageInfo;
  agent01: Agent01State;
  agent02: Agent02State;
  agent03: Agent03State;
  agent04: Agent04State;
  agent05: Agent05State;
  agent06: Agent06State;
  trader_view: TraderViewSnapshot;
  market_ticker: {
    symbol: string;
    price?: number;
    bid?: number;
    ask?: number;
    spread?: number;
    change_24h?: number;
    change_percent_24h?: number;
    high_24h?: number;
    low_24h?: number;
    updated_at?: string;
    time?: string;
    source?: string;
    ctrader_environment?: string;
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
  evidence_coverage?: EvidenceCoverageInfo;
  outcome?: {
    price_after_15m?: number;
    price_after_1h?: number;
    price_after_4h?: number;
    price_after_1d?: number;
    pnl_pip_15m?: number;
    pnl_pip_1h?: number;
    pnl_pip_4h?: number;
    pnl_pip_1d?: number;
    win_15m?: boolean;
    win_1h?: boolean;
    win_4h?: boolean;
    win_1d?: boolean;
    pnl_pip?: number;
    win?: boolean;
  } | null;
  outcomeStatus?: 'PENDING' | 'RESOLVED';
  dataProvenance?: {
    classification: 'REAL' | 'DERIVED' | 'SYNTHETIC';
    source: string;
    sourceTimestamp: string;
    receivedAt: string;
    freshness: string;
    isSynthetic: boolean;
  };
}

export type OpportunityStatus =
  | 'LIVE'
  | 'WAITING FOR LIVE DATA'
  | 'INSUFFICIENT MARKET DATA'
  | 'STALE'
  | 'DISCONNECTED';

export interface OpportunityItem {
  symbol: string;
  displayName: string;
  action: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  currentBid: number;
  currentAsk: number;
  spread: number;
  timeframe: string;
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
  riskPercent: string;
  riskReward: string;
  technicalEvidence: string;
  marketStructureEvidence: string;
  liquidityEvidence: string;
  macroEvidence: string;
  riskAssessment: string;
  timestamp: string;
  dataProvenance: string;
  decisionId: string;
  status: OpportunityStatus;
  reason?: string;
}

export interface OpportunityScannerResponse {
  timestamp: string;
  totalSymbols: number;
  opportunities: OpportunityItem[];
}

