import React, { useState, useEffect } from 'react';
import { Activity, Play, CheckCircle2, XCircle, TrendingUp, BarChart } from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBar, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fetchHistoryAnalytics } from '../services/api.js';
import { HistoricalObservation } from '../types.js';

export const HistoryTab: React.FC = () => {
  const [data, setData] = useState<{
    total_observations: number;
    trades_permitted: number;
    trades_blocked: number;
    win_rate_percent: number;
    total_pip_gain: number;
    observations: HistoricalObservation[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const res = await fetchHistoryAnalytics();
        setData(res);
      } catch (err) {
        console.error('Failed to load history', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-xs">
        Loading historical observations and replay dataset...
      </div>
    );
  }

  const chartData = data.observations.map(obs => ({
    id: obs.id.slice(-5),
    pipGain: obs.outcome?.pnl_pip || 0,
    permission: obs.permission
  }));

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-amber-400" />
          <h2 className="font-display font-bold text-lg text-white">Historical Observations & Replay Analytics</h2>
        </div>
        <p className="text-xs text-slate-400">
          Replays historical market observations through deterministic Agent 04 / 05 engines to verify fail-closed accuracy and pip yield.
        </p>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">Total Observations</span>
          <span className="font-mono text-2xl font-bold text-white">{data.total_observations}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">Permitted Trades</span>
          <span className="font-mono text-2xl font-bold text-emerald-400">{data.trades_permitted}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">Fail-Closed Blocked</span>
          <span className="font-mono text-2xl font-bold text-amber-400">{data.trades_blocked}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">Win Rate (Permitted)</span>
          <span className="font-mono text-2xl font-bold text-emerald-400">{data.win_rate_percent}%</span>
        </div>
      </div>

      {/* Replay Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart className="w-4 h-4 text-amber-400" />
            Historical Outcome PnL (Pips)
          </h3>
          <span className="font-mono text-xs text-emerald-400 font-bold">
            Total Yield: +{data.total_pip_gain} Pips
          </span>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBar data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="id" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} orientation="right" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                formatter={(val: any) => [`${val} Pips`, 'PnL']}
              />
              <Bar dataKey="pipGain" fill="#10b981" radius={[4, 4, 0, 0]} />
            </RechartsBar>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider mb-4">
          Historical Observation Log
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">XAUUSD Price</th>
                <th className="py-2.5 px-3">Decision</th>
                <th className="py-2.5 px-3">Permission</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">PnL (+4h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {data.observations.map((obs) => (
                <tr key={obs.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 text-slate-300">{new Date(obs.timestamp).toLocaleDateString()}</td>
                  <td className="py-3 px-3 font-bold text-amber-400">${obs.price.toFixed(2)}</td>
                  <td className="py-3 px-3 text-slate-200">{obs.decision}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded font-semibold ${
                      obs.permission.startsWith('ALLOW') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {obs.permission}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-200">{obs.confidence}%</td>
                  <td className="py-3 px-3 font-bold">
                    {obs.outcome?.pnl_pip ? (
                      <span className={obs.outcome.pnl_pip >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {obs.outcome.pnl_pip >= 0 ? '+' : ''}{obs.outcome.pnl_pip} pips
                      </span>
                    ) : (
                      <span className="text-slate-500">Filtered</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
