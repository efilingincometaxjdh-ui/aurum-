import {
  Agent02State,
  Agent03State,
  Agent04State,
  Agent05State,
  Agent06State,
  DecisionState,
  NewsRisk,
  PermissionState,
  Timeframe,
  TraderViewSnapshot
} from '../types.js';

// Weight mapping for technical timeframes: H4=4, H1=3, M15=2, M5=1
const TIMEFRAME_WEIGHTS: Record<Timeframe, number> = {
  H4: 4,
  H1: 3,
  M15: 2,
  M5: 1
};

export function evaluateAgent04(macro: Agent03State['data'], technical: Agent02State['data']): Agent04State {
  const generated_at = new Date().toISOString();

  // Validate inputs
  if (!macro || !technical) {
    return {
      agent: 'Agent04',
      version: '1.0',
      generated_at,
      status: 'FAILED',
      data: {
        decision: 'NO_TRADE',
        confidence: 0,
        risk: 'EXTREME',
        reasons: ['Missing macro or technical intelligence input.']
      }
    };
  }

  const news_risk = (macro.news_risk || 'HIGH') as NewsRisk;
  const gold_bias = macro.gold_bias || 'NEUTRAL';

  // Fail-closed on EXTREME news risk
  if (news_risk === 'EXTREME') {
    return {
      agent: 'Agent04',
      version: '1.0',
      generated_at,
      status: 'SUCCESS',
      data: {
        decision: 'NO_TRADE',
        confidence: 100,
        risk: 'EXTREME',
        reasons: ['Extreme macro news risk. Fail-closed engaged.']
      }
    };
  }

  const reasons: string[] = [];
  let score = 50;

  // Macro bias evaluation
  if (gold_bias === 'BULLISH') {
    score += 15;
    reasons.push('Macro supports Gold (BULLISH)');
  } else if (gold_bias === 'BEARISH') {
    score -= 15;
    reasons.push('Macro bearish for Gold (BEARISH)');
  } else {
    reasons.push('Macro bias is Neutral');
  }

  // Multi-timeframe fusion weighting
  let totalWeight = 0;
  let weightedBullish = 0;
  let weightedBearish = 0;
  const usableTimeframes: Timeframe[] = [];
  const timeframeTrends: Record<string, string> = {};

  const timeframes: Timeframe[] = ['H4', 'H1', 'M15', 'M5'];
  for (const tf of timeframes) {
    const tfData = technical[tf];
    if (tfData && tfData.trend) {
      usableTimeframes.push(tf);
      const w = TIMEFRAME_WEIGHTS[tf];
      totalWeight += w;
      timeframeTrends[tf] = tfData.trend;
      if (tfData.trend === 'Bullish') {
        weightedBullish += w;
      } else if (tfData.trend === 'Bearish') {
        weightedBearish += w;
      }
    }
  }

  if (totalWeight > 0) {
    if (weightedBullish > weightedBearish) {
      score += 15;
      reasons.push(`Weighted multi-timeframe trend is Bullish (${weightedBullish}/${totalWeight} weight)`);
    } else if (weightedBearish > weightedBullish) {
      score -= 15;
      reasons.push(`Weighted multi-timeframe trend is Bearish (${weightedBearish}/${totalWeight} weight)`);
    } else {
      reasons.push('Multi-timeframe trend is balanced/neutral');
    }
  } else {
    reasons.push('No usable technical timeframes available');
  }

  // Technical EMA / Indicators on primary timeframe (H1 or M5)
  const primaryTf = technical.H1 || technical.M5;
  if (primaryTf) {
    if (primaryTf.ema20 && primaryTf.ema50) {
      if (primaryTf.ema20 > primaryTf.ema50) {
        score += 10;
        reasons.push(`EMA20 (${primaryTf.ema20}) > EMA50 (${primaryTf.ema50}) alignment`);
      } else if (primaryTf.ema20 < primaryTf.ema50) {
        score -= 10;
        reasons.push(`EMA20 (${primaryTf.ema20}) < EMA50 (${primaryTf.ema50}) cross bearish`);
      }
    }

    if (primaryTf.adx !== undefined) {
      if (primaryTf.adx >= 25) {
        score += 5;
        reasons.push(`Strong trend confirmed (ADX ${primaryTf.adx} ≥ 25)`);
      } else {
        reasons.push(`Weak trend intensity (ADX ${primaryTf.adx} < 25)`);
      }
    }

    if (primaryTf.rsi !== undefined) {
      if (primaryTf.rsi > 70) {
        score -= 5;
        reasons.push(`RSI (${primaryTf.rsi}) overbought zone`);
      } else if (primaryTf.rsi < 30) {
        score += 5;
        reasons.push(`RSI (${primaryTf.rsi}) oversold zone`);
      }
    }
  }

  score = Math.max(0, Math.min(score, 100));

  let decision: DecisionState;
  if (score >= 80) {
    decision = 'STRONG_BULLISH';
  } else if (score >= 65) {
    decision = 'BULLISH';
  } else if (score >= 45) {
    decision = 'NEUTRAL';
  } else if (score >= 25) {
    decision = 'BEARISH';
  } else {
    decision = 'STRONG_BEARISH';
  }

  // Calculate alignment & conflict ratios
  const bullishVotes = usableTimeframes.filter(tf => technical[tf]?.trend === 'Bullish').length;
  const bearishVotes = usableTimeframes.filter(tf => technical[tf]?.trend === 'Bearish').length;
  const neutralVotes = usableTimeframes.filter(tf => technical[tf]?.trend === 'Neutral').length;

  const conflictRatio = (bullishVotes + bearishVotes) > 0 ? Math.min(bullishVotes, bearishVotes) / (bullishVotes + bearishVotes) : 0;
  const alignmentState = conflictRatio < 0.2 ? 'ALIGNED' : conflictRatio < 0.4 ? 'NEUTRAL' : 'CONFLICT';

  return {
    agent: 'Agent04',
    version: '1.0',
    generated_at,
    status: 'SUCCESS',
    data: {
      decision,
      confidence: score,
      risk: news_risk,
      reasons
    },
    metadata: {
      technical_fusion: {
        usable_timeframes: usableTimeframes,
        trend_votes: {
          bullish: bullishVotes,
          bearish: bearishVotes,
          neutral: neutralVotes
        },
        alignment: {
          state: alignmentState,
          higher_timeframe_conflict: Boolean(technical.H4?.trend !== technical.H1?.trend),
          lower_timeframe_conflict: Boolean(technical.M15?.trend !== technical.M5?.trend),
          cross_group_conflict: conflictRatio >= 0.3,
          timeframe_trends: timeframeTrends
        }
      }
    }
  };
}

export function evaluateAgent05(decisionData: Agent04State['data'], minConfidence: number = 55): Agent05State {
  const generated_at = new Date().toISOString();

  if (!decisionData || typeof decisionData !== 'object') {
    return {
      agent: 'Agent05',
      version: '1.0',
      generated_at,
      status: 'FAILED',
      data: {
        permission: 'BLOCK_TRADING',
        reason: 'Invalid decision state received from Agent 04.',
        minimum_confidence_required: minConfidence
      }
    };
  }

  const { decision, risk, confidence } = decisionData;

  if (decision === 'NO_TRADE') {
    return {
      agent: 'Agent05',
      version: '1.0',
      generated_at,
      status: 'SUCCESS',
      data: {
        permission: 'BLOCK_TRADING',
        reason: 'Decision engine issued NO_TRADE.',
        minimum_confidence_required: minConfidence
      }
    };
  }

  if (risk === 'EXTREME') {
    return {
      agent: 'Agent05',
      version: '1.0',
      generated_at,
      status: 'SUCCESS',
      data: {
        permission: 'BLOCK_TRADING',
        reason: 'Extreme news risk detected.',
        minimum_confidence_required: minConfidence
      }
    };
  }

  if (confidence < minConfidence) {
    return {
      agent: 'Agent05',
      version: '1.0',
      generated_at,
      status: 'SUCCESS',
      data: {
        permission: 'CAUTION',
        reason: `Decision confidence ${confidence}% is below safety gate requirement of ${minConfidence}%.`,
        minimum_confidence_required: minConfidence
      }
    };
  }

  let permission: PermissionState;
  let reason: string;

  switch (decision) {
    case 'STRONG_BULLISH':
      permission = 'ALLOW_BUYS';
      reason = 'Strong bullish environment confirmed by multi-timeframe intelligence.';
      break;
    case 'BULLISH':
      permission = 'ALLOW_BUYS';
      reason = 'Bullish market environment.';
      break;
    case 'NEUTRAL':
      permission = 'ALLOW_BOTH';
      reason = 'Neutral market context. Range-bound trading allowed with strict risk limits.';
      break;
    case 'BEARISH':
      permission = 'ALLOW_SELLS';
      reason = 'Bearish market environment.';
      break;
    case 'STRONG_BEARISH':
      permission = 'ALLOW_SELLS';
      reason = 'Strong bearish environment confirmed by multi-timeframe intelligence.';
      break;
    default:
      permission = 'BLOCK_TRADING';
      reason = 'Unknown decision state.';
  }

  return {
    agent: 'Agent05',
    version: '1.0',
    generated_at,
    status: 'SUCCESS',
    data: {
      permission,
      reason,
      minimum_confidence_required: minConfidence
    }
  };
}

export function evaluateAgent06(permissionState: Agent05State, upstreamStatuses: Record<string, 'SUCCESS' | 'DEGRADED' | 'FAILED'>): Agent06State {
  const generated_at = new Date().toISOString();
  const permData = permissionState.data;

  return {
    agent: 'Agent06',
    version: '1.0',
    generated_at,
    status: 'SUCCESS',
    data: {
      permission: permData.permission,
      reason: permData.reason,
      fresh: true,
      upstream_status: upstreamStatuses,
      execution_enabled: false // ALWAYS FALSE by contract (read-only alert boundary)
    }
  };
}

export function buildTraderViewSnapshot(
  alertState: Agent06State,
  decisionState: Agent04State,
  macroState: Agent03State,
  technicalState?: Agent02State,
  symbolOverride?: string
): TraderViewSnapshot {
  const alertData = alertState.data;
  const decisionData = decisionState.data;
  const fusion = decisionState.metadata?.technical_fusion;
  const macroData = macroState.data;

  const symbol = symbolOverride || technicalState?.metadata?.symbol || 'XAUUSD';

  // The trader view is strictly read-only and never enables execution authority
  const permission = alertData.permission === 'BLOCK_TRADING' || alertData.execution_enabled ? 'BLOCK_TRADING' : alertData.permission;

  const votes = fusion?.trend_votes || { bullish: 0, bearish: 0, neutral: 0 };
  const total = votes.bullish + votes.bearish;
  const conflictRatio = total > 0 ? Math.min(votes.bullish, votes.bearish) / total : 0;

  let conflict: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (conflictRatio >= 0.40) conflict = 'HIGH';
  else if (conflictRatio >= 0.20) conflict = 'MEDIUM';

  const alignmentState = fusion?.alignment?.state || 'NEUTRAL';

  // Compute Multi-Timeframe Confluence Score and Signal
  let confluenceScore = 50;
  let confluenceSignal: 'BULLISH' | 'BEARISH' | 'CONSOLIDATING' = 'CONSOLIDATING';
  let confluenceDesc = 'Highly fragmented structure with high timeframe conflict';

  if (technicalState?.data) {
    const tData = technicalState.data;
    const h4Trend = tData.H4?.trend;
    const h1Trend = tData.H1?.trend;
    const m15Trend = tData.M15?.trend;
    const m5Trend = tData.M5?.trend;

    if (h4Trend === 'Bullish' && h1Trend === 'Bullish') {
      if (m15Trend === 'Bullish' && m5Trend === 'Bullish') {
        confluenceScore = 100;
        confluenceSignal = 'BULLISH';
        confluenceDesc = 'Strong Multi-Timeframe Bullish Confluence across H4, H1, M15, M5';
      } else if (m15Trend === 'Bearish' || m5Trend === 'Bearish') {
        confluenceScore = 75;
        confluenceSignal = 'BULLISH';
        confluenceDesc = 'Bullish orderflow on H4/H1 with short-term bearish pullback on M15/M5';
      } else {
        confluenceScore = 85;
        confluenceSignal = 'BULLISH';
        confluenceDesc = 'Aggressive bullish structural continuation across higher timeframes';
      }
    } else if (h4Trend === 'Bearish' && h1Trend === 'Bearish') {
      if (m15Trend === 'Bearish' && m5Trend === 'Bearish') {
        confluenceScore = 100;
        confluenceSignal = 'BEARISH';
        confluenceDesc = 'Strong Multi-Timeframe Bearish Confluence across H4, H1, M15, M5';
      } else if (m15Trend === 'Bullish' || m5Trend === 'Bullish') {
        confluenceScore = 75;
        confluenceSignal = 'BEARISH';
        confluenceDesc = 'Bearish orderflow on H4/H1 with short-term bullish retracement on M15/M5';
      } else {
        confluenceScore = 85;
        confluenceSignal = 'BEARISH';
        confluenceDesc = 'Aggressive bearish structural continuation across higher timeframes';
      }
    } else {
      confluenceScore = 45;
      confluenceSignal = 'CONSOLIDATING';
      confluenceDesc = 'Mixed trend indicators across timeframes. High timeframe conflict observed.';
    }
  }

  // Compute dynamic Correlation coefficients for symbol
  const dxyVal = macroData.dxy_index || 99.76;
  const tnxVal = macroData.us10y_yield || 4.64;
  const macroScr = macroData.macro_score || 50;

  let correlations: Record<string, number> = {};
  if (symbol === 'XAUUSD') {
    correlations = {
      XAGUSD: Number((0.87 + (macroScr - 50) * 0.0015).toFixed(2)),
      DXY: Number((-0.83 - (dxyVal - 100) * 0.01).toFixed(2)),
      US10Y: Number((-0.72 - (tnxVal - 4.5) * 0.02).toFixed(2))
    };
  } else if (symbol === 'BTCUSD') {
    correlations = {
      ETHUSD: 0.91,
      DXY: Number((-0.65 - (dxyVal - 100) * 0.01).toFixed(2)),
      US10Y: -0.38
    };
  } else if (symbol === 'EURUSD') {
    correlations = {
      GBPUSD: 0.88,
      DXY: -0.96,
      US10Y: -0.52
    };
  } else if (symbol === 'GBPUSD') {
    correlations = {
      EURUSD: 0.88,
      DXY: -0.92,
      US10Y: -0.48
    };
  } else if (symbol === 'XAGUSD') {
    correlations = {
      XAUUSD: 0.87,
      DXY: -0.80,
      US10Y: -0.68
    };
  } else {
    correlations = {
      DXY: Number((-0.80 - (dxyVal - 100) * 0.01).toFixed(2)),
      US10Y: Number((-0.60 - (tnxVal - 4.5) * 0.02).toFixed(2))
    };
  }

  return {
    symbol,
    decision: decisionData.decision,
    permission,
    confidence: decisionData.confidence,
    risk: decisionData.risk,
    macro_bias: macroData.gold_bias,
    news_risk: macroData.news_risk,
    timeframes: fusion?.usable_timeframes || [],
    trend_votes: votes,
    timeframe_conflict: conflict,
    timeframe_alignment: alignmentState,
    timeframe_trends: fusion?.alignment?.timeframe_trends || {},
    higher_timeframe_conflict: Boolean(fusion?.alignment?.higher_timeframe_conflict),
    lower_timeframe_conflict: Boolean(fusion?.alignment?.lower_timeframe_conflict),
    cross_group_conflict: Boolean(fusion?.alignment?.cross_group_conflict),
    reasons: [...decisionData.reasons, alertData.reason],
    fresh: alertData.fresh,
    execution_enabled: false,
    mode: 'READ_ONLY',
    last_updated: new Date().toISOString(),
    correlations,
    multi_timeframe_confluence: {
      score: confluenceScore,
      signal: confluenceSignal,
      description: confluenceDesc
    }
  };
}
