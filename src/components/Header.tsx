import React from 'react';
import { ShieldCheck, RefreshCw, Terminal, Settings, ShieldAlert, Cpu, Activity } from 'lucide-react';
import { PipelineSummary } from '../types.js';

interface HeaderProps {
  pipeline: PipelineSummary | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenSettings: () => void;
  onOpenJsonModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pipeline,
  activeTab,
  setActiveTab,
  onRefresh,
  isRefreshing,
  onOpenSettings,
  onOpenJsonModal
}) => {
  const ticker = pipeline?.market_ticker;
  const isPositive = (ticker?.change_24h || 0) >= 0;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-xl">
      {/* Top Banner - Fail-Closed Execution Status */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-1.5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-400">FAIL-CLOSED CONTRACT ACTIVE</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300">Read-Only Safety Gate (Execution Disabled)</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-200 font-mono">XAUUSD Spot Engine v1.0</span>
          </span>
          <span className="text-slate-600">|</span>
          <span>Health: <strong className="text-emerald-400">SUCCESS</strong></span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Market Ticker */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/10 flex items-center justify-center">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg text-white tracking-wider">AURUM</h1>
                <span className="bg-amber-500/10 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/20 font-semibold">
                  XAUUSD
                </span>
              </div>
              <p className="text-xs text-slate-400">Modular Gold Intelligence Infrastructure</p>
            </div>
          </div>

          {/* Live Price Widget */}
          {ticker && (
            <div className="hidden sm:flex items-center gap-3 bg-slate-950/70 border border-slate-800 rounded-lg px-3.5 py-1.5">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">XAU/USD Spot</span>
                <span className="font-mono text-base font-bold text-amber-300">${ticker.price.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">24h Change</span>
                <span className={`font-mono text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}{ticker.change_24h.toFixed(2)} ({isPositive ? '+' : ''}{ticker.change_percent_24h}%)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-lg transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Evaluating...' : 'Run Pipeline'}</span>
          </button>

          <button
            onClick={onOpenJsonModal}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Inspect Agent State JSON Contracts"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">JSON Contracts</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Engine Settings & API Keys"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-slate-800/60 no-scrollbar">
        {[
          { id: 'trader-view', label: 'Trader View', icon: ShieldCheck },
          { id: 'technicals', label: 'Multi-Timeframe Technicals (A02)', icon: Activity },
          { id: 'macro', label: 'Macro & News (A03)', icon: Cpu },
          { id: 'pipeline', label: 'Decision Pipeline (A04-A06)', icon: ShieldAlert },
          { id: 'history', label: 'Historical Replay & Analytics', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'border-amber-400 text-amber-400 bg-amber-500/5 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
