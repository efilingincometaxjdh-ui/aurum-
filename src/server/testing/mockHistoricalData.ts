import { HistoricalObservation, DecisionState, PermissionState } from '../../types.js';

// Seedable pseudo-random number generator to ensure deterministic and stable mock data walks
export function seedRandom(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Outcome Measurement Engine (Isolated for testing/replays)
 * Calculates the multi-horizon outcomes (+15m, +1h, +4h, +1D) for an entry price and trading decision.
 */
export class OutcomeMeasurementEngine {
  public static calculateOutcome(
    entryPrice: number,
    decision: DecisionState,
    permission: PermissionState,
    seedStr: string
  ) {
    const rand = seedRandom(seedStr);
    
    // CTrader Gold pip definition: $0.10 price move = 1 pip
    const pipScale = 10; 

    // Compute standard gold drift and volatility ranges for each timeframe
    // 15m = 0.25h, 1h = 1.0h, 4h = 4.0h, 1D = 24.0h
    const horizons = [0.25, 1.0, 4.0, 24.0];
    const prices: number[] = [];

    for (const h of horizons) {
      // Gold average hourly volatility of ~$8.00 USD
      const volatility = 8.0 * Math.sqrt(h); 
      const noise = (rand() - 0.5) * 2.0 * volatility;
      
      let drift = 0;
      const canBuy = permission === 'ALLOW_BUYS' || permission === 'ALLOW_BOTH';
      const canSell = permission === 'ALLOW_SELLS' || permission === 'ALLOW_BOTH';
      
      if (canBuy && decision.includes('BULLISH')) {
        drift = volatility * 0.40; // positive drift for buy setups
      } else if (canSell && decision.includes('BEARISH')) {
        drift = -volatility * 0.40; // negative drift for sell setups
      } else {
        // Blocked or caution trade has random mean-reverting noise
        drift = -noise * 0.1;
      }

      const finalPrice = Number((entryPrice + drift + noise).toFixed(2));
      prices.push(finalPrice);
    }

    const [price_15m, price_1h, price_4h, price_1d] = prices;

    // Calculate PnL and Win/Loss flags for each horizon based on decision direction
    let pnl_pip_15m = 0;
    let pnl_pip_1h = 0;
    let pnl_pip_4h = 0;
    let pnl_pip_1d = 0;

    const isBuy = decision.includes('BULLISH');
    const isSell = decision.includes('BEARISH');
    const isPermitted = permission.startsWith('ALLOW');

    if (isPermitted) {
      if (isBuy) {
        pnl_pip_15m = Math.round((price_15m - entryPrice) * pipScale);
        pnl_pip_1h = Math.round((price_1h - entryPrice) * pipScale);
        pnl_pip_4h = Math.round((price_4h - entryPrice) * pipScale);
        pnl_pip_1d = Math.round((price_1d - entryPrice) * pipScale);
      } else if (isSell) {
        pnl_pip_15m = Math.round((entryPrice - price_15m) * pipScale);
        pnl_pip_1h = Math.round((entryPrice - price_1h) * pipScale);
        pnl_pip_4h = Math.round((entryPrice - price_4h) * pipScale);
        pnl_pip_1d = Math.round((entryPrice - price_1d) * pipScale);
      }
    }

    const win_15m = pnl_pip_15m >= 0;
    const win_1h = pnl_pip_1h >= 0;
    const win_4h = pnl_pip_4h >= 0;
    const win_1d = pnl_pip_1d >= 0;

    return {
      price_after_15m: price_15m,
      price_after_1h: price_1h,
      price_after_4h: price_4h,
      price_after_1d: price_1d,
      pnl_pip_15m,
      pnl_pip_1h,
      pnl_pip_4h,
      pnl_pip_1d,
      win_15m,
      win_1h,
      win_4h,
      win_1d,
      pnl_pip: pnl_pip_4h, // Default consolidated outcome maps to 4-hour horizon
      win: win_4h
    };
  }
}

/**
 * Generate a deterministic historical dataset of 45 observations spanning the past 30 days
 */
export function generateHistoricalDataset(): HistoricalObservation[] {
  const dataset: HistoricalObservation[] = [];
  const now = Date.now();
  const hourMs = 3600000;
  const rand = seedRandom('aurum_deterministic_seed_v4');

  const decisions: DecisionState[] = [
    'STRONG_BULLISH', 'BULLISH', 'NEUTRAL', 'BEARISH', 'STRONG_BEARISH', 'NO_TRADE'
  ];
  
  const permissions: PermissionState[] = [
    'ALLOW_BUYS', 'ALLOW_BUYS', 'BLOCK_TRADING', 'ALLOW_SELLS', 'ALLOW_SELLS', 'BLOCK_TRADING'
  ];

  const risks = ['LOW', 'LOW', 'MEDIUM', 'LOW', 'LOW', 'HIGH'];

  let currentPrice = 2820.50;

  for (let i = 45; i >= 1; i--) {
    // Walk the base gold price realistically over time
    const priceDrift = (rand() - 0.48) * 15.0;
    currentPrice = Number((currentPrice + priceDrift).toFixed(2));

    const offsetHours = i * 16 + (rand() * 4); // Spread observations over the past 30 days
    const timestamp = new Date(now - offsetHours * hourMs).toISOString();
    const id = `obs-replay-2026-${String(100 - i).padStart(2, '0')}`;

    const decIdx = Math.floor(rand() * decisions.length);
    const decision = decisions[decIdx];
    const permission = permissions[decIdx];
    const risk = risks[decIdx] as any;
    const confidence = decision.includes('STRONG') ? Math.round(80 + rand() * 15) : (decision === 'NEUTRAL' || decision === 'NO_TRADE' ? Math.round(30 + rand() * 20) : Math.round(60 + rand() * 18));

    // Calculate outcomes for the observation
    const outcome = OutcomeMeasurementEngine.calculateOutcome(currentPrice, decision, permission, id);

    dataset.push({
      id,
      timestamp,
      price: currentPrice,
      decision,
      permission,
      confidence,
      risk,
      evidence_coverage: {
        score: confidence > 50 ? 100 : 75,
        health: confidence > 50 ? 'FULL_COVERAGE' : 'PARTIAL_COVERAGE',
        missing: confidence > 50 ? [] : ['MISSING_SENTIMENT_DATA'],
        flags: ['CTRADER_SPOT_QUOTE_VALIDATED', 'MULTI_TIMEFRAME_INDICATORS_COMPUTED', 'MACRO_RSS_SYNCHRONIZED', 'SENTIMENT_FEED_VALIDATED']
      },
      outcome,
      dataProvenance: {
        classification: 'SYNTHETIC',
        source: 'Deterministic Walk Engine',
        sourceTimestamp: timestamp,
        receivedAt: timestamp,
        freshness: 'STALE',
        isSynthetic: true
      }
    });
  }

  return dataset;
}
