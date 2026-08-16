import { DecisionV1, signDecision } from '../contracts/v1.js';
import { PipelineSummary } from '../../types.js';
import { getExecutorApiKey } from '../routes/v1/settings.router.js';
import { eventBus } from '../bus/EventBus.js';

class DecisionStore {
  private decisions: Map<string, DecisionV1> = new Map();
  private latestDecision: DecisionV1 | null = null;
  private sequenceCounter = 1000; // Monotonic sequence counter starting at 1000

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    // Listen to real-world pipeline completion to automatically serialize & publish decision
    eventBus.on('pipeline:completed', (payload) => {
      if (payload && payload.data) {
        this.publishDecisionFromSummary(payload.data);
      }
    });
  }

  /**
   * Convert a pipeline summary into a signed DecisionV1 event
   */
  public publishDecisionFromSummary(summary: PipelineSummary): DecisionV1 {
    const traderView = summary.trader_view;
    
    // Explicitly determine action
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (traderView.permission === 'ALLOW_BUYS') {
      action = 'BUY';
    } else if (traderView.permission === 'ALLOW_SELLS') {
      action = 'SELL';
    } else if (traderView.permission === 'ALLOW_BOTH') {
      if (traderView.decision.includes('BULLISH')) {
        action = 'BUY';
      } else if (traderView.decision.includes('BEARISH')) {
        action = 'SELL';
      }
    }

    // Build unique ID and monotonic sequence
    const decision_id = `dec_${summary.trace_id}_${Date.now()}`;
    const seq = ++this.sequenceCounter;

    // Generate stop loss and take profit values
    const isStrong = traderView.decision.includes('STRONG');
    const take_profit_pips = isStrong ? 50 : 30;
    const stop_loss_pips = 25;

    const unsignedDecision: Omit<DecisionV1, 'signature'> = {
      schema_version: 'v1.0.0',
      sequence_number: seq,
      decision_id,
      timestamp: summary.generated_at || new Date().toISOString(),
      symbol: summary.market_ticker?.symbol || 'XAUUSD',
      action,
      confidence: traderView.confidence,
      price: summary.market_ticker?.price || 1920.50,
      bid: summary.market_ticker?.bid || 1920.25,
      ask: summary.market_ticker?.ask || 1920.75,
      spread: summary.market_ticker?.spread || 0.50,
      take_profit_pips,
      stop_loss_pips,
      permission: traderView.permission,
      risk_state: traderView.risk
    };

    // Cryptographic signing with current executor key
    const secret = getExecutorApiKey();
    const signature = signDecision(unsignedDecision, secret);

    const signedDecision: DecisionV1 = {
      ...unsignedDecision,
      signature
    };

    // Save and cache
    this.decisions.set(decision_id, signedDecision);
    this.latestDecision = signedDecision;

    // Emit event on internal bus so sub-systems (like executor client) can receive immediately
    (eventBus as any).emit('decision:published', signedDecision);

    return signedDecision;
  }

  public getLatest(): DecisionV1 | null {
    return this.latestDecision;
  }

  public getById(id: string): DecisionV1 | undefined {
    return this.decisions.get(id);
  }

  public getAll(): DecisionV1[] {
    return Array.from(this.decisions.values());
  }

  /**
   * Safe cleanup / reset
   */
  public clear() {
    this.decisions.clear();
    this.latestDecision = null;
  }
}

export const decisionStore = new DecisionStore();
