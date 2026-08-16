import { IAgent, AgentResult } from './IAgent.js';
import { EvidencePackage } from '../evidence/types.js';
import { Agent01State } from '../../types.js';
import { logger } from '../utils/logger.js';

export class Agent01Research implements IAgent<EvidencePackage, Agent01State['data']> {
  readonly id = 'Agent01';
  readonly name = 'Deep Research Intelligence Engine';
  readonly version = '1.0';

  async evaluate(evidence: EvidencePackage, traceId: string): Promise<AgentResult<Agent01State['data']>> {
    const startTime = Date.now();
    logger.info('Evaluating Agent01 Research Intelligence...', 'Agent01', traceId);

    const macroData = evidence.macro.macroData;
    const symbol = evidence.context?.canonicalSymbol || evidence.market.quote.symbol || 'XAUUSD';
    const data: Agent01State['data'] = {
      gold_bias: macroData.gold_bias,
      usd_bias: macroData.gold_bias === 'BULLISH' ? 'BEARISH' : macroData.gold_bias === 'BEARISH' ? 'BULLISH' : 'NEUTRAL',
      confidence: macroData.gold_bias === 'BULLISH' ? 78 : macroData.gold_bias === 'BEARISH' ? 72 : 50,
      news_risk: macroData.news_risk,
      narrative: `AURUM Research Synthesis: ${symbol} navigating ${macroData.gold_bias} macro environment with ${macroData.news_risk} headline risk. Real yield dynamics and Fed rate expectations remain primary catalysts.`,
      key_drivers: [
        `US 10-Yr Real Yield at ${macroData.us10y_yield}%`,
        `DXY US Dollar Index at ${macroData.dxy_index}`,
        `Federal Reserve Policy Bias: ${macroData.fed_policy}`,
        `Geopolitical Risk Assessment: ${macroData.geopolitical_risk}`
      ],
      sentiment_score: macroData.gold_bias === 'BULLISH' ? 78 : macroData.gold_bias === 'BEARISH' ? 28 : 50,
      risk_factors: macroData.upcoming_events.map(e => `${e.title} (${e.impact} Impact, ${e.time_until})`)
    };

    return {
      agent: this.id,
      version: this.version,
      generated_at: new Date().toISOString(),
      status: 'SUCCESS',
      data,
      metadata: {
        evaluation_time_ms: Date.now() - startTime,
        evidence_id: evidence.id
      }
    };
  }
}
