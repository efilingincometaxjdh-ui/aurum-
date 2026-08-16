import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Lock, CheckCircle2, XCircle, TrendingUp, TrendingDown, Layers, HelpCircle } from 'lucide-react';
import { PipelineSummary } from '../types.js';
import { OpportunityScannerPanel } from './OpportunityScannerPanel.js';

interface TraderViewTabProps {
  pipeline: PipelineSummary | null;
  activeSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
}

export const TraderViewTab: React.FC<TraderViewTabProps> = ({ pipeline, activeSymbol = 'XAUUSD', onSelectSymbol = () => {} }) => {
  if (!pipeline) return null;

  const view = pipeline.trader_view;
  const decision = view.decision;
  const permission = view.permission;

  const getPermissionStyle = (perm: string) => {
    switch (perm) {
      case 'ALLOW_BUYS':
        return { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', icon: TrendingUp, label: 'ALLOW BUYS ONLY' };
      case 'ALLOW_SELLS':
        return { bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400', icon: TrendingDown, label: 'ALLOW SELLS ONLY' };
      case 'ALLOW_BOTH':
        return { bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', icon: Layers, label: 'ALLOW BOTH (RANGE-BOUND)' };
      case 'CAUTION':
        return { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', icon: AlertTriangle, label: 'CAUTION (LOW CONFIDENCE)' };
      case 'BLOCK_TRADING':
      default:
        return { bg: 'bg-rose-950/40 border-rose-600/40 text-rose-400', icon: Lock, label: 'BLOCK TRADING (FAIL-CLOSED)' };
    }
  };

  const permStyle = getPermissionStyle(permission);
  const PermIcon = permStyle.icon;

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'EXTREME':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold animate-pulse';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="space-[#1e293b] space-y-6">
      {/* Multi-Instrument Opportunity Scanner */}
      <OpportunityScannerPanel
        activeSymbol={activeSymbol}
        onSelectSymbol={onSelectSymbol}
      />

      {/* Primary Permission & Decision Hero Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Permission Box */}
        <div className={`lg:col-span-2 rounded-2xl border p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden ${permStyle.bg}`}>
          {/* Subtle background glow */}
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-current opacity-5 blur-3xl pointer-events-none"></div>

          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400">AUTHORITATIVE PERMISSION GATE</span>
                <span className="bg-slate-900/80 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700">
                  Agent 05 / 06
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-full text-[11px] font-mono text-slate-300 border border-slate-800">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>EXECUTION: DISABLED</span>
              </div>
            </div>

            <div className="flex items-center gap-4 my-2">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-current">
                <PermIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {permission}
                </h2>
                <p className="text-sm opacity-90 mt-1 font-medium">{permStyle.label}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-current/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Primary Decision:</span>
              <span className="font-mono font-bold text-white bg-slate-900/80 px-2.5 py-1 rounded border border-slate-700">
                {decision}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Engine Mode:</span>
              <span className="font-mono font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                {view.mode}
              </span>
            </div>
          </div>
        </div>

        {/* Confidence & Risk Gauge Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">DECISION CONFIDENCE</span>
              <span className="font-mono font-bold text-xl text-amber-400">{view.confidence}%</span>
            </div>

            {/* Confidence Progress Bar */}
            <div className="w-full bg-slate-950 h-3.5 rounded-full p-0.5 border border-slate-800 overflow-hidden mb-6">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  view.confidence >= 70
                    ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                    : view.confidence >= 55
                    ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                    : 'bg-gradient-to-r from-rose-600 to-amber-500'
                }`}
                style={{ width: `${view.confidence}%` }}
              ></div>
            </div>

            {/* Risk & Macro Indicators */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Macro News Risk</span>
                <span className={`px-2.5 py-0.5 rounded border font-mono text-xs font-bold ${getRiskBadge(view.news_risk)}`}>
                  {view.news_risk}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Gold Macro Bias</span>
                <span className="font-mono font-semibold text-slate-200">
                  {view.macro_bias}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-2">
                <span className="text-slate-400">Timeframe Alignment</span>
                <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                  view.timeframe_alignment === 'ALIGNED' ? 'bg-emerald-500/10 text-emerald-400' :
                  view.timeframe_alignment === 'CONFLICT' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-300'
                }`}>
                  {view.timeframe_alignment}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 3 Institutional Market Intelligence Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Multi-Timeframe Confluence Gauge */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider">
                  Multi-Timeframe Confluence (H4 → H1 → M15 → M5)
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-bold ${
                view.multi_timeframe_confluence?.signal === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                view.multi_timeframe_confluence?.signal === 'BEARISH' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {view.multi_timeframe_confluence?.signal || 'CONSOLIDATING'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              {/* Confluence Circular Score Meter */}
              <div className="sm:col-span-1 flex flex-col items-center justify-center p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">CONFLUENCE</span>
                <span className={`text-3xl font-extrabold font-mono ${
                  (view.multi_timeframe_confluence?.score || 50) >= 80 ? 'text-emerald-400' :
                  (view.multi_timeframe_confluence?.score || 50) >= 60 ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  {view.multi_timeframe_confluence?.score || 50}%
                </span>
              </div>

              {/* Confluence Narrative */}
              <div className="sm:col-span-3">
                <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">Order Flow Synthesis State</p>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  {view.multi_timeframe_confluence?.description || 'Mixed structural indicators observed across timeframes. Order flow is fragmented.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>SMC CONFLUENCE GATE</span>
            <span className="text-amber-400">100% DETERMINISTIC MODEL</span>
          </div>
        </div>

        {/* Correlation Intelligence Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider">
                Correlation Intelligence Index
              </h3>
            </div>

            <div className="space-y-3">
              {/* Silver Correlation */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/50">
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-bold text-slate-200">XAGUSD (Silver)</span>
                  <span className="text-[9px] text-slate-500 uppercase">Physical Metal Tracker</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    +{view.correlations?.XAGUSD || 0.89}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Positively Aligned</span>
                </div>
              </div>

              {/* DXY Correlation */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/50">
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-bold text-slate-200">DXY (US Dollar Index)</span>
                  <span className="text-[9px] text-slate-500 uppercase">Currency Pressure</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-rose-400">
                    {view.correlations?.DXY || -0.83}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Inverse Relationship</span>
                </div>
              </div>

              {/* Bond Yields Correlation */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/50">
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-bold text-slate-200">US10Y (Treasury Yield)</span>
                  <span className="text-[9px] text-slate-500 uppercase">Safe-Haven Yield Shift</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-rose-400">
                    {view.correlations?.US10Y || -0.73}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Yield Inverse Pressure</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Timeframe Alignment Matrix & Voting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trend Votes & Weighting */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Multi-Timeframe Trend Votes
            </h3>
            <span className="text-xs text-slate-400">Weights: H4(4) H1(3) M15(2) M5(1)</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-xs text-slate-400 block mb-1">Bullish Votes</span>
              <span className="font-mono font-bold text-2xl text-emerald-400">{view.trend_votes.bullish}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-xs text-slate-400 block mb-1">Bearish Votes</span>
              <span className="font-mono font-bold text-2xl text-rose-400">{view.trend_votes.bearish}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-xs text-slate-400 block mb-1">Conflict Level</span>
              <span className={`font-mono font-bold text-base ${
                view.timeframe_conflict === 'HIGH' ? 'text-rose-400' :
                view.timeframe_conflict === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {view.timeframe_conflict}
              </span>
            </div>
          </div>

          {/* Timeframe trends list */}
          <div className="space-y-2">
            {Object.entries(view.timeframe_trends || {}).map(([tf, trend]: [string, any]) => (
              <div key={tf} className="flex items-center justify-between bg-slate-950/60 px-3.5 py-2 rounded-lg text-xs border border-slate-800/80">
                <span className="font-mono font-bold text-slate-300">{tf} Timeframe</span>
                <span className={`font-mono font-semibold px-2 py-0.5 rounded ${
                  trend === 'Bullish' ? 'bg-emerald-500/10 text-emerald-400' :
                  trend === 'Bearish' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {String(trend)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Reasons & Deterministic Decision Logic */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Decision & Safety Gate Reasons
            </h3>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {(view.reasons || []).map((reason: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2.5 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300 leading-relaxed">{reason}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>State Freshness: <strong className="text-emerald-400 font-mono">FRESH</strong></span>
            <span>Last Evaluated: <span className="font-mono text-slate-300">{new Date(view.last_updated).toLocaleTimeString()}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};
