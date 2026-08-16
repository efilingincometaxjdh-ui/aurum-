import { Router } from 'express';
import { cTraderClient } from '../../market/CTraderClient.js';
import { pipelineOrchestrator } from '../../pipeline/PipelineOrchestrator.js';
import { evidenceEngine } from '../../evidence/EvidenceEngine.js';
import { eventBus } from '../../bus/EventBus.js';
import { PipelineSummary } from '../../../types.js';
import { logger } from '../../utils/logger.js';

export const settingsRouter = Router();

// In-memory advanced settings store
let advancedSettings = {
  maxDailyDrawdownPercent: 2.5,
  maxPositionSizeLots: 1.0,
  minRiskRewardRatio: 1.5,
  webhookUrl: '',
  maxQuoteLatenessSeconds: 60,
  maxCronLatenessMinutes: 5,
  alertChannels: {
    discord: true,
    telegram: false,
    email: false
  },
  executorApiKey: '',
  upstreamDecisionApiUrl: '',
  upstreamDecisionApiKey: ''
};

export function getDecisionApiUrl(): string {
  return process.env.AURUM_CORE_URL || process.env.VITE_DECISION_API_URL || advancedSettings.upstreamDecisionApiUrl || 'http://127.0.0.1:3000';
}

export function getExecutorApiKey(): string {
  const key = process.env.VITE_DECISION_API_KEY || process.env.DECISION_API_KEY || advancedSettings.upstreamDecisionApiKey || advancedSettings.executorApiKey;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DECISION_API_KEY environment variable is required and was not found.');
    }
    // Safe non-production dev fallback
    return 'aurum_exec_dev_key';
  }
  return key;
}

export function validateExecutorApiKey(key: string | undefined): boolean {
  if (!key) return false;
  // Support both standard Bearer tokens and direct API key headers
  const cleanedKey = key.replace('Bearer ', '').trim();
  const localKey = process.env.VITE_DECISION_API_KEY || process.env.DECISION_API_KEY || advancedSettings.executorApiKey || (process.env.NODE_ENV !== 'production' ? 'aurum_exec_dev_key' : '');
  if (!localKey) return false;
  return cleanedKey === localKey;
}

settingsRouter.post('/', (req, res) => {
  const {
    clientId,
    clientSecret,
    accessToken,
    accountId,
    environment,
    minConfidence,
    maxDailyDrawdownPercent,
    maxPositionSizeLots,
    minRiskRewardRatio,
    webhookUrl,
    maxQuoteLatenessSeconds,
    maxCronLatenessMinutes,
    alertChannels,
    executorApiKey,
    upstreamDecisionApiUrl,
    upstreamDecisionApiKey
  } = req.body;

  cTraderClient.updateConfig({
    clientId,
    clientSecret,
    accessToken,
    accountId,
    environment
  });

  if (typeof minConfidence === 'number' && minConfidence >= 0 && minConfidence <= 100) {
    pipelineOrchestrator.setMinConfidence(minConfidence);
  }

  if (typeof maxDailyDrawdownPercent === 'number') advancedSettings.maxDailyDrawdownPercent = maxDailyDrawdownPercent;
  if (typeof maxPositionSizeLots === 'number') advancedSettings.maxPositionSizeLots = maxPositionSizeLots;
  if (typeof minRiskRewardRatio === 'number') advancedSettings.minRiskRewardRatio = minRiskRewardRatio;
  if (typeof webhookUrl === 'string') advancedSettings.webhookUrl = webhookUrl.trim();
  if (typeof maxQuoteLatenessSeconds === 'number') advancedSettings.maxQuoteLatenessSeconds = maxQuoteLatenessSeconds;
  if (typeof maxCronLatenessMinutes === 'number') advancedSettings.maxCronLatenessMinutes = maxCronLatenessMinutes;
  if (typeof executorApiKey === 'string' && executorApiKey.trim() !== '') {
    advancedSettings.executorApiKey = executorApiKey.trim();
  }
  if (typeof upstreamDecisionApiUrl === 'string') {
    advancedSettings.upstreamDecisionApiUrl = upstreamDecisionApiUrl.trim();
  }
  if (typeof upstreamDecisionApiKey === 'string') {
    advancedSettings.upstreamDecisionApiKey = upstreamDecisionApiKey.trim();
  }

  evidenceEngine.setCadenceConfig({
    maxQuoteLatenessSeconds: advancedSettings.maxQuoteLatenessSeconds,
    maxCronLatenessMinutes: advancedSettings.maxCronLatenessMinutes
  });

  if (alertChannels && typeof alertChannels === 'object') {
    advancedSettings.alertChannels = { ...advancedSettings.alertChannels, ...alertChannels };
  }

  const config = cTraderClient.getConfig();
  res.json({
    success: true,
    message: 'Settings saved and applied successfully',
    ctrader_config: {
      client_id: config.clientId || '',
      account_id: config.accountId || '',
      environment: config.environment || 'demo',
      has_client_id: Boolean(config.clientId),
      has_client_secret: Boolean(config.clientSecret),
      has_access_token: Boolean(config.accessToken),
      has_account_id: Boolean(config.accountId),
      has_credentials: cTraderClient.isConfigured()
    },
    has_api_key: cTraderClient.isConfigured(),
    min_confidence: pipelineOrchestrator.getMinConfidence(),
    advanced_settings: {
      ...advancedSettings,
      executorApiKey: process.env.VITE_DECISION_API_KEY || advancedSettings.executorApiKey || ''
    }
  });
});

settingsRouter.get('/', (req, res) => {
  const config = cTraderClient.getConfig();
  res.json({
    success: true,
    ctrader_config: {
      client_id: config.clientId || '',
      account_id: config.accountId || '',
      environment: config.environment || 'demo',
      has_client_id: Boolean(config.clientId),
      has_client_secret: Boolean(config.clientSecret),
      has_access_token: Boolean(config.accessToken),
      has_account_id: Boolean(config.accountId),
      has_credentials: cTraderClient.isConfigured()
    },
    has_api_key: cTraderClient.isConfigured(),
    min_confidence: pipelineOrchestrator.getMinConfidence(),
    advanced_settings: {
      ...advancedSettings,
      executorApiKey: process.env.VITE_DECISION_API_KEY || advancedSettings.executorApiKey || ''
    }
  });
});

// Helper to format beautiful, consistent alert messages
function formatAlertMessage(pipelineSummary: PipelineSummary): string {
  const tv = pipelineSummary.trader_view;
  const decisionEmoji = tv.decision.includes('BULLISH') ? '🟢' :
                        tv.decision.includes('BEARISH') ? '🔴' : '🟡';
  
  return `🔔 <b>AURUM Intelligence Alert</b>\n` +
         `---------------------------------\n` +
         `• <b>Decision:</b> ${decisionEmoji} ${tv.decision}\n` +
         `• <b>Permission:</b> ${tv.permission}\n` +
         `• <b>Confidence:</b> ${tv.confidence}%\n` +
         `• <b>Risk level:</b> ${tv.risk}\n` +
         `• <b>Market Price:</b> ${pipelineSummary.market_ticker.price}\n` +
         `• <b>Macro Bias:</b> ${tv.macro_bias}\n` +
         `• <b>Time:</b> ${pipelineSummary.generated_at}`;
}

// Robust, cross-platform webhook dispatcher supporting both standard JSON POST webhooks and Telegram Bot URLs
export async function dispatchWebhook(targetUrl: string, textMessage: string): Promise<{ success: boolean; error?: string }> {
  try {
    let urlToFetch = targetUrl;
    let options: RequestInit = {};

    // Check if it's a Telegram API URL
    if (targetUrl.includes('api.telegram.org')) {
      // Robustly handle Telegram formatting:
      // Strip angle brackets commonly used as placeholders e.g. <1117727017> -> 1117727017
      const sanitizedUrl = targetUrl.replace(/<|>/g, '');
      
      const urlObj = new URL(sanitizedUrl);
      const chatId = urlObj.searchParams.get('chat_id');
      
      if (chatId) {
        const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
        const params = new URLSearchParams();
        params.append('chat_id', chatId);
        params.append('text', textMessage);
        params.append('parse_mode', 'HTML');
        urlToFetch = `${baseUrl}?${params.toString()}`;
        options = { method: 'GET' };
      } else {
        return { success: false, error: "Telegram URL is missing 'chat_id' query parameter." };
      }
    } else {
      // Standard webhook (Discord, Slack, etc.) expects JSON POST
      // Convert HTML formatting to standard Markdown for standard webhooks
      const markdownMessage = textMessage
        .replace(/<b>/g, '**')
        .replace(/<\/b>/g, '**')
        .replace(/<i>/g, '*')
        .replace(/<\/i>/g, '*')
        .replace(/---------------------------------/g, '---------------------------------');

      options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdownMessage })
      };
    }

    const resp = await fetch(urlToFetch, options);
    if (resp.ok) {
      return { success: true };
    } else {
      const errText = await resp.text().catch(() => '');
      return { success: false, error: `Server returned status ${resp.status}: ${errText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

// Test Webhook Dispatch
settingsRouter.post('/test-webhook', async (req, res) => {
  const { url } = req.body;
  const targetUrl = url || advancedSettings.webhookUrl;

  if (!targetUrl) {
    return res.status(400).json({ success: false, error: 'No webhook URL provided.' });
  }

  const testMessage = `🔔 <b>AURUM Intelligence Webhook Test</b>\n\n• cTrader Open API & Signal Pipeline connected successfully.\n• Timestamp: ${new Date().toISOString()}`;

  const result = await dispatchWebhook(targetUrl, testMessage);
  if (result.success) {
    return res.json({ success: true, message: 'Test alert delivered successfully to webhook.' });
  } else {
    return res.status(400).json({ success: false, error: result.error });
  }
});

// Subscribe to pipeline completed events to automatically dispatch alerts in real-time
eventBus.on('pipeline:completed', async (payload) => {
  const targetUrl = advancedSettings.webhookUrl;
  if (!targetUrl || targetUrl.trim() === '') {
    return;
  }

  const pipelineSummary = payload.data as PipelineSummary;
  if (!pipelineSummary) return;

  const alertMessage = formatAlertMessage(pipelineSummary);
  
  try {
    logger.info(`Dispatching automated pipeline completed notification...`, 'Alerts', payload.traceId);
    const res = await dispatchWebhook(targetUrl, alertMessage);
    if (res.success) {
      logger.info(`Automated notification dispatched successfully`, 'Alerts', payload.traceId);
    } else {
      logger.error(`Automated notification failed: ${res.error}`, 'Alerts', payload.traceId);
    }
  } catch (err: any) {
    logger.error(`Error sending automated notification: ${err.message}`, 'Alerts', payload.traceId);
  }
});

