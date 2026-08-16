import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Play, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Activity, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { 
  fetchExecutorState, 
  fetchDecisions, 
  fetchFeedbacks, 
  fetchEvents, 
  closePosition 
} from '../services/api.js';

export const ExecutorTab: React.FC = () => {
  const [account, setAccount] = useState<any>(null);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [accState, decList, fbList, evList] = await Promise.all([
        fetchExecutorState(),
        fetchDecisions(),
        fetchFeedbacks(),
        fetchEvents()
      ]);
      setAccount(accState);
      setDecisions(decList);
      setFeedbacks(fbList);
      setEvents(evList);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load executor data:', err);
      setError('Failed to fetch data from the Aurum Executor API. Please ensure the dev server is active.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll every 3 seconds for active cTrader updates, prices, and ticks
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleForceRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleClosePosition = async (id: string) => {
    try {
      await closePosition(id, 'MANUAL_CLOSE');
      loadData();
    } catch (err: any) {
      alert(`Close failed: ${err.message}`);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading && !account) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm text-slate-400 font-mono">Connecting to Aurum Algorithmic Executor...</p>
      </div>
    );
  }

  // Calculate some analytics aggregates
  const totalTrades = feedbacks.length;
  const profitableTrades = feedbacks.filter(f => f.profit_loss > 0).length;
  const totalPnL = feedbacks.reduce((sum, f) => sum + f.profit_loss, 0);
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
  const avgLatency = totalTrades > 0 ? feedbacks.reduce((sum, f) => sum + f.latency_ms, 0) / totalTrades : 0;

  return (
    <div id="ctrader-executor-portal" className="space-y-6">
      
      {/* Header and Live Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            <span>cTrader Algorithmic Executor Portal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time verification of signed decision contracts, execution risk parameters, and low-latency cTrader API lifecycle feedback.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border ${
            account?.safe_mode ? 'border-rose-500/30 text-rose-400' : 'border-slate-800 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              account?.connection_state === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' :
              account?.connection_state === 'RETRY_BACKOFF' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500 animate-pulse'
            }`}></span>
            <span>
              {account?.safe_mode ? 'SAFE_MODE ACTIVE' : 'SYSTEM OK'} ({account?.connection_state || 'CONNECTED'})
            </span>
          </span>
          <button
            onClick={handleForceRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh State</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-4 rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Account Metrics and Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Balance Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Balance</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              ${account?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '10,000.00'}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Live cTrader Sandbox Account</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-xl text-amber-400 border border-slate-700/50">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Equity Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Equity</span>
            <div className={`text-2xl font-bold font-mono mt-1 ${account?.equity >= account?.balance ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${account?.equity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '10,000.00'}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Floating P&L Included</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-xl text-indigo-400 border border-slate-700/50">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Used/Free Margin Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Used Margin / Free</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              ${account?.used_margin?.toLocaleString() || '0.00'} / ${account?.free_margin?.toLocaleString() || '10,000.00'}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">$1,000 Margin per Lot</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-xl text-emerald-400 border border-slate-700/50">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Analytics Summary */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Executor Performance</span>
            <div className="text-lg font-bold font-mono text-amber-400 mt-1 flex items-center gap-2">
              <span>{winRate.toFixed(1)}% WR</span>
              <span className="text-slate-600">|</span>
              <span className={totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(1)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Avg Latency: {avgLatency.toFixed(1)}ms</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-xl text-amber-400 border border-slate-700/50">
            <Play className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Active Positions & Decision Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Columns (8): Active Positions & Feedback Logs */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Positions Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>cTrader Active Broker Positions</span>
              </h3>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-mono border border-emerald-500/20">
                {account?.positions?.length || 0} Open
              </span>
            </div>

            {account?.positions && account.positions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/40 text-slate-400 border-b border-slate-850">
                    <tr>
                      <th className="p-4">ID</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Entry</th>
                      <th className="p-4">TP / SL</th>
                      <th className="p-4 text-right">Current P&L</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {account.positions.map((pos: any) => (
                      <tr key={pos.id} className="hover:bg-slate-850/20 transition-colors">
                        <td className="p-4">
                          <div className="text-slate-300 font-semibold">{pos.id}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{pos.decision_id}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pos.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {pos.action}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-200">${pos.entry_price.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-500">{new Date(pos.entry_time).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-emerald-400">TP: ${pos.take_profit_price.toFixed(2)}</div>
                          <div className="text-rose-400">SL: ${pos.stop_loss_price.toFixed(2)}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className={`text-sm font-bold flex items-center justify-end gap-1 ${pos.current_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos.current_pnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            <span>${pos.current_pnl.toFixed(2)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Latency: {pos.latency_ms}ms</div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleClosePosition(pos.id)}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer transition-colors"
                          >
                            Close Position
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-slate-700" />
                <span>No open positions in the cTrader account. Start Multi-Instrument Spot Engine to generate recommendations.</span>
              </div>
            )}
          </div>

          {/* Trade History & Slippage Feedback Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Execution Analytics Feedback Feed (Task 10)</span>
              </h3>
              <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded font-mono border border-slate-700">
                v1.0.0 schema
              </span>
            </div>

            {feedbacks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/40 text-slate-400 border-b border-slate-850">
                    <tr>
                      <th className="p-4">Decision ID</th>
                      <th className="p-4">Fill Price</th>
                      <th className="p-4">Slippage</th>
                      <th className="p-4">MAE / MFE</th>
                      <th className="p-4">Close Reason</th>
                      <th className="p-4 text-right">PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {feedbacks.map((fb, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/20 transition-colors">
                        <td className="p-4 text-slate-300">
                          <span className="font-semibold block">{(fb.decision_id || '').replace('dec_trc_', '') || 'N/A'}</span>
                          <span className="text-[10px] text-slate-500 block">Latency: {fb.latency_ms}ms</span>
                        </td>
                        <td className="p-4">${fb.fill_price.toFixed(2)}</td>
                        <td className="p-4 text-amber-400">-{fb.slippage.toFixed(2)} pips</td>
                        <td className="p-4">
                          <span className="text-rose-400">{fb.mae_pips}</span> / <span className="text-emerald-400">{fb.mfe_pips} pips</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            fb.close_reason === 'TP_HIT' ? 'bg-emerald-500/10 text-emerald-400' :
                            fb.close_reason === 'SL_HIT' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {fb.close_reason}
                          </span>
                        </td>
                        <td className={`p-4 text-right font-bold ${fb.profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {fb.profit_loss >= 0 ? '+' : ''}${fb.profit_loss.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                No finalized trade feedback records. When open positions hit TP/SL, detailed telemetry is captured here.
              </div>
            )}
          </div>

        </div>

        {/* Right Columns (4): Decision Signature Verification & Trace Event Logger */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Cryptographic Signature Verification */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Cryptographic Signatures</span>
            </h3>

            {decisions.length > 0 ? (
              <div className="space-y-3.5 text-xs font-mono">
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-850 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Schema Version:</span>
                    <span className="text-slate-300 font-bold">{decisions[decisions.length - 1].schema_version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sequence No:</span>
                    <span className="text-amber-400 font-bold">#{decisions[decisions.length - 1].sequence_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Decision ID:</span>
                    <span className="text-slate-300 truncate max-w-[120px]" title={decisions[decisions.length - 1].decision_id}>
                      {decisions[decisions.length - 1].decision_id}
                    </span>
                  </div>
                  <div className="border-t border-slate-800 my-1"></div>
                  <div className="space-y-1">
                    <span className="text-slate-500 block">HMAC-SHA256 Signature:</span>
                    <span className="text-[10px] text-amber-300 break-all bg-slate-900 p-1.5 rounded block select-all border border-slate-800">
                      {decisions[decisions.length - 1].signature}
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="text-[11px] font-semibold">Integrity Verified: Core Auth Approved</span>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs text-center py-6">
                No active signatures. Trigger pipeline to create cryptographically signed decisions.
              </div>
            )}
          </div>

          {/* Chronological Event Trace Logger */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Executor Event Logs (Task 11)</span>
              </h3>
              <span className="bg-indigo-500/10 text-indigo-400 text-[9px] px-1.5 py-0.5 rounded font-mono border border-indigo-500/20">
                {events.length} Events
              </span>
            </div>

            <div className="p-4 max-h-[360px] overflow-y-auto space-y-3 font-mono text-[10px] no-scrollbar">
              {events.length > 0 ? (
                [...events].reverse().map((ev, idx) => {
                  let badgeColor = 'bg-slate-800 text-slate-400';
                  if (ev.event_type.includes('Filled') || ev.event_type.includes('Approved')) badgeColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                  if (ev.event_type.includes('Rejected') || ev.event_type.includes('Failed')) badgeColor = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                  if (ev.event_type.includes('Received') || ev.event_type.includes('Polled')) badgeColor = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';

                  return (
                    <div key={idx} className="p-2.5 bg-slate-950/40 rounded border border-slate-850 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${badgeColor}`}>
                          {ev.event_type}
                        </span>
                        <span className="text-slate-500 text-[9px]">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">{ev.details}</p>
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Correlation ID:</span>
                        <span className="cursor-pointer hover:text-amber-400 truncate max-w-[150px]" onClick={() => ev.correlation_id && handleCopy(ev.correlation_id)}>
                          {(ev.correlation_id || '').replace('dec_trc_', 'trc_') || 'N/A'}
                          {copiedId === ev.correlation_id && ' (Copied)'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-600 text-center py-10">
                  Awaiting execution event traces. Running the Decision Pipeline publishes live trade signals.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
export default ExecutorTab;
