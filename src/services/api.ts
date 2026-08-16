import { PipelineSummary, Candle, HistoricalObservation, SymbolRegistryResponse, OpportunityScannerResponse } from '../types.js';

// Safe fetch helper to handle HTML fallbacks gracefully during container cold starts or network latencies
async function safeFetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Expected JSON response but received non-JSON: ${contentType || 'unknown'}`);
  }
  return res.json();
}

export async function fetchOpportunityScanner(): Promise<OpportunityScannerResponse> {
  return safeFetchJson<OpportunityScannerResponse>('/api/pipeline/opportunities');
}

export async function fetchSymbolRegistry(): Promise<SymbolRegistryResponse> {
  return safeFetchJson<SymbolRegistryResponse>('/api/v1/market/symbol-registry');
}

export async function setActiveSymbolApi(symbol: string): Promise<SymbolRegistryResponse> {
  return safeFetchJson<SymbolRegistryResponse>('/api/v1/market/active-symbol', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol })
  });
}

export async function fetchPipelineStatus(symbol?: string): Promise<PipelineSummary> {
  const url = symbol ? `/api/pipeline/status?symbol=${encodeURIComponent(symbol)}` : '/api/pipeline/status';
  return safeFetchJson<PipelineSummary>(url);
}

export async function triggerPipelineRun(symbol?: string): Promise<PipelineSummary> {
  const url = symbol ? `/api/pipeline/run?symbol=${encodeURIComponent(symbol)}` : '/api/pipeline/run';
  return safeFetchJson<PipelineSummary>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol })
  });
}

export async function fetchCandles(timeframe: string = 'M5', count: number = 30, symbol?: string): Promise<Candle[]> {
  const url = symbol 
    ? `/api/market/candles?timeframe=${timeframe}&count=${count}&symbol=${encodeURIComponent(symbol)}`
    : `/api/market/candles?timeframe=${timeframe}&count=${count}`;
  return safeFetchJson<Candle[]>(url);
}

export async function fetchWebSocketStatus() {
  return safeFetchJson<any>('/api/v1/market/ws-status');
}

export function subscribeToMarketStream(onQuote: (quote: any) => void): () => void {
  let eventSource: EventSource | null = null;
  let lastReceivedMs = 0;

  try {
    eventSource = new EventSource('/api/v1/market/stream');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'quote' && payload.data) {
          lastReceivedMs = Date.now();
          onQuote(payload.data);
        }
      } catch (err) {
        console.error('Failed to parse SSE market stream message:', err);
      }
    };
  } catch (e) {
    // Fallback to polling
  }

  // Backup HTTP ticker poll every 1.5s if SSE stream is idle or delayed
  const pollTimer = setInterval(async () => {
    if (Date.now() - lastReceivedMs > 1500) {
      try {
        const ticker = await safeFetchJson<any>('/api/v1/market/ticker');
        if (ticker && ticker.bid > 0) {
          onQuote(ticker);
        }
      } catch {
        // Ignore transient network errors
      }
    }
  }, 1500);

  return () => {
    clearInterval(pollTimer);
    if (eventSource) {
      eventSource.close();
    }
  };
}

export async function fetchHistoryAnalytics(): Promise<{
  total_observations: number;
  trades_permitted: number;
  trades_blocked: number;
  win_rate_percent: number;
  total_pip_gain: number;
  observations: HistoricalObservation[];
}> {
  return safeFetchJson<any>('/api/history/analytics');
}

export async function fetchSettings() {
  return safeFetchJson<any>('/api/settings');
}

export async function updateSettings(settings: {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  accountId?: string;
  environment?: 'demo' | 'live';
  minConfidence?: number;
  maxDailyDrawdownPercent?: number;
  maxPositionSizeLots?: number;
  minRiskRewardRatio?: number;
  webhookUrl?: string;
  maxQuoteLatenessSeconds?: number;
  maxCronLatenessMinutes?: number;
  alertChannels?: { discord?: boolean; telegram?: boolean; email?: boolean };
  executorApiKey?: string;
  upstreamDecisionApiUrl?: string;
  upstreamDecisionApiKey?: string;
}) {
  return safeFetchJson<any>('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
}

export async function testWebhookNotification(url?: string): Promise<{ success: boolean; message?: string; error?: string }> {
  return safeFetchJson<{ success: boolean; message?: string; error?: string }>('/api/settings/test-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
}

export async function fetchDbIndexMetrics(): Promise<{
  indexedRecordsCount: number;
  postgresConfigured: boolean;
  postgresSchemaReady: boolean;
  activeIndexes: string[];
  cacheProvider: string;
  memoryUsageKb: number;
}> {
  return safeFetchJson<any>('/api/history/db-indexes');
}

export async function refreshPriceTick(): Promise<any> {
  return safeFetchJson<any>('/api/v1/market/refresh-tick', { method: 'POST' });
}

export async function runSandboxSimulation(params: {
  minConfidence: number;
  macroWeight: number;
  technicalWeight: number;
  h4Weight: number;
  h1Weight: number;
  m15Weight: number;
  m5Weight: number;
  rsiOverbought: number;
  rsiOversold: number;
  adxThreshold: number;
  emaCrossBonus: number;
}): Promise<any> {
  return safeFetchJson<any>('/api/history/sandbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
}

export async function fetchSimilarPatterns(rsi: number, adx: number, bias: string): Promise<any[]> {
  return safeFetchJson<any[]>(`/api/history/pattern-recognition?rsi=${rsi}&adx=${adx}&bias=${bias}`);
}

export async function fetchOptimizeWeights(): Promise<any> {
  return safeFetchJson<any>('/api/history/optimize-weights');
}

export async function fetchFeatureStoreJson(): Promise<any[]> {
  return safeFetchJson<any[]>('/api/history/feature-store');
}

export async function fetchExecutorState(): Promise<any> {
  return safeFetchJson<any>('/api/v1/executor-state');
}

export async function fetchDecisions(): Promise<any[]> {
  return safeFetchJson<any[]>('/api/v1/decisions');
}

export async function fetchFeedbacks(): Promise<any[]> {
  return safeFetchJson<any[]>('/api/v1/feedbacks');
}

export async function fetchEvents(): Promise<any[]> {
  return safeFetchJson<any[]>('/api/v1/events');
}

export async function closePosition(positionId: string, reason: string = 'MANUAL'): Promise<any> {
  return safeFetchJson<any>('/api/v1/close-position', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positionId, reason })
  });
}
