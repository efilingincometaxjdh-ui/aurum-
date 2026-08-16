import { IAgent, AgentResult } from './IAgent.js';
import { Agent04State, Agent05State, PermissionState } from '../../types.js';
import { logger } from '../utils/logger.js';

export interface Agent05Input {
  decisionData: Agent04State['data'];
  minConfidence?: number;
  isStale?: boolean;
  latenessExceeded?: boolean;
}

export class Agent05Permission implements IAgent<Agent05Input, Agent05State['data']> {
  readonly id = 'Agent05';
  readonly name = 'Safety Gate & Permission Manager';
  readonly version = '1.0';

  async evaluate(input: Agent05Input, traceId: string): Promise<AgentResult<Agent05State['data']>> {
    const startTime = Date.now();
    logger.info('Evaluating Agent05 Permission Manager...', 'Agent05', traceId);

    const { decisionData, minConfidence = 55, isStale, latenessExceeded } = input;

    if (isStale || latenessExceeded) {
      return {
        agent: this.id,
        version: this.version,
        generated_at: new Date().toISOString(),
        status: 'SUCCESS',
        data: {
          permission: 'BLOCK_TRADING',
          reason: 'Lateness tolerance window exceeded, or invalid/degraded live evidence package detected (e.g., missing candles or stale quote feed). Fail-closed safety gate engaged.',
          minimum_confidence_required: minConfidence
        }
      };
    }

    if (!decisionData) {
      return {
        agent: this.id,
        version: this.version,
        generated_at: new Date().toISOString(),
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
        agent: this.id,
        version: this.version,
        generated_at: new Date().toISOString(),
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
        agent: this.id,
        version: this.version,
        generated_at: new Date().toISOString(),
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
        agent: this.id,
        version: this.version,
        generated_at: new Date().toISOString(),
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
        reason = 'Strong bullish environment confirmed by cTrader multi-timeframe intelligence.';
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
        reason = 'Strong bearish environment confirmed by cTrader multi-timeframe intelligence.';
        break;
      default:
        permission = 'BLOCK_TRADING';
        reason = 'Unknown decision state.';
    }

    return {
      agent: this.id,
      version: this.version,
      generated_at: new Date().toISOString(),
      status: 'SUCCESS',
      data: {
        permission,
        reason,
        minimum_confidence_required: minConfidence
      },
      metadata: {
        evaluation_time_ms: Date.now() - startTime
      }
    };
  }
}
