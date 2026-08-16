import { IAgent, AgentResult } from './IAgent.js';
import { EvidencePackage } from '../evidence/types.js';
import { Agent03State } from '../../types.js';
import { logger } from '../utils/logger.js';

export class Agent03Macro implements IAgent<EvidencePackage, Agent03State['data']> {
  readonly id = 'Agent03';
  readonly name = 'Macro Risk & Policy Intelligence';
  readonly version = '1.0';

  async evaluate(evidence: EvidencePackage, traceId: string): Promise<AgentResult<Agent03State['data']>> {
    const startTime = Date.now();
    logger.info('Evaluating Agent03 Macro Intelligence...', 'Agent03', traceId);

    const macroData = evidence.macro.macroData;

    return {
      agent: this.id,
      version: this.version,
      generated_at: new Date().toISOString(),
      status: 'SUCCESS',
      data: macroData,
      metadata: {
        evaluation_time_ms: Date.now() - startTime,
        evidence_id: evidence.id,
        source: evidence.macro.source
      }
    };
  }
}
