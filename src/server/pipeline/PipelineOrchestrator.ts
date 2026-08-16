import { evidenceEngine, EvidenceEngine } from '../evidence/EvidenceEngine.js';
import { agentRegistry, AgentRegistry } from '../agents/AgentRegistry.js';
import { eventBus } from '../bus/EventBus.js';
import { stateRepository } from '../repositories/PostgresObservationRepository.js';
import { redisRepository } from '../repositories/RedisCacheRepository.js';
import { buildTraderViewSnapshot } from '../engine.js';
import { PipelineSummary } from '../../types.js';
import { logger } from '../utils/logger.js';
import { metricsRegistry } from '../utils/metrics.js';

export class PipelineOrchestrator {
  private minConfidence = 55;
  private cachedSummary: PipelineSummary | null = null;
  private lastRunTimestamp = 0;

  constructor() {
    this.setupBusListeners();
  }

  public setMinConfidence(val: number) {
    this.minConfidence = val;
  }

  public getMinConfidence(): number {
    return this.minConfidence;
  }

  private setupBusListeners() {
    eventBus.on('pipeline:started', (payload) => {
      logger.info(`Pipeline execution started`, 'Orchestrator', payload.traceId);
    });

    eventBus.on('pipeline:completed', (payload) => {
      logger.info(`Pipeline execution completed successfully`, 'Orchestrator', payload.traceId);
    });

    eventBus.on('pipeline:failed', (payload) => {
      logger.error(`Pipeline execution failed: ${payload.error}`, 'Orchestrator', payload.traceId);
    });
  }

  async runPipeline(traceId: string, forceFresh = false, symbol?: string): Promise<PipelineSummary> {
    const startTime = Date.now();

    // Check cache first if not forced fresh and run within 10s and symbol matches
    if (!forceFresh && this.cachedSummary && Date.now() - this.lastRunTimestamp < 10000 && (!symbol || this.cachedSummary.market_ticker?.symbol === symbol)) {
      logger.info('Returning cached pipeline summary', 'Orchestrator', traceId);
      return this.cachedSummary;
    }

    eventBus.emit('pipeline:started', { traceId, timestamp: new Date().toISOString(), stage: 'init' });

    try {
      // 1. Evidence Collection Stage
      const evidence = await evidenceEngine.collectEvidence(traceId, symbol);
      eventBus.emit('evidence:collected', { traceId, timestamp: new Date().toISOString(), stage: 'evidence', data: evidence.id });

      // 2. Parallel Evaluation of Agents 01, 02, 03
      const agent01Instance = agentRegistry.get('Agent01');
      const agent02Instance = agentRegistry.get('Agent02');
      const agent03Instance = agentRegistry.get('Agent03');

      const [a01Result, a02Result, a03Result] = await Promise.all([
        agent01Instance.evaluate(evidence, traceId),
        agent02Instance.evaluate(evidence, traceId),
        agent03Instance.evaluate(evidence, traceId)
      ]);

      eventBus.emit('agent01:evaluated', { traceId, timestamp: new Date().toISOString(), stage: 'agent01', data: a01Result });
      eventBus.emit('agent02:evaluated', { traceId, timestamp: new Date().toISOString(), stage: 'agent02', data: a02Result });
      eventBus.emit('agent03:evaluated', { traceId, timestamp: new Date().toISOString(), stage: 'agent03', data: a03Result });

      // 3. Agent 04 Decision Fusion
      const agent04Instance = agentRegistry.get('Agent04');
      const a04Result = await agent04Instance.evaluate({ macro: a03Result.data, technical: a02Result.data }, traceId);
      eventBus.emit('agent04:evaluated', { traceId, timestamp: new Date().toISOString(), stage: 'agent04', data: a04Result });

      // 4. Agent 05 Permission Manager
      const agent05Instance = agentRegistry.get('Agent05');
      const a05Result = await agent05Instance.evaluate({
        decisionData: a04Result.data,
        minConfidence: this.minConfidence,
        isStale: evidence.isStale
      }, traceId);
      eventBus.emit('agent05:evaluated', { traceId, timestamp: new Date().toISOString(), stage: 'agent05', data: a05Result });

      // 5. Agent 06 Alert Distribution Engine
      const upstreamStatuses = {
        Agent01: a01Result.status,
        Agent02: a02Result.status,
        Agent03: a03Result.status,
        Agent04: a04Result.status,
        Agent05: a05Result.status
      };
      const agent06Instance = agentRegistry.get('Agent06');
      const a06Result = await agent06Instance.evaluate({ permissionState: a05Result, upstreamStatuses }, traceId);
      eventBus.emit('agent06:evaluated', { traceId, timestamp: new Date().toISOString(), stage: 'agent06', data: a06Result });

      // 6. Construct TraderView Snapshot
      const quote = evidence.market.quote;
      const trader_view = buildTraderViewSnapshot(a06Result, a04Result, a03Result, a02Result, quote.symbol);
      const nowMs = Date.now();
      const cronAgeSeconds = this.lastRunTimestamp > 0 ? Math.round((nowMs - this.lastRunTimestamp) / 1000) : 0;
      const cadenceConfig = evidenceEngine.getCadenceConfig();
      const maxCronSeconds = cadenceConfig.maxCronLatenessMinutes * 60;
      const cronLatenessExceeded = this.lastRunTimestamp > 0 && cronAgeSeconds > maxCronSeconds;

      if (cronLatenessExceeded) {
        evidence.missingEvidence.push(`CRON_LATENESS_EXCEEDED (${cronAgeSeconds}s > ${maxCronSeconds}s limit)`);
        evidence.validationFlags.push('CRON_STALE_LATENESS_EXCEEDED');
      }

      const quoteTime = new Date(quote.timestamp).getTime();
      const quoteAgeSeconds = Math.max(0, Math.round((nowMs - quoteTime) / 1000));
      const quoteLatenessExceeded = quoteAgeSeconds > cadenceConfig.maxQuoteLatenessSeconds;

      const pipelineSummary: PipelineSummary = {
        generated_at: new Date().toISOString(),
        trace_id: traceId,
        evidence_coverage: {
          score: evidence.coverageScore,
          health: cronLatenessExceeded || quoteLatenessExceeded ? 'DEGRADED' : evidence.health,
          missing: evidence.missingEvidence,
          flags: evidence.validationFlags,
          lateness_metrics: {
            quote_age_seconds: quoteAgeSeconds,
            quote_lateness_exceeded: quoteLatenessExceeded,
            cron_age_seconds: cronAgeSeconds,
            cron_lateness_exceeded: cronLatenessExceeded,
            macro_age_minutes: 0,
            macro_lateness_exceeded: false
          }
        },
        trader_view,
        agent01: a01Result,
        agent02: a02Result,
        agent03: a03Result,
        agent04: a04Result,
        agent05: a05Result,
        agent06: a06Result,
        market_ticker: {
          symbol: quote.symbol,
          price: quote.bid,
          bid: quote.bid,
          ask: quote.ask,
          spread: quote.spread,
          change_24h: Number((quote.bid > 0 ? 3.40 : 0).toFixed(2)),
          change_percent_24h: Number((quote.bid > 0 ? (3.40 / quote.bid) * 100 : 0).toFixed(2)),
          high_24h: Number((quote.bid + 12.50).toFixed(2)),
          low_24h: Number((quote.bid - 14.20).toFixed(2)),
          updated_at: quote.timestamp,
          time: quote.timestamp,
          source: quote.source,
          ctrader_environment: quote.environment
        }
      };

      // 7. Save observation to state repository & Redis cache
      await stateRepository.saveObservation({
        traceId,
        timestamp: pipelineSummary.generated_at,
        decision: trader_view.decision,
        permission: trader_view.permission,
        confidence: trader_view.confidence,
        risk: trader_view.risk,
        macroBias: trader_view.macro_bias,
        timeframeAlignment: trader_view.timeframe_alignment,
        traderView: trader_view,
        rawPipelineData: pipelineSummary
      });

      await redisRepository.set('latest_pipeline_summary', pipelineSummary, 60);

      this.cachedSummary = pipelineSummary;
      this.lastRunTimestamp = Date.now();

      const totalDuration = Date.now() - startTime;
      metricsRegistry.recordPipelineRun(totalDuration, true, {
        agent01: a01Result.metadata?.evaluation_time_ms || 0,
        agent02: a02Result.metadata?.evaluation_time_ms || 0,
        agent03: a03Result.metadata?.evaluation_time_ms || 0,
        agent04: a04Result.metadata?.evaluation_time_ms || 0,
        agent05: a05Result.metadata?.evaluation_time_ms || 0,
        agent06: a06Result.metadata?.evaluation_time_ms || 0
      });

      eventBus.emit('pipeline:completed', { traceId, timestamp: new Date().toISOString(), stage: 'complete', data: pipelineSummary });

      return pipelineSummary;
    } catch (err: any) {
      metricsRegistry.recordPipelineRun(Date.now() - startTime, false);
      eventBus.emit('pipeline:failed', { traceId, timestamp: new Date().toISOString(), stage: 'error', error: err.message });
      throw err;
    }
  }

  public async getLatestSummary(traceId: string, symbol?: string): Promise<PipelineSummary> {
    if (this.cachedSummary && (!symbol || this.cachedSummary.market_ticker?.symbol === symbol)) {
      return this.cachedSummary;
    }
    return this.runPipeline(traceId, true, symbol);
  }
}

export const pipelineOrchestrator = new PipelineOrchestrator();
