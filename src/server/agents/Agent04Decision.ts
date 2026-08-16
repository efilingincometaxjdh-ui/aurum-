import { IAgent, AgentResult } from './IAgent.js';
import { Agent02State, Agent03State, Agent04State, DecisionState, NewsRisk, Timeframe } from '../../types.js';
import { logger } from '../utils/logger.js';

const TIMEFRAME_WEIGHTS: Record<Timeframe, number> = {
  H4: 4,
  H1: 3,
  M15: 2,
  M5: 1
};

export interface Agent04Input {
  macro: Agent03State['data'];
  technical: Agent02State['data'];
}

export class Agent04Decision implements IAgent<Agent04Input, Agent04State['data']> {
  readonly id = 'Agent04';
  readonly name = 'Decision Fusion Engine';
  readonly version = '1.0';

  async evaluate(input: Agent04Input, traceId: string): Promise<AgentResult<Agent04State['data']>> {
    const startTime = Date.now();
    logger.info('Evaluating Agent04 Decision Fusion Engine...', 'Agent04', traceId);

    const { macro, technical } = input;
    if (!macro || !technical) {
      return {
        agent: this.id,
        version: this.version,
        generated_at: new Date().toISOString(),
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
        agent: this.id,
        version: this.version,
        generated_at: new Date().toISOString(),
        status: 'SUCCESS',
        data: {
          decision: 'NO_TRADE',
          confidence: 100,
          risk: 'EXTREME',
          reasons: ['Extreme macro news risk detected. Fail-closed engaged.']
        }
      };
    }

    const reasons: string[] = [];
    let score = 50;

    if (gold_bias === 'BULLISH') {
      score += 15;
      reasons.push('Macro policy environment supports market asset (BULLISH)');
    } else if (gold_bias === 'BEARISH') {
      score -= 15;
      reasons.push('Macro policy environment opposes market asset (BEARISH)');
    } else {
      reasons.push('Macro bias is Neutral');
    }

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
        if (tfData.trend === 'Bullish') weightedBullish += w;
        else if (tfData.trend === 'Bearish') weightedBearish += w;
      }
    }

    if (totalWeight > 0) {
      if (weightedBullish > weightedBearish) {
        score += 15;
        reasons.push(`Weighted cTrader multi-timeframe trend is Bullish (${weightedBullish}/${totalWeight} weight)`);
      } else if (weightedBearish > weightedBullish) {
        score -= 15;
        reasons.push(`Weighted cTrader multi-timeframe trend is Bearish (${weightedBearish}/${totalWeight} weight)`);
      } else {
        reasons.push('cTrader multi-timeframe trend is balanced/neutral');
      }
    }

    const primaryTf = technical.H1 || technical.M5;
    if (primaryTf) {
      if (primaryTf.ema20 && primaryTf.ema50) {
        if (primaryTf.ema20 > primaryTf.ema50) {
          score += 10;
          reasons.push(`cTrader EMA20 (${primaryTf.ema20}) > EMA50 (${primaryTf.ema50}) alignment`);
        } else if (primaryTf.ema20 < primaryTf.ema50) {
          score -= 10;
          reasons.push(`cTrader EMA20 (${primaryTf.ema20}) < EMA50 (${primaryTf.ema50}) cross bearish`);
        }
      }

      if (primaryTf.adx !== undefined) {
        if (primaryTf.adx >= 25) {
          score += 5;
          reasons.push(`Strong trend intensity confirmed (ADX ${primaryTf.adx} ≥ 25)`);
        }
      }

      if (primaryTf.rsi !== undefined) {
        if (primaryTf.rsi > 70) {
          score -= 5;
          reasons.push(`cTrader RSI (${primaryTf.rsi}) overbought zone`);
        } else if (primaryTf.rsi < 30) {
          score += 5;
          reasons.push(`cTrader RSI (${primaryTf.rsi}) oversold zone`);
        }
      }
    }

    score = Math.max(0, Math.min(score, 100));

    let decision: DecisionState;
    if (score >= 80) decision = 'STRONG_BULLISH';
    else if (score >= 65) decision = 'BULLISH';
    else if (score >= 45) decision = 'NEUTRAL';
    else if (score >= 25) decision = 'BEARISH';
    else decision = 'STRONG_BEARISH';

    const bullishVotes = usableTimeframes.filter(tf => technical[tf]?.trend === 'Bullish').length;
    const bearishVotes = usableTimeframes.filter(tf => technical[tf]?.trend === 'Bearish').length;
    const neutralVotes = usableTimeframes.filter(tf => technical[tf]?.trend === 'Neutral').length;

    const conflictRatio = (bullishVotes + bearishVotes) > 0 ? Math.min(bullishVotes, bearishVotes) / (bullishVotes + bearishVotes) : 0;
    const alignmentState = conflictRatio < 0.2 ? 'ALIGNED' : conflictRatio < 0.4 ? 'NEUTRAL' : 'CONFLICT';

    return {
      agent: this.id,
      version: this.version,
      generated_at: new Date().toISOString(),
      status: 'SUCCESS',
      data: {
        decision,
        confidence: score,
        risk: news_risk,
        reasons
      },
      metadata: {
        evaluation_time_ms: Date.now() - startTime,
        technical_fusion: {
          usable_timeframes: usableTimeframes,
          trend_votes: { bullish: bullishVotes, bearish: bearishVotes, neutral: neutralVotes },
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
}
