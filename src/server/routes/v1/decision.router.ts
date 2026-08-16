import { Router } from 'express';
import { validateExecutorApiKey, getExecutorApiKey } from './settings.router.js';
import { decisionStore } from '../../pipeline/DecisionStore.js';
import { pipelineOrchestrator } from '../../pipeline/PipelineOrchestrator.js';
import { feedbackRepository } from '../../repositories/FeedbackRepository.js';
import { aurumExecutor } from '../../executor/AurumExecutor.js';
import { 
  SCHEMA_VERSION, 
  HealthCheckV1, 
  validateSchema, 
  FeedbackSchema,
  ExecutionFeedbackV1
} from '../../contracts/v1.js';
import { cTraderClient } from '../../market/CTraderClient.js';

export const decisionRouter = Router();

// Authentication middleware for decision endpoints (mandatory)
function authenticateApiKey(req: any, res: any, next: any) {
  const apiKeyHeader = 
    req.headers['x-aurum-api-key'] || 
    req.headers['x-decision-api-key'] || 
    req.headers['authorization'] ||
    req.query['apiKey'] ||
    req.query['token'];

  if (!apiKeyHeader || typeof apiKeyHeader !== 'string' || !validateExecutorApiKey(apiKeyHeader)) {
    return res.status(401).json({
      error: true,
      message: 'Unauthorized: Missing or invalid X-Aurum-API-Key, Bearer token, or apiKey parameter.'
    });
  }
  next();
}

/**
 * Task 2: GET /health (HealthCheckV1)
 * Publicly accessible, provides standard structure
 */
decisionRouter.get('/health', (req, res) => {
  const payload: HealthCheckV1 = {
    schema_version: 'v1.0.0',
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    services: {
      core: 'ONLINE',
      market_feed: cTraderClient.isConfigured() ? 'ONLINE' : 'DEGRADED',
      broker_connection: 'ONLINE'
    }
  };
  res.json(payload);
});

/**
 * Helper to fetch or generate latest decision reliably
 */
async function getOrGenerateLatestDecision(traceId: string) {
  let latest = decisionStore.getLatest();
  if (!latest) {
    let summary = await pipelineOrchestrator.getLatestSummary(traceId);
    if (!summary) {
      summary = await pipelineOrchestrator.runPipeline(traceId, true);
    }
    if (summary) {
      latest = decisionStore.publishDecisionFromSummary(summary);
    }
  }
  return latest;
}

/**
 * Task 2: GET /decision/latest & Aliases
 * Return the latest cryptographically signed & sequenced decision
 */
const handleLatestDecision = async (req: any, res: any, next: any) => {
  try {
    const latest = await getOrGenerateLatestDecision(req.traceId || 'trc_get_latest');
    if (!latest) {
      return res.status(500).json({
        error: true,
        message: 'Unable to produce a decision at this time.'
      });
    }
    res.json(latest);
  } catch (err) {
    next(err);
  }
};

decisionRouter.get('/decision/latest', authenticateApiKey, handleLatestDecision);
decisionRouter.get('/decision', authenticateApiKey, handleLatestDecision);
decisionRouter.get('/decisions/latest', authenticateApiKey, handleLatestDecision);
decisionRouter.get('/pipeline/decision/latest', authenticateApiKey, handleLatestDecision);

/**
 * Task 2: GET /decision/:id
 * Retrieve a specific decision by its ID
 */
decisionRouter.get('/decision/:id', authenticateApiKey, (req, res, next) => {
  if (req.params.id === 'latest' || req.params.id === 'stream') {
    return next();
  }
  const decision = decisionStore.getById(req.params.id);
  if (!decision) {
    return res.status(404).json({
      error: true,
      message: `Decision with ID ${req.params.id} not found.`
    });
  }
  res.json(decision);
});

/**
 * Task 10: POST /feedback
 * Allows Aurum Executor to log trade executions back to Aurum Core for analytics
 */
decisionRouter.post('/feedback', authenticateApiKey, (req, res) => {
  const feedback: ExecutionFeedbackV1 = req.body;
  
  // Validate schema version & required fields
  const validationErrors = validateSchema(feedback, FeedbackSchema);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: true,
      message: 'Malformed Feedback payload: Schema validation failed.',
      errors: validationErrors
    });
  }

  // Persist for analytics
  feedbackRepository.saveFeedback(feedback);

  // Record tracing event
  feedbackRepository.recordEvent(
    'Feedback Received',
    feedback.decision_id,
    `Completed feedback with close reason: ${feedback.close_reason}, profit: $${feedback.profit_loss.toFixed(2)}, slippage: ${feedback.slippage} pips`,
    feedback
  );

  res.json({
    success: true,
    message: 'Execution feedback captured and stored successfully for analytics.',
    timestamp: new Date().toISOString()
  });
});

/**
 * Endpoint to retrieve all compiled decisions (useful for UI tracking)
 */
decisionRouter.get('/decisions', (req, res) => {
  res.json(decisionStore.getAll());
});

/**
 * Endpoint to retrieve all feedbacks (useful for UI tracking)
 */
decisionRouter.get('/feedbacks', (req, res) => {
  res.json(feedbackRepository.getFeedbacks());
});

/**
 * Endpoint to retrieve execution events (Task 11)
 */
decisionRouter.get('/events', (req, res) => {
  const { id } = req.query;
  res.json(feedbackRepository.getEvents(id ? String(id) : undefined));
});

/**
 * Endpoint to retrieve cTrader Executor Account State (Task 8 & 9)
 */
decisionRouter.get('/executor-state', (req, res) => {
  res.json(aurumExecutor.getAccountDetails());
});

/**
 * Endpoint to trigger manual position closure on broker (Task 8 & 9)
 */
decisionRouter.post('/close-position', (req, res) => {
  const { positionId, reason } = req.body;
  if (!positionId) {
    return res.status(400).json({ error: true, message: 'Missing positionId' });
  }
  aurumExecutor.closePosition(positionId, reason || 'MANUAL');
  res.json({ success: true, message: `Position ${positionId} closed successfully.` });
});
