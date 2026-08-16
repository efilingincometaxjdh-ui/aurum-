import { IAgent, AgentResult } from './IAgent.js';
import { Agent05State, Agent06State } from '../../types.js';
import { logger } from '../utils/logger.js';

export interface Agent06Input {
  permissionState: Agent05State;
  upstreamStatuses: Record<string, 'SUCCESS' | 'DEGRADED' | 'FAILED'>;
}

export class Agent06Alert implements IAgent<Agent06Input, Agent06State['data']> {
  readonly id = 'Agent06';
  readonly name = 'Alert Gateway & Distribution Engine';
  readonly version = '1.0';

  async evaluate(input: Agent06Input, traceId: string): Promise<AgentResult<Agent06State['data']>> {
    const startTime = Date.now();
    logger.info('Evaluating Agent06 Alert Gateway...', 'Agent06', traceId);

    const { permissionState, upstreamStatuses } = input;
    const permData = permissionState.data;

    return {
      agent: this.id,
      version: this.version,
      generated_at: new Date().toISOString(),
      status: 'SUCCESS',
      data: {
        permission: permData.permission,
        reason: permData.reason,
        fresh: true,
        upstream_status: upstreamStatuses,
        execution_enabled: false // ALWAYS FALSE by contract (read-only alert boundary)
      },
      metadata: {
        evaluation_time_ms: Date.now() - startTime
      }
    };
  }
}
