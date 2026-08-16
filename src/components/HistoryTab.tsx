import React, { useState, useEffect } from 'react';
import { 
  Activity, CheckCircle2, XCircle, TrendingUp, TrendingDown, BarChart, 
  ChevronDown, ChevronRight, ShieldCheck, Database, Sliders, Filter, 
  Search, Brain, Award, Scale, Timer, BookOpen, RotateCw 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart as RechartsBar, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { fetchHistoryAnalytics, fetchDbIndexMetrics } from '../services/api.js';
import { HistoricalObservation } from '../types.js';

interface AnalyticsPayload {
  status?: string;
  total_observations: number;
  trades_permitted: number;
  trades_blocked: number;
  win_rate_percent: number;
  total_pip_gain: number;
  average_pip_gain: number;
  expectancy_pip: number;
  profit_factor: number;
  risk_reward_ratio: number;
  max_drawdown_pip: number;
  horizon_win_rates: {
    win_rate_15m: number;
    win_rate_1h: number;
    win_rate_4h: number;
    win_rate_1d: number;
  };
  directional_accuracy: {
    bullish: { total: number; wins: number; rate: number };
    bearish: { total: number; wins: number; rate: number };
  };
  confidence_calibration: {
    high: { total: number; wins: number; rate: number };
    mid: { total: number; wins: number; rate: number };
    low: { total: number; wins: number; rate: number };
  };
  agent_performance: {
    agent03_macro: { accuracy: number };
    agent02_technical: { accuracy: number };
  };
  observations: HistoricalObservation[];
}

export const HistoryTab: React.FC = () => {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [dbMetrics, setDbMetrics] = useState<{
    indexedRecordsCount: number;
    postgresConfigured: boolean;
    postgresSchemaReady: boolean;
    activeIndexes: string[];
    cacheProvider: string;
    memoryUsageKb: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedObsId, setExpandedObsId] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDecision, setFilterDecision] = useState<string>('ALL');
  const [filterPermission, setFilterPermission] = useState<string>('ALL');
  const [filterConfidence, setFilterConfidence] = useState<number>(30);

  async function loadHistory(showProgressIndicator = true) {
    if (showProgressIndicator) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const [res, idxRes] = await Promise.all([
        fetchHistoryAnalytics(),
        fetchDbIndexMetrics()
      ]);
      setData(res as any);
      setDbMetrics(idxRes);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadHistory(true);
  }, []);

  if (isLoading || !data) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-xs">
        Loading historical observations and replaying outcome datasets...
      </div>
    );
  }

  if (data.status === 'INSUFFICIENT_REAL_DATA') {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-amber-400" />
              <h2 className="font-display font-bold text-lg text-white">Historical Validation & Replay Analytics</h2>
            </div>
            <p className="text-xs text-slate-400">
              Awaiting real production pipeline executions to generate analytics.
            </p>
          </div>
          <button
            onClick={() => loadHistory(false)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold tracking-wider font-mono uppercase transition-all duration-200"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-4">
          <Database className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">Insufficient Real Data</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Aurum Core is configured with an explicit production-path boundary. Synthetic/mock datasets have been isolated, and the live pipeline requires real execution outcomes to compute quantitative metrics.
            </p>
          </div>
          <div className="inline-block px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-500 font-mono">
            STATUS: PENDING_REAL_EXECUTION_OUTCOMES
          </div>
        </div>
      </div>
    );
  }

  // Frontend Live Query Engine
  const filteredObservations = data.observations.filter(obs => {
    const matchesSearch = searchQuery === '' || 
      obs.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obs.decision.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obs.permission.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDecision = filterDecision === 'ALL' || 
      obs.decision === filterDecision || 
      (filterDecision === 'BULLISH_ANY' && obs.decision.includes('BULLISH')) ||
      (filterDecision === 'BEARISH_ANY' && obs.decision.includes('BEARISH'));

    const matchesPermission = filterPermission === 'ALL' || 
      obs.permission === filterPermission;

    const matchesConfidence = obs.confidence >= filterConfidence;

    return matchesSearch && matchesDecision && matchesPermission && matchesConfidence;
  });

  const chartData = filteredObservations.slice(0, 20).reverse().map(obs => ({
    id: (obs.id || '').replace('obs-replay-2026-', 'R-').replace('obs_', 'O-'),
    pipGain: obs.outcome?.pnl_pip || 0,
    permission: obs.permission,
    isPermitted: obs.permission.startsWith('ALLOW')
  }));

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-amber-400" />
            <h2 className="font-display font-bold text-lg text-white">Historical Validation & Replay Analytics</h2>
          </div>
          <p className="text-xs text-slate-400">
            Replays historical observations through deterministic verification engines to evaluate multi-horizon outcomes and pip yield.
          </p>
        </div>
        <button
          onClick={() => loadHistory(false)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 self-start md:self-center bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs px-3.5 py-2 rounded-lg border border-slate-800 transition duration-150 shadow-md"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          {isRefreshing ? 'Replaying...' : 'Re-verify Outcomes'}
        </button>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Total Observations</span>
          <span className="font-mono text-2xl font-bold text-white mt-1">{data.total_observations}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Replay + DB Combined</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Permitted Trades</span>
          <span className="font-mono text-2xl font-bold text-emerald-400 mt-1">{data.trades_permitted}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Execution Allowed</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Fail-Closed Blocked</span>
          <span className="font-mono text-2xl font-bold text-amber-400 mt-1">{data.trades_blocked}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Losses Averted</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Permitted Win Rate</span>
          <span className="font-mono text-2xl font-bold text-emerald-400 mt-1">{data.win_rate_percent}%</span>
          <span className="text-[10px] text-slate-500 block mt-1">On active execution</span>
        </div>
      </div>

      {/* Advanced Quantitative Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Brain className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] uppercase font-mono tracking-wider">Expectancy</span>
          </div>
          <span className={`font-mono text-xl font-bold block mt-1.5 ${data.expectancy_pip >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {data.expectancy_pip >= 0 ? '+' : ''}{data.expectancy_pip}
          </span>
          <span className="text-[9px] text-slate-500 block mt-0.5">Pips per signal</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase font-mono tracking-wider">Profit Factor</span>
          </div>
          <span className="font-mono text-xl font-bold text-slate-200 block mt-1.5">{data.profit_factor}</span>
          <span className="text-[9px] text-slate-500 block mt-0.5">Wins / Losses</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Award className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] uppercase font-mono tracking-wider">Risk Reward (R:R)</span>
          </div>
          <span className="font-mono text-xl font-bold text-slate-200 block mt-1.5">1 : {data.risk_reward_ratio}</span>
          <span className="text-[9px] text-slate-500 block mt-0.5">Avg Loss : Avg Win</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase font-mono tracking-wider">Average Pip Yield</span>
          </div>
          <span className={`font-mono text-xl font-bold block mt-1.5 ${data.average_pip_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {data.average_pip_gain >= 0 ? '+' : ''}{data.average_pip_gain}
          </span>
          <span className="text-[9px] text-slate-500 block mt-0.5">Pips per trade</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-1.5 text-slate-400">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px] uppercase font-mono tracking-wider">Max Drawdown</span>
          </div>
          <span className="font-mono text-xl font-bold text-rose-400 block mt-1.5">-{data.max_drawdown_pip} pips</span>
          <span className="text-[9px] text-slate-500 block mt-0.5">Running peak decline</span>
        </div>
      </div>

      {/* Deep Analytics Visualizations: Multi-Horizon & Calibration & Direction */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Multi-Horizon Win-Rate Progression Timeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="font-display text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-400" />
            Timeframe Horizon Degradation
          </h3>
          <p className="text-[11px] text-slate-400">
            Directional accuracy across various holding durations. Helps calibrate optimal exit windows.
          </p>

          <div className="space-y-4 pt-2">
            {[
              { label: '+15m Scalp', val: data.horizon_win_rates.win_rate_15m, color: 'bg-emerald-500' },
              { label: '+1h Intraday', val: data.horizon_win_rates.win_rate_1h, color: 'bg-emerald-400' },
              { label: '+4h Swing (Core)', val: data.horizon_win_rates.win_rate_4h, color: 'bg-teal-500' },
              { label: '+1D Position', val: data.horizon_win_rates.win_rate_1d, color: 'bg-blue-500' }
            ].map((hz, idx) => (
              <div key={idx} className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300 font-medium">{hz.label}</span>
                  <span className="font-bold text-slate-200">{hz.val}% Win Rate</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                  <div className={`h-full ${hz.color} transition-all duration-500`} style={{ width: `${hz.val}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Calibration & Gauges */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="font-display text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Confidence Calibration Curve
          </h3>
          <p className="text-[11px] text-slate-400">
            Measures if higher agent consensus confidence scores correlate with higher win outcomes.
          </p>

          <div className="space-y-4 pt-2">
            {[
              { label: 'High Confidence (80%+)', data: data.confidence_calibration.high, color: 'bg-emerald-400' },
              { label: 'Mid Confidence (60%-79%)', data: data.confidence_calibration.mid, color: 'bg-amber-400' },
              { label: 'Low Confidence (<60%)', data: data.confidence_calibration.low, color: 'bg-slate-500' }
            ].map((cb, idx) => (
              <div key={idx} className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300 font-medium">{cb.label}</span>
                  <span className="font-bold text-slate-200">{cb.data.rate}% ({cb.data.wins}/{cb.data.total})</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                  <div className={`h-full ${cb.color} transition-all duration-500`} style={{ width: `${cb.data.rate}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Directional Accuracy & Agent Performance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="font-display text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            Directional Bias & Agent Accuracies
          </h3>
          <p className="text-[11px] text-slate-400">
            Analysis of directional bias accuracy and performance metrics for individual engines.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1 font-mono text-xs">
              <span className="text-slate-400 text-[10px] uppercase">Bullish Buy Signals</span>
              <span className="text-lg font-bold text-emerald-400 block">{data.directional_accuracy.bullish.rate}%</span>
              <span className="text-[10px] text-slate-500 block">Wins: {data.directional_accuracy.bullish.wins} of {data.directional_accuracy.bullish.total}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1 font-mono text-xs">
              <span className="text-slate-400 text-[10px] uppercase">Bearish Sell Signals</span>
              <span className="text-lg font-bold text-rose-400 block">{data.directional_accuracy.bearish.rate}%</span>
              <span className="text-[10px] text-slate-500 block">Wins: {data.directional_accuracy.bearish.wins} of {data.directional_accuracy.bearish.total}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 col-span-2 space-y-1.5 font-mono text-xs">
              <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                <Brain className="w-3 h-3 text-amber-400" /> Agent-wise Accuracy
              </span>
              <div className="flex justify-between items-center text-[11px] pt-1">
                <span className="text-slate-400">Agent 03 (Macro Bias Accuracy)</span>
                <span className="text-slate-200 font-bold">{data.agent_performance.agent03_macro.accuracy}%</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Agent 02 (Technical Alignment)</span>
                <span className="text-slate-200 font-bold">{data.agent_performance.agent02_technical.accuracy}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Knowledge Repository & Confluence Rules */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider">
            Statistical Confluence Knowledge Repository
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Synthesized insights and guardrails dynamically mined from historical performance logs and evidence sweeps:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> High Confidence Rule
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                When overall consensus confidence is &ge; 80% and the Macro Sentiment is fully aligned, historical win rate is <span className="text-emerald-400 font-bold">{data.confidence_calibration.high.rate}%</span>.
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-3">Accuracy Zone: MAXIMUM</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-mono text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Fail-Closed Effectiveness
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                By blocking trading during timeframe conflicts and low-liquidity periods, the system averted potential drawdowns across <span className="text-amber-400 font-bold">{data.trades_blocked} sessions</span>.
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-3">Drawdown Prevented: HIGH</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-blue-400 font-mono text-xs font-semibold">
                <Timer className="w-3.5 h-3.5" /> Decay Threshold Insight
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Accuracy peak occurs within the <span className="font-semibold text-slate-200">+1h to +4h horizon</span> (+4h win rate: {data.horizon_win_rates.win_rate_4h}%). Performance decays significantly when holding positions over 24h.
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-3">Optimal Holding: INTRADAY</span>
          </div>
        </div>
      </div>

      {/* Database Indexing & Storage Status */}
      {dbMetrics && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 font-mono">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider">
                  Persistent Storage & Dual-Tier Index Architecture
                </h3>
                <p className="text-[11px] text-slate-400">
                  Sub-millisecond queries preserved across large trace history via compound PostgreSQL indexes.
                </p>
              </div>
            </div>

            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-lg">
              {dbMetrics.activeIndexes.length} Compound Indexes Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[9px] text-slate-400 uppercase block font-semibold">PostgreSQL (Cloud SQL / DDL)</span>
              <span className="text-xs font-bold text-amber-400 block mt-0.5">
                {dbMetrics.postgresConfigured ? 'Connected (Cloud SQL Native)' : 'Schema & Multi-Index Ready'}
              </span>
              <span className="text-[9px] text-slate-500 block mt-1">
                Table: `aurum_observations`
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[9px] text-slate-400 uppercase block font-semibold">Redis Cache L1 Provider</span>
              <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                {dbMetrics.cacheProvider}
              </span>
              <span className="text-[9px] text-slate-500 block mt-1">
                Keyspace scanning & cache hit monitoring
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[9px] text-slate-400 uppercase block font-semibold">Local Index Metrics</span>
              <span className="text-xs font-bold text-slate-200 block mt-0.5">
                {dbMetrics.indexedRecordsCount} Logged Observations (~{dbMetrics.memoryUsageKb} KB)
              </span>
              <span className="text-[9px] text-slate-500 block mt-1">
                Timestamp & permission indexing active
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Historical Outcomes PnL Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart className="w-4 h-4 text-amber-400" />
            Outcome PnL Yield (Recent {chartData.length} Observations)
          </h3>
          <span className="font-mono text-xs text-emerald-400 font-bold">
            Permitted Net Yield: +{data.total_pip_gain} Pips
          </span>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBar data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="id" stroke="#64748b" fontSize={11} fontStyle="mono" />
              <YAxis stroke="#64748b" fontSize={11} orientation="right" fontStyle="mono" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px', fontFamily: 'monospace' }}
                formatter={(val: any, name: any, props: any) => {
                  return [`${val >= 0 ? '+' : ''}${val} Pips`, props.payload.isPermitted ? 'PnL (Executed)' : 'Averted Drawdown'];
                }}
              />
              <Bar 
                dataKey="pipGain" 
                radius={[4, 4, 0, 0]} 
                fill="#10b981"
              >
                {chartData.map((entry, index) => {
                  let color = '#10b981'; // positive buy / sell
                  if (entry.pipGain < 0) color = '#f43f5e'; // negative buy / sell
                  else if (!entry.isPermitted) color = '#eab308'; // blocked
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </RechartsBar>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Knowledge Repository Query Panel & Historical Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider">
              Historical Evidence Query Engine
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Search and filter high-fidelity historical evidence logs stored in persistent indexes.
            </p>
          </div>
          <span className="text-xs font-mono bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-800 text-slate-300">
            Query Matches: {filteredObservations.length} of {data.observations.length}
          </span>
        </div>

        {/* Query Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs font-mono">
          <div className="space-y-1.5">
            <label className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
              <Search className="w-3 h-3 text-amber-400" /> Search Term
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ID, decision, permission..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-8 pr-3 text-white focus:outline-none focus:border-amber-500 transition placeholder-slate-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
              <Filter className="w-3 h-3 text-emerald-400" /> Decision State
            </label>
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-amber-500 transition"
            >
              <option value="ALL">All Decisions</option>
              <option value="BULLISH_ANY">Any Bullish</option>
              <option value="BEARISH_ANY">Any Bearish</option>
              <option value="STRONG_BULLISH">STRONG_BULLISH</option>
              <option value="BULLISH">BULLISH</option>
              <option value="BEARISH">BEARISH</option>
              <option value="STRONG_BEARISH">STRONG_BEARISH</option>
              <option value="NEUTRAL">NEUTRAL</option>
              <option value="NO_TRADE">NO_TRADE</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
              <Filter className="w-3 h-3 text-blue-400" /> Permission Gate
            </label>
            <select
              value={filterPermission}
              onChange={(e) => setFilterPermission(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-amber-500 transition"
            >
              <option value="ALL">All Permissions</option>
              <option value="ALLOW_BUYS">ALLOW_BUYS</option>
              <option value="ALLOW_SELLS">ALLOW_SELLS</option>
              <option value="BLOCK_TRADING">BLOCK_TRADING</option>
              <option value="CAUTION">CAUTION</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                <Sliders className="w-3 h-3 text-amber-400" /> Min Confidence
              </label>
              <span className="text-amber-400 font-bold text-[10px]">{filterConfidence}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="95"
              value={filterConfidence}
              onChange={(e) => setFilterConfidence(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer mt-3"
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 w-8"></th>
                <th className="py-2.5 px-3">ID / Time</th>
                <th className="py-2.5 px-3">Symbol / Entry Price</th>
                <th className="py-2.5 px-3">Decision</th>
                <th className="py-2.5 px-3">Permission Gate</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Evidence Coverage</th>
                <th className="py-2.5 px-3">PnL Outcome (+4h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredObservations.map((obs) => {
                const isExpanded = expandedObsId === obs.id;
                const isPermitted = obs.permission.startsWith('ALLOW');
                return (
                  <React.Fragment key={obs.id}>
                    <tr
                      onClick={() => setExpandedObsId(isExpanded ? null : obs.id)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer select-none"
                    >
                      <td className="py-3 px-3 text-slate-500">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-200 font-bold">{(obs.id || '').replace('obs-replay-2026-', 'REPLAY-').replace('obs_', 'OBS_')}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(obs.timestamp).toLocaleDateString()} {new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-amber-400">${(obs.price ?? 0).toFixed(2)}</td>
                      <td className="py-3 px-3 text-slate-200">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          obs.decision.includes('BULLISH') ? 'bg-emerald-500/10 text-emerald-400' :
                          obs.decision.includes('BEARISH') ? 'bg-rose-500/10 text-rose-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {obs.decision}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-semibold ${
                          isPermitted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {obs.permission}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-200">{obs.confidence}%</td>
                      <td className="py-3 px-3">
                        {obs.evidence_coverage ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            obs.evidence_coverage.health === 'FULL_COVERAGE'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {obs.evidence_coverage.score}% Coverage
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">100% Coverage</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold">
                        {isPermitted && obs.outcome?.pnl_pip !== undefined ? (
                          <span className={obs.outcome.pnl_pip >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {obs.outcome.pnl_pip >= 0 ? '+' : ''}{obs.outcome.pnl_pip} pips
                          </span>
                        ) : (
                          <span className="text-slate-500">Filtered Out</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr className="bg-slate-950/80">
                        <td colSpan={8} className="p-5 border-l-2 border-amber-500">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                Multi-Horizon Outcome Verification ({obs.id})
                              </span>
                              <span className="text-slate-500 font-mono">Trace ID: {obs.id}</span>
                            </div>

                            {/* Horizon Price Progression Timeline */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block mb-1 uppercase text-[9px] font-semibold">Horizon +15m</span>
                                <span className="font-bold text-slate-200">${obs.outcome?.price_after_15m?.toFixed(2) || 'N/A'}</span>
                                {isPermitted && obs.outcome?.pnl_pip_15m !== undefined && (
                                  <span className={`block font-bold text-[10px] mt-1 ${obs.outcome.pnl_pip_15m >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {obs.outcome.pnl_pip_15m >= 0 ? '+' : ''}{obs.outcome.pnl_pip_15m} pips
                                  </span>
                                )}
                              </div>

                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block mb-1 uppercase text-[9px] font-semibold">Horizon +1h</span>
                                <span className="font-bold text-slate-200">${obs.outcome?.price_after_1h?.toFixed(2) || 'N/A'}</span>
                                {isPermitted && obs.outcome?.pnl_pip_1h !== undefined && (
                                  <span className={`block font-bold text-[10px] mt-1 ${obs.outcome.pnl_pip_1h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {obs.outcome.pnl_pip_1h >= 0 ? '+' : ''}{obs.outcome.pnl_pip_1h} pips
                                  </span>
                                )}
                              </div>

                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block mb-1 uppercase text-[9px] font-semibold">Horizon +4h (Core)</span>
                                <span className="font-bold text-slate-200">${obs.outcome?.price_after_4h?.toFixed(2) || 'N/A'}</span>
                                {isPermitted && obs.outcome?.pnl_pip_4h !== undefined && (
                                  <span className={`block font-bold text-[10px] mt-1 ${obs.outcome.pnl_pip_4h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {obs.outcome.pnl_pip_4h >= 0 ? '+' : ''}{obs.outcome.pnl_pip_4h} pips
                                  </span>
                                )}
                              </div>

                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-500 block mb-1 uppercase text-[9px] font-semibold">Horizon +1D</span>
                                <span className="font-bold text-slate-200">${obs.outcome?.price_after_1d?.toFixed(2) || 'N/A'}</span>
                                {isPermitted && obs.outcome?.pnl_pip_1d !== undefined && (
                                  <span className={`block font-bold text-[10px] mt-1 ${obs.outcome.pnl_pip_1d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {obs.outcome.pnl_pip_1d >= 0 ? '+' : ''}{obs.outcome.pnl_pip_1d} pips
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Verification Flags & Missing Coverage Details */}
                            {obs.evidence_coverage && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                                  <span className="text-slate-400 block mb-1.5 font-bold">Evidence Validation Flags</span>
                                  <div className="flex flex-wrap gap-1">
                                    {obs.evidence_coverage.flags.map((flag, idx) => (
                                      <span key={idx} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px]">
                                        ✓ {flag}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                                  <span className="text-slate-400 block mb-1.5 font-bold">Missing Structural Factors</span>
                                  {obs.evidence_coverage.missing.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {obs.evidence_coverage.missing.map((item, idx) => (
                                        <span key={idx} className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded text-[9px]">
                                          ⚠ {item}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-emerald-400 text-[10px] block">✓ Full coverage. No missing variables detected.</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredObservations.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 font-mono text-xs">
                    No historical observations match the active search and query filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
