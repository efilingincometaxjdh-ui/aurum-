import crypto from 'crypto';

export const SCHEMA_VERSION = 'v1.0.0';

// Frozen Decision Schema Interface
export interface DecisionV1 {
  schema_version: 'v1.0.0';
  sequence_number: number;
  decision_id: string;
  timestamp: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  take_profit_pips: number;
  stop_loss_pips: number;
  permission: string;
  risk_state: string;
  signature?: string;
}

// Frozen Execution Feedback Schema Interface
export interface ExecutionFeedbackV1 {
  schema_version: 'v1.0.0';
  decision_id: string;
  fill_price: number;
  slippage: number;
  entry_time: string;
  exit_time: string;
  profit_loss: number;
  close_reason: string;
  latency_ms: number;
  mae_pips: number;
  mfe_pips: number;
  timestamp?: string;
}

// Frozen Health Check Schema Interface
export interface HealthCheckV1 {
  schema_version: 'v1.0.0';
  status: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  timestamp: string;
  services: {
    core: string;
    market_feed: string;
    executor?: string;
    broker_connection?: string;
  };
}

// JSON Schemas for Runtime Validation
export const DecisionSchema = {
  type: 'object',
  required: [
    'schema_version',
    'sequence_number',
    'decision_id',
    'timestamp',
    'symbol',
    'action',
    'confidence',
    'price',
    'take_profit_pips',
    'stop_loss_pips',
    'permission',
    'risk_state'
  ],
  properties: {
    schema_version: { type: 'string', enum: [SCHEMA_VERSION] },
    sequence_number: { type: 'number' },
    decision_id: { type: 'string' },
    timestamp: { type: 'string' },
    symbol: { type: 'string' },
    action: { type: 'string', enum: ['BUY', 'SELL', 'HOLD'] },
    confidence: { type: 'number' },
    price: { type: 'number' },
    bid: { type: 'number' },
    ask: { type: 'number' },
    spread: { type: 'number' },
    take_profit_pips: { type: 'number' },
    stop_loss_pips: { type: 'number' },
    permission: { type: 'string' },
    risk_state: { type: 'string' },
    signature: { type: 'string' }
  }
};

export const FeedbackSchema = {
  type: 'object',
  required: [
    'schema_version',
    'decision_id',
    'fill_price',
    'slippage',
    'entry_time',
    'exit_time',
    'profit_loss',
    'close_reason',
    'latency_ms',
    'mae_pips',
    'mfe_pips'
  ],
  properties: {
    schema_version: { type: 'string', enum: [SCHEMA_VERSION] },
    decision_id: { type: 'string' },
    fill_price: { type: 'number' },
    slippage: { type: 'number' },
    entry_time: { type: 'string' },
    exit_time: { type: 'string' },
    profit_loss: { type: 'number' },
    close_reason: { type: 'string' },
    latency_ms: { type: 'number' },
    mae_pips: { type: 'number' },
    mfe_pips: { type: 'number' }
  }
};

// Cryptographic Signing Utility (using HMAC-SHA256 with the Executor API key as secret)
export function signDecision(decision: Omit<DecisionV1, 'signature'>, secret: string): string {
  // Create deterministic string payload of decision details
  const payload = [
    decision.schema_version,
    decision.sequence_number,
    decision.decision_id,
    decision.timestamp,
    decision.symbol,
    decision.action,
    decision.confidence,
    decision.price,
    decision.take_profit_pips,
    decision.stop_loss_pips,
    decision.permission,
    decision.risk_state
  ].join('|');

  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Cryptographic Verification Utility
export function verifyDecision(decision: DecisionV1, secret: string): boolean {
  if (!decision.signature) return false;
  
  const { signature, ...decisionWithoutSignature } = decision;
  const expectedSignature = signDecision(decisionWithoutSignature, secret);
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Lightweight JSON Schema Validator
export function validateSchema(data: any, schema: any): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return errors;
  }

  for (const field of schema.required) {
    if (data[field] === undefined || data[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties) as [string, any][]) {
      if (data[key] !== undefined && data[key] !== null) {
        // Simple type checks
        if (value.type === 'string' && typeof data[key] !== 'string') {
          errors.push(`Field ${key} must be a string`);
        } else if (value.type === 'number' && typeof data[key] !== 'number') {
          errors.push(`Field ${key} must be a number`);
        } else if (value.enum && !value.enum.includes(data[key])) {
          errors.push(`Field ${key} must be one of: ${value.enum.join(', ')}`);
        }
      }
    }
  }

  return errors;
}
