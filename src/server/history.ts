import { HistoricalObservation } from '../types.js';

export function getHistoricalObservations(): HistoricalObservation[] {
  const now = Date.now();
  const dayMs = 86400000;

  return [
    {
      id: 'obs-2026-08-05-01',
      timestamp: new Date(now - 1 * dayMs).toISOString(),
      price: 2854.20,
      decision: 'BULLISH',
      permission: 'ALLOW_BUYS',
      confidence: 78,
      risk: 'LOW',
      outcome: {
        price_after_1h: 2861.50,
        price_after_4h: 2868.80,
        pnl_pip: 146,
        win: true
      }
    },
    {
      id: 'obs-2026-08-04-02',
      timestamp: new Date(now - 2 * dayMs).toISOString(),
      price: 2842.10,
      decision: 'STRONG_BULLISH',
      permission: 'ALLOW_BUYS',
      confidence: 85,
      risk: 'LOW',
      outcome: {
        price_after_1h: 2849.30,
        price_after_4h: 2855.40,
        pnl_pip: 133,
        win: true
      }
    },
    {
      id: 'obs-2026-08-03-03',
      timestamp: new Date(now - 3 * dayMs).toISOString(),
      price: 2860.00,
      decision: 'NO_TRADE',
      permission: 'BLOCK_TRADING',
      confidence: 40,
      risk: 'HIGH',
      outcome: {
        price_after_1h: 2852.10,
        price_after_4h: 2838.00,
        pnl_pip: 0,
        win: true // Filtered out loss by fail-closed contract
      }
    },
    {
      id: 'obs-2026-08-02-04',
      timestamp: new Date(now - 4 * dayMs).toISOString(),
      price: 2835.40,
      decision: 'BEARISH',
      permission: 'ALLOW_SELLS',
      confidence: 68,
      risk: 'LOW',
      outcome: {
        price_after_1h: 2829.10,
        price_after_4h: 2822.00,
        pnl_pip: 134,
        win: true
      }
    },
    {
      id: 'obs-2026-08-01-05',
      timestamp: new Date(now - 5 * dayMs).toISOString(),
      price: 2820.80,
      decision: 'BULLISH',
      permission: 'CAUTION',
      confidence: 52,
      risk: 'MEDIUM',
      outcome: {
        price_after_1h: 2822.00,
        price_after_4h: 2818.50,
        pnl_pip: -23,
        win: false
      }
    }
  ];
}

export function getHistoryAnalytics() {
  const observations = getHistoricalObservations();
  const total = observations.length;
  const tradesPermitted = observations.filter(o => o.permission === 'ALLOW_BUYS' || o.permission === 'ALLOW_SELLS' || o.permission === 'ALLOW_BOTH').length;
  const tradesBlocked = observations.filter(o => o.permission === 'BLOCK_TRADING' || o.permission === 'CAUTION').length;
  const wins = observations.filter(o => o.outcome?.win && (o.permission.startsWith('ALLOW'))).length;
  const winRate = tradesPermitted > 0 ? Number(((wins / tradesPermitted) * 100).toFixed(1)) : 0;
  const totalPipGain = observations.reduce((acc, o) => acc + (o.outcome?.pnl_pip || 0), 0);

  return {
    total_observations: total,
    trades_permitted: tradesPermitted,
    trades_blocked: tradesBlocked,
    win_rate_percent: winRate,
    total_pip_gain: totalPipGain,
    observations
  };
}
