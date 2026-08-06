import { PipelineSummary, Candle, HistoricalObservation } from '../types.js';

export async function fetchPipelineStatus(): Promise<PipelineSummary> {
  const res = await fetch('/api/pipeline/status');
  if (!res.ok) throw new Error('Failed to fetch pipeline status');
  return res.json();
}

export async function triggerPipelineRun(): Promise<PipelineSummary> {
  const res = await fetch('/api/pipeline/run', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to run pipeline');
  const data = await res.json();
  return data.data;
}

export async function fetchCandles(timeframe: string = 'M5', count: number = 30): Promise<Candle[]> {
  const res = await fetch(`/api/market/candles?timeframe=${timeframe}&count=${count}`);
  if (!res.ok) throw new Error('Failed to fetch candles');
  return res.json();
}

export async function fetchHistoryAnalytics(): Promise<{
  total_observations: number;
  trades_permitted: number;
  trades_blocked: number;
  win_rate_percent: number;
  total_pip_gain: number;
  observations: HistoricalObservation[];
}> {
  const res = await fetch('/api/history/analytics');
  if (!res.ok) throw new Error('Failed to fetch history analytics');
  return res.json();
}

export async function updateSettings(settings: { apiKey?: string; minConfidence?: number }) {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}
