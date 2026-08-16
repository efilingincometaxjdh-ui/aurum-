import { CTraderCandle } from './CTraderClient.js';

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

/**
 * Institutional Market Structure and Smart Money Concepts (SMC) Engine for XAU/USD
 */
export class MarketStructureEngine {
  /**
   * Run full structural analysis on a series of historical candles
   */
  public static analyze(candles: CTraderCandle[], timeframe: string): MarketStructureData {
    if (!candles || candles.length < 10) {
      return this.createEmptyData(timeframe);
    }

    const count = candles.length;
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    // 1. Swing High / Swing Low Detection (Window = 3)
    const swings: MarketStructureData['swings'] = [];
    const windowSize = 2; // Left 2 and Right 2 must be lower (for Highs) or higher (for Lows)

    for (let i = windowSize; i < count - windowSize; i++) {
      const currentHigh = highs[i];
      const currentLow = lows[i];

      // Check Swing High
      let isSwingHigh = true;
      for (let w = 1; w <= windowSize; w++) {
        if (highs[i - w] >= currentHigh || highs[i + w] > currentHigh) {
          isSwingHigh = false;
          break;
        }
      }

      // Check Swing Low
      let isSwingLow = true;
      for (let w = 1; w <= windowSize; w++) {
        if (lows[i - w] <= currentLow || lows[i + w] < currentLow) {
          isSwingLow = false;
          break;
        }
      }

      if (isSwingHigh) {
        // Determine HH vs LH
        const lastHigh = swings.filter(s => s.type === 'HH' || s.type === 'LH' || s.type === 'High').pop();
        let type: 'HH' | 'LH' | 'High' = 'High';
        if (lastHigh) {
          type = currentHigh > lastHigh.price ? 'HH' : 'LH';
        }
        swings.push({
          type,
          price: Number(currentHigh.toFixed(2)),
          index: i,
          timestamp: new Date(candles[i].timestamp).toISOString()
        });
      } else if (isSwingLow) {
        // Determine HL vs LL
        const lastLow = swings.filter(s => s.type === 'HL' || s.type === 'LL' || s.type === 'Low').pop();
        let type: 'HL' | 'LL' | 'Low' = 'Low';
        if (lastLow) {
          type = currentLow < lastLow.price ? 'LL' : 'HL';
        }
        swings.push({
          type,
          price: Number(currentLow.toFixed(2)),
          index: i,
          timestamp: new Date(candles[i].timestamp).toISOString()
        });
      }
    }

    // 2. BOS / CHoCH Detection
    const bos: MarketStructureData['bos'] = [];
    const choch: MarketStructureData['choch'] = [];
    
    let activeStructure: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let lastSwingHigh: number | null = null;
    let lastSwingLow: number | null = null;

    for (let i = 0; i < swings.length; i++) {
      const sw = swings[i];
      if (sw.type === 'HH' || sw.type === 'LH' || sw.type === 'High') {
        lastSwingHigh = sw.price;
      } else {
        lastSwingLow = sw.price;
      }
    }

    // Scan candle series for breaks
    for (let i = 5; i < count; i++) {
      const currentClose = closes[i];
      const candleTime = new Date(candles[i].timestamp).toISOString();

      if (lastSwingHigh !== null && currentClose > lastSwingHigh) {
        const isChoch = activeStructure === 'BEARISH';
        if (isChoch) {
          choch.push({
            type: 'CHOCH_BULLISH',
            price: lastSwingHigh,
            timestamp: candleTime,
            confirmed: true
          });
          activeStructure = 'BULLISH';
        } else {
          bos.push({
            type: 'BOS_BULLISH',
            price: lastSwingHigh,
            timestamp: candleTime,
            confirmed: true
          });
          activeStructure = 'BULLISH';
        }
        lastSwingHigh = null; // consumed
      } else if (lastSwingLow !== null && currentClose < lastSwingLow) {
        const isChoch = activeStructure === 'BULLISH';
        if (isChoch) {
          choch.push({
            type: 'CHOCH_BEARISH',
            price: lastSwingLow,
            timestamp: candleTime,
            confirmed: true
          });
          activeStructure = 'BEARISH';
        } else {
          bos.push({
            type: 'BOS_BEARISH',
            price: lastSwingLow,
            timestamp: candleTime,
            confirmed: true
          });
          activeStructure = 'BEARISH';
        }
        lastSwingLow = null; // consumed
      }

      // Update current swing high/low levels as we iterate
      const swingAtI = swings.find(s => s.index === i);
      if (swingAtI) {
        if (swingAtI.type === 'HH' || swingAtI.type === 'LH' || swingAtI.type === 'High') {
          lastSwingHigh = swingAtI.price;
        } else {
          lastSwingLow = swingAtI.price;
        }
      }
    }

    // 3. Order Block Detection
    const orderBlocks: MarketStructureData['orderBlocks'] = [];
    const minOBVolumeMultiplier = 1.2;

    // Calculate moving average of volume
    let totalVolume = 0;
    for (let i = 0; i < count; i++) {
      totalVolume += candles[i].volume;
    }
    const avgVolume = totalVolume / (count || 1);

    for (let i = 3; i < count - 2; i++) {
      const cCurrent = candles[i];
      const cNext = candles[i + 1];
      const isBullishExpansion = cNext.close > cCurrent.high && cNext.volume > avgVolume * minOBVolumeMultiplier;
      const isBearishExpansion = cNext.close < cCurrent.low && cNext.volume > avgVolume * minOBVolumeMultiplier;

      if (isBullishExpansion && cCurrent.close < cCurrent.open) {
        // Potential Bullish Order Block (last down-close before move)
        // Check mitigation (does any future candle low cross below this block low?)
        let mitigated = false;
        for (let j = i + 2; j < count; j++) {
          if (candles[j].low < cCurrent.low) {
            mitigated = true;
            break;
          }
        }
        orderBlocks.push({
          type: 'BULLISH',
          open: Number(cCurrent.open.toFixed(2)),
          high: Number(cCurrent.high.toFixed(2)),
          low: Number(cCurrent.low.toFixed(2)),
          close: Number(cCurrent.close.toFixed(2)),
          timestamp: new Date(cCurrent.timestamp).toISOString(),
          volume: cCurrent.volume,
          mitigated
        });
      } else if (isBearishExpansion && cCurrent.close > cCurrent.open) {
        // Potential Bearish Order Block (last up-close before move)
        let mitigated = false;
        for (let j = i + 2; j < count; j++) {
          if (candles[j].high > cCurrent.high) {
            mitigated = true;
            break;
          }
        }
        orderBlocks.push({
          type: 'BEARISH',
          open: Number(cCurrent.open.toFixed(2)),
          high: Number(cCurrent.high.toFixed(2)),
          low: Number(cCurrent.low.toFixed(2)),
          close: Number(cCurrent.close.toFixed(2)),
          timestamp: new Date(cCurrent.timestamp).toISOString(),
          volume: cCurrent.volume,
          mitigated
        });
      }
    }

    // 4. Fair Value Gap (FVG) Detection
    const fvgs: MarketStructureData['fvgs'] = [];
    for (let i = 2; i < count; i++) {
      const c1 = candles[i - 2];
      const c2 = candles[i - 1];
      const c3 = candles[i];

      // Bullish FVG (Gap upwards between candle 1 high and candle 3 low)
      if (c3.low > c1.high && c2.close > c2.open) {
        let mitigated = false;
        for (let j = i + 1; j < count; j++) {
          if (candles[j].low <= c1.high) {
            mitigated = true;
            break;
          }
        }
        fvgs.push({
          type: 'BULLISH',
          top: Number(c3.low.toFixed(2)),
          bottom: Number(c1.high.toFixed(2)),
          candle1Index: i - 2,
          candle3Index: i,
          mitigated,
          timestamp: new Date(c2.timestamp).toISOString()
        });
      }

      // Bearish FVG (Gap downwards between candle 1 low and candle 3 high)
      if (c3.high < c1.low && c2.close < c2.open) {
        let mitigated = false;
        for (let j = i + 1; j < count; j++) {
          if (candles[j].high >= c1.low) {
            mitigated = true;
            break;
          }
        }
        fvgs.push({
          type: 'BEARISH',
          top: Number(c1.low.toFixed(2)),
          bottom: Number(c3.high.toFixed(2)),
          candle1Index: i - 2,
          candle3Index: i,
          mitigated,
          timestamp: new Date(c2.timestamp).toISOString()
        });
      }
    }

    // 5. Liquidity & Liquidity Sweep Analysis
    const equalHighs: MarketStructureData['liquidity']['equalHighs'] = [];
    const equalLows: MarketStructureData['liquidity']['equalLows'] = [];
    const sweeps: MarketStructureData['liquidity']['sweeps'] = [];

    const pipSize = 0.50; // gold pip/spread deviation threshold
    const swingHighs = swings.filter(s => s.type === 'HH' || s.type === 'LH' || s.type === 'High');
    const swingLows = swings.filter(s => s.type === 'HL' || s.type === 'LL' || s.type === 'Low');

    // Group equal highs
    for (let i = 0; i < swingHighs.length; i++) {
      const sh1 = swingHighs[i];
      const matches: number[] = [sh1.index];
      for (let j = i + 1; j < swingHighs.length; j++) {
        const sh2 = swingHighs[j];
        if (Math.abs(sh1.price - sh2.price) <= pipSize) {
          matches.push(sh2.index);
        }
      }
      if (matches.length >= 2) {
        equalHighs.push({ price: sh1.price, indexes: matches });
      }
    }

    // Group equal lows
    for (let i = 0; i < swingLows.length; i++) {
      const sl1 = swingLows[i];
      const matches: number[] = [sl1.index];
      for (let j = i + 1; j < swingLows.length; j++) {
        const sl2 = swingLows[j];
        if (Math.abs(sl1.price - sl2.price) <= pipSize) {
          matches.push(sl2.index);
        }
      }
      if (matches.length >= 2) {
        equalLows.push({ price: sl1.price, indexes: matches });
      }
    }

    // Detect Liquidity sweeps
    for (let i = 5; i < count; i++) {
      const candle = candles[i];
      // Bullish Sweep: Price high exceeded a previous swing high but closed below it
      for (const sh of swingHighs) {
        if (sh.index < i && i - sh.index < 30) {
          if (candle.high > sh.price && candle.close < sh.price && candle.open < sh.price) {
            sweeps.push({
              type: 'SWEEP_HIGH',
              sweepPrice: Number(candle.high.toFixed(2)),
              triggerPrice: sh.price,
              timestamp: new Date(candle.timestamp).toISOString()
            });
            break;
          }
        }
      }

      // Bearish Sweep: Price low exceeded a previous swing low but closed above it
      for (const sl of swingLows) {
        if (sl.index < i && i - sl.index < 30) {
          if (candle.low < sl.price && candle.close > sl.price && candle.open > sl.price) {
            sweeps.push({
              type: 'SWEEP_LOW',
              sweepPrice: Number(candle.low.toFixed(2)),
              triggerPrice: sl.price,
              timestamp: new Date(candle.timestamp).toISOString()
            });
            break;
          }
        }
      }
    }

    // 6. Institutional Context (Premium/Discount, Imbalance, Session)
    const sortedCloses = [...closes].sort((a, b) => a - b);
    const lowPrice = sortedCloses[0];
    const highPrice = sortedCloses[sortedCloses.length - 1];
    const rangeHeight = highPrice - lowPrice || 1;
    const currentPrice = closes[closes.length - 1];

    const dealingRange = { low: lowPrice, high: highPrice };
    const pricePosition = (currentPrice - lowPrice) / rangeHeight;
    let pricingZone: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM' = 'EQUILIBRIUM';
    if (pricePosition > 0.52) pricingZone = 'PREMIUM';
    else if (pricePosition < 0.48) pricingZone = 'DISCOUNT';

    // Imbalance ratio calculation
    const totalFvgImbalance = fvgs
      .filter(f => !f.mitigated)
      .reduce((acc, f) => acc + Math.abs(f.top - f.bottom), 0);
    const imbalanceRatio = Number((totalFvgImbalance / rangeHeight).toFixed(3));

    // Session detection (UTC)
    const lastCandleDate = new Date(candles[count - 1].timestamp);
    const hours = lastCandleDate.getUTCHours();
    let currentSession: 'ASIA' | 'LONDON' | 'NEWYORK' | 'GAP' = 'GAP';
    if (hours >= 0 && hours < 8) currentSession = 'ASIA';
    else if (hours >= 8 && hours < 13) currentSession = 'LONDON';
    else if (hours >= 13 && hours < 21) currentSession = 'NEWYORK';

    // 7. Regime Classifier (ATR, Trend, Volatility)
    let totalATR = 0;
    for (let i = 1; i < count; i++) {
      totalATR += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    }
    const currentATR = totalATR / (count - 1 || 1);

    const isTrendBullish = activeStructure === 'BULLISH';
    const isTrendBearish = activeStructure === 'BEARISH';

    let classification: MarketStructureData['regime']['classification'] = 'RANGING';
    let strength = 50;

    if (currentATR > rangeHeight * 0.15) {
      classification = 'HIGH_VOLATILITY';
      strength = 80;
    } else if (currentATR < rangeHeight * 0.03) {
      classification = 'LOW_VOLATILITY';
      strength = 35;
    } else if (isTrendBullish) {
      classification = 'TRENDING_BULLISH';
      strength = 75;
    } else if (isTrendBearish) {
      classification = 'TRENDING_BEARISH';
      strength = 75;
    }

    return {
      timeframe,
      swings: swings.slice(-10),
      bos: bos.slice(-5),
      choch: choch.slice(-5),
      orderBlocks: orderBlocks.slice(-10),
      fvgs: fvgs.slice(-15),
      liquidity: {
        equalHighs: equalHighs.slice(-5),
        equalLows: equalLows.slice(-5),
        sweeps: sweeps.slice(-5)
      },
      context: {
        dealingRange,
        pricingZone,
        currentSession,
        imbalanceRatio
      },
      regime: {
        classification,
        volatilityIndex: Number((currentATR / (rangeHeight / 50 || 1)).toFixed(2)),
        strength
      }
    };
  }

  private static createEmptyData(timeframe: string): MarketStructureData {
    return {
      timeframe,
      swings: [],
      bos: [],
      choch: [],
      orderBlocks: [],
      fvgs: [],
      liquidity: { equalHighs: [], equalLows: [], sweeps: [] },
      context: {
        dealingRange: { low: 0, high: 0 },
        pricingZone: 'EQUILIBRIUM',
        currentSession: 'GAP',
        imbalanceRatio: 0
      },
      regime: {
        classification: 'RANGING',
        volatilityIndex: 1.0,
        strength: 50
      }
    };
  }
}
