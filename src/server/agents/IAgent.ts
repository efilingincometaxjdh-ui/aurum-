export interface AgentResult<T = any> {
  agent: string;
  version: string;
  generated_at: string;
  status: 'SUCCESS' | 'DEGRADED' | 'FAILED';
  data: T;
  metadata?: Record<string, any>;
}

export interface IAgent<TInput = any, TOutput = any> {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  evaluate(input: TInput, traceId: string): Promise<AgentResult<TOutput>>;
}
