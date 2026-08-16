import { Router } from 'express';
import { pipelineOrchestrator } from '../../pipeline/PipelineOrchestrator.js';
import { opportunityScanner } from '../../pipeline/OpportunityScanner.js';
import { agentRegistry } from '../../agents/AgentRegistry.js';
import { cTraderClient } from '../../market/CTraderClient.js';
import { validateExecutorApiKey } from './settings.router.js';
import { eventBus } from '../../bus/EventBus.js';
import { decisionStore } from '../../pipeline/DecisionStore.js';

export const pipelineRouter = Router();

function formatDecisionPayload(summary: any) {
  const traderView = summary.trader_view;
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  if (traderView.permission === 'ALLOW_BUYS') {
    action = 'BUY';
  } else if (traderView.permission === 'ALLOW_SELLS') {
    action = 'SELL';
  } else if (traderView.permission === 'ALLOW_BOTH') {
    action = traderView.decision.includes('BULLISH') ? 'BUY' : (traderView.decision.includes('BEARISH') ? 'SELL' : 'HOLD');
  }

  return {
    success: true,
    timestamp: summary.generated_at,
    trace_id: summary.trace_id,
    market: {
      symbol: summary.market_ticker.symbol,
      price: summary.market_ticker.price,
      bid: summary.market_ticker.bid,
      ask: summary.market_ticker.ask,
      spread: summary.market_ticker.spread
    },
    pipeline: {
      coverage_score: summary.evidence_coverage?.score ?? 100,
      health: summary.evidence_coverage?.health ?? 'FULL_COVERAGE',
      stale: summary.evidence_coverage?.health === 'DEGRADED'
    },
    signal: {
      decision: traderView.decision,
      permission: traderView.permission,
      confidence: traderView.confidence,
      risk_state: traderView.risk,
      action,
      compliance_fail_closed: traderView.permission === 'BLOCK_TRADING'
    },
    recommendations: {
      take_profit_distance_pips: traderView.decision.includes('STRONG') ? 50 : 30,
      stop_loss_distance_pips: 25,
      risk_reward_ratio: 1.5,
      notes: 'Gold trace generated dynamically via multi-agent consensus.'
    }
  };
}

pipelineRouter.get('/status', async (req, res, next) => {
  try {
    const symbol = (req.query.symbol as string) || undefined;
    const summary = await pipelineOrchestrator.getLatestSummary(req.traceId || 'trc_status', symbol);
    const result = {
      ...summary,
      min_confidence: pipelineOrchestrator.getMinConfidence(),
      has_api_key: cTraderClient.isConfigured()
    };
    res.json(result);
  } catch (err) {
    next(err);
  }
});

pipelineRouter.post('/run', async (req, res, next) => {
  try {
    const symbol = (req.body?.symbol || req.query?.symbol) as string | undefined;
    const summary = await pipelineOrchestrator.runPipeline(req.traceId || 'trc_run', true, symbol);
    const result = {
      ...summary,
      min_confidence: pipelineOrchestrator.getMinConfidence(),
      has_api_key: cTraderClient.isConfigured()
    };
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const checkApiKey = (req: any, res: any, next: any) => {
  const apiKeyHeader = 
    req.headers['x-aurum-api-key'] || 
    req.headers['x-decision-api-key'] || 
    req.headers['authorization'] ||
    req.query['apiKey'] ||
    req.query['token'];

  if (!apiKeyHeader || typeof apiKeyHeader !== 'string' || !validateExecutorApiKey(apiKeyHeader)) {
    return res.status(401).json({
      error: true,
      message: 'Unauthorized: Missing or invalid X-Aurum-API-Key, Bearer token, or apiKey query parameter.'
    });
  }
  next();
};

pipelineRouter.get('/decision', checkApiKey, async (req, res, next) => {
  try {
    let summary = await pipelineOrchestrator.getLatestSummary(req.traceId || 'trc_executor_decision');
    if (!summary) {
      summary = await pipelineOrchestrator.runPipeline(req.traceId || 'trc_exec_run', true);
    }
    res.json(formatDecisionPayload(summary));
  } catch (err) {
    next(err);
  }
});

const handleDecisionStream = async (req: any, res: any, next: any) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial latest decision
    let initialSummary = await pipelineOrchestrator.getLatestSummary(req.traceId || 'trc_stream_init');
    if (!initialSummary) {
      initialSummary = await pipelineOrchestrator.runPipeline(req.traceId || 'trc_stream_gen', true);
    }
    if (initialSummary) {
      const decisionContract = decisionStore.getLatest() || decisionStore.publishDecisionFromSummary(initialSummary);
      res.write(`data: ${JSON.stringify({ type: 'decision', data: decisionContract })}\n\n`);
    }

    // Subscribe to pipeline completes
    const onPipelineCompleted = async (payload: any) => {
      try {
        const latestSummary = await pipelineOrchestrator.getLatestSummary(payload.traceId || 'trc_stream_push');
        if (latestSummary) {
          const decisionContract = decisionStore.publishDecisionFromSummary(latestSummary);
          res.write(`data: ${JSON.stringify({ type: 'decision', data: decisionContract })}\n\n`);
        }
      } catch (err) {
        // Safe stream catch
      }
    };

    eventBus.on('pipeline:completed', onPipelineCompleted);

    // Keep-alive heartbeat every 10 seconds
    const heartbeatTimer = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 10000);

    req.on('close', () => {
      clearInterval(heartbeatTimer);
      eventBus.off('pipeline:completed', onPipelineCompleted);
      res.end();
    });

  } catch (err) {
    next(err);
  }
};

pipelineRouter.get('/decision/stream', checkApiKey, handleDecisionStream);
pipelineRouter.get('/stream', checkApiKey, handleDecisionStream);

pipelineRouter.get('/agents', (req, res) => {
  res.json({
    agents: agentRegistry.listAgents()
  });
});

pipelineRouter.get('/opportunities', async (req, res, next) => {
  try {
    const data = await opportunityScanner.getRankedOpportunities();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

