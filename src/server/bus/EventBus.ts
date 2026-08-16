import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

export type PipelineEventType =
  | 'pipeline:started'
  | 'evidence:collected'
  | 'agent01:evaluated'
  | 'agent02:evaluated'
  | 'agent03:evaluated'
  | 'agent04:evaluated'
  | 'agent05:evaluated'
  | 'agent06:evaluated'
  | 'pipeline:completed'
  | 'pipeline:failed';

export interface PipelineEventPayload {
  traceId: string;
  timestamp: string;
  stage: string;
  data?: any;
  error?: string;
}

class PipelineEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit(event: PipelineEventType, payload: PipelineEventPayload) {
    logger.debug(`Event emitted: [${event}] for trace ${payload.traceId}`, 'EventBus', payload.traceId);
    this.emitter.emit(event, payload);
  }

  on(event: PipelineEventType, listener: (payload: PipelineEventPayload) => void) {
    this.emitter.on(event, listener);
  }

  off(event: PipelineEventType, listener: (payload: PipelineEventPayload) => void) {
    this.emitter.off(event, listener);
  }

  once(event: PipelineEventType, listener: (payload: PipelineEventPayload) => void) {
    this.emitter.once(event, listener);
  }
}

export const eventBus = new PipelineEventBus();
