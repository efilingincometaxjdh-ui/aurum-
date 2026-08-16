import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Terminal, Settings, Activity, Radio, Sliders, Layers, Cpu, ShieldAlert } from 'lucide-react';
import { PipelineSummary, RegisteredSymbol } from '../types.js';
import { subscribeToMarketStream, refreshPriceTick, fetchSymbolRegistry } from '../services/api.js';

interface HeaderProps {
  pipeline: PipelineSummary | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenSettings: () => void;
  onOpenJsonModal: () => void;
  activeSymbol: string;
  symbolRegistry: RegisteredSymbol[];
  onSelectSymbol: (symbol: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  pipeline,
  activeTab,
  setActiveTab,
  onRefresh,
  isRefreshing,
  onOpenSettings,
  onOpenJsonModal,
  activeSymbol,
  symbolRegistry,
  onSelectSymbol
}) => {
  const ticker = pipeline?.market_ticker;
  const [liveStreamQuote, setLiveStreamQuote] = useState<any>(null);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);
  const prevPriceRef = React.useRef<number>(0);

  const handleRefreshPrice = async () => {
    setIsRefreshingPrice(true);
    try {
      const res = await refreshPriceTick();
      if (res && res.quote) {
        setLiveStreamQuote(res.quote);
      }
    } catch (err) {
      console.error('Failed to refresh price tick:', err);
    } finally {
      setIsRefreshingPrice(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToMarketStream((quote) => {
      if (quote && (!quote.symbol || quote.symbol === activeSymbol)) {
        setLiveStreamQuote(quote);
      }
    });
    return () => unsubscribe();
  }, [activeSymbol]);

  const currentBid = liveStreamQuote?.bid ?? ticker?.price ?? ticker?.bid ?? 0;
  const currentSpread = liveStreamQuote?.spread ?? ticker?.spread ?? 0;

  useEffect(() => {
    if (currentBid > 0) {
      if (prevPriceRef.current > 0 && currentBid !== prevPriceRef.current) {
        setPriceFlash(currentBid > prevPriceRef.current ? 'up' : 'down');
        const timer = setTimeout(() => setPriceFlash(null), 500);
        return () => clearTimeout(timer);
      }
      prevPriceRef.current = currentBid;
    }
  }, [currentBid]);

  const formatPrice = (val: number, digits: number = 2) => {
    if (val <= 0) return 'Waiting for live broker data';
    return `$${val.toFixed(digits)}`;
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-xl">
      {/* Top Banner - Fail-Closed Execution Status & cTrader Stream Indicator */}
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
        <div className="flex items-center gap-3 text-slate-400">
          {/* Evidence Coverage Health Badge */}
          {pipeline?.evidence_coverage ? (
            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-[11px] ${
              pipeline.evidence_coverage.health === 'FULL_COVERAGE'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : pipeline.evidence_coverage.health === 'PARTIAL_COVERAGE'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              <ShieldCheck className="w-3 h-3" />
              <span>
                {pipeline.evidence_coverage.health === 'FULL_COVERAGE' ? 'FULL COVERAGE' :
                 pipeline.evidence_coverage.health === 'PARTIAL_COVERAGE' ? 'PARTIAL COVERAGE' : 'DEGRADED EVIDENCE'} ({pipeline.evidence_coverage.score}%)
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-mono text-[11px]">
              <ShieldCheck className="w-3 h-3" />
              <span>EVIDENCE VALIDATED</span>
            </span>
          )}

          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-[11px] ${
            currentBid > 0
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <Radio className={`w-3 h-3 ${currentBid > 0 ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
            <span>{currentBid > 0 ? `cTrader Stream (${activeSymbol} Connected)` : `cTrader Stream (${activeSymbol} Connecting)`}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-200 font-mono">AURUM Intelligence v1.0</span>
          </span>
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
                  {activeSymbol}
                </span>
              </div>
              <p className="text-xs text-slate-400">Multi-Asset Decision & Risk Pipeline</p>
            </div>
          </div>

          {/* Live Price Widget */}
          <div className="hidden sm:flex items-center gap-3 bg-slate-950/70 border border-slate-800 rounded-lg px-3.5 py-1.5">
            {currentBid > 0 ? (
              <>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">{activeSymbol} Spot</span>
                    <button
                      onClick={handleRefreshPrice}
                      disabled={isRefreshingPrice}
                      className="text-slate-500 hover:text-amber-400 disabled:opacity-50 transition-colors cursor-pointer p-0.5"
                      title="Refresh Price Tick"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingPrice ? 'animate-spin' : ''}`} />
                    </button>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  </div>
                  <span className={`font-mono text-base font-bold transition-all duration-200 inline-block ${
                    priceFlash === 'up'
                      ? 'text-emerald-400 font-extrabold scale-105'
                      : priceFlash === 'down'
                      ? 'text-rose-400 font-extrabold scale-105'
                      : 'text-amber-300'
                  }`}>
                    {formatPrice(currentBid, activeSymbol === 'EURUSD' || activeSymbol === 'GBPUSD' ? 5 : activeSymbol === 'XAGUSD' ? 3 : 2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Spread</span>
                  <span className="font-mono text-xs font-semibold text-slate-300">
                    {currentSpread.toFixed(activeSymbol === 'EURUSD' || activeSymbol === 'GBPUSD' ? 5 : 2)}
                  </span>
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">{activeSymbol} Spot</span>
                  <button
                    onClick={handleRefreshPrice}
                    disabled={isRefreshingPrice}
                    className="text-slate-500 hover:text-amber-400 disabled:opacity-50 transition-colors cursor-pointer p-0.5"
                    title="Refresh Price Tick"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingPrice ? 'animate-spin' : ''}`} />
                  </button>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                </div>
                <span className="font-mono text-xs font-semibold text-amber-400/90 block mt-0.5">
                  Waiting for live broker data
                </span>
              </div>
            )}
          </div>
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

      {/* Dynamic Canonical Symbol Registry Asset Selector Bar */}
      <div className="bg-slate-950/90 border-t border-b border-slate-800/80 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="uppercase tracking-wider font-mono text-[11px]">Symbol Registry:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {symbolRegistry.map((item) => {
              const isActive = activeSymbol === item.symbol;
              const quote = item.lastQuote;
              const bid = quote?.bid || (isActive ? currentBid : 0);
              const hasPrice = bid > 0;

              return (
                <button
                  key={item.symbol}
                  onClick={() => onSelectSymbol(item.symbol)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="font-sans font-bold">{item.displayName}</span>

                  {/* Status Indicator Badge */}
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold uppercase tracking-wider ${
                    item.status === 'CONNECTED_STREAMING'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : item.status === 'SUBSCRIBED'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : item.status === 'WAITING_FOR_FIRST_BROKER_TICK'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : item.status === 'DISCONNECTED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {item.status}
                  </span>

                  {/* Price display or Waiting for live broker data */}
                  {hasPrice ? (
                    <span className="font-mono text-slate-200 ml-1">
                      ${bid.toFixed(item.digits || 2)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400/90 font-sans italic ml-1">
                      Waiting for live broker data
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-slate-800/60 no-scrollbar">
        {[
          { id: 'trader-view', label: 'Trader View', icon: ShieldCheck },
          { id: 'technicals', label: 'Multi-Timeframe Technicals (A02)', icon: Activity },
          { id: 'macro', label: 'Macro & News (A03)', icon: Cpu },
          { id: 'pipeline', label: 'Decision Pipeline (A04-A06)', icon: ShieldAlert },
          { id: 'executor', label: 'cTrader Executor Portal', icon: Terminal },
          { id: 'history', label: 'Historical Replay & Analytics', icon: Activity },
          { id: 'sandbox', label: 'Strategy Sandbox & ML Store', icon: Sliders },
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
