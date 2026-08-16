import { IAgent, AgentResult } from './IAgent.js';
import { EvidencePackage } from '../evidence/types.js';
import { Agent02State } from '../../types.js';
import { logger } from '../utils/logger.js';

export class Agent02Technical implements IAgent<EvidencePackage, Agent02State['data']> {
  readonly id = 'Agent02';
  readonly name = 'cTrader Technical Intelligence Engine';
  readonly version = '1.0';

  async evaluate(evidence: EvidencePackage, traceId: string): Promise<AgentResult<Agent02State['data']>> {
    const startTime = Date.now();
    logger.info('Evaluating Agent02 cTrader Technical Engine...', 'Agent02', traceId);

    const technicals = evidence.market.calculatedTechnicals;
    const quote = evidence.market.quote;

    const data: Agent02State['data'] = {
      M5: technicals.M5,
      M15: technicals.M15,
      H1: technicals.H1,
      H4: technicals.H4
    };

    return {
      agent: this.id,
      version: this.version,
      generated_at: new Date().toISOString(),
      status: 'SUCCESS',
      data,
      metadata: {
        evaluation_time_ms: Date.now() - startTime,
        evidence_id: evidence.id,
        ctrader_source: quote.source,
        ctrader_environment: quote.environment,
        symbol: quote.symbol,
        bid: quote.bid,
        ask: quote.ask,
        spread: quote.spread,
        data_quality_score: evidence.market.dataQualityScore
      }
    };
  }
}
