import React, { useEffect, useState } from 'react';
import { Radar, RefreshCw, ChevronDown, ChevronUp, Activity, Lock, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Layers, ArrowRight } from 'lucide-react';
import { fetchOpportunityScanner } from '../services/api.js';
import { OpportunityItem, OpportunityScannerResponse } from '../types.js';

interface OpportunityScannerPanelProps {
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const OpportunityScannerPanel: React.FC<OpportunityScannerPanelProps> = ({
  activeSymbol,
  onSelectSymbol
}) => {
  const [scannerData, setScannerData] = useState<OpportunityScannerResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      const res = await fetchOpportunityScanner();
      if (res && res.opportunities) {
        setScannerData(res);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to load opportunity scanner data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'BUY':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold px-2.5 py-1 rounded-md">
            <TrendingUp className="w-3 h-3" /> BUY
          </span>
        );
      case 'SELL':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-mono font-bold px-2.5 py-1 rounded-md">
            <TrendingDown className="w-3 h-3" /> SELL
          </span>
        );
      case 'WAIT':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 border border-slate-700 text-xs font-mono font-medium px-2.5 py-1 rounded-md">
            <Layers className="w-3 h-3" /> WAIT
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono px-2 py-0.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE
          </span>
        );
      case 'WAITING FOR LIVE DATA':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
            <Activity className="w-2.5 h-2.5 animate-spin" /> WAITING FOR LIVE DATA
          </span>
        );
      case 'INSUFFICIENT MARKET DATA':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
            <AlertTriangle className="w-2.5 h-2.5" /> INSUFFICIENT MARKET DATA
          </span>
        );
      case 'STALE':
      case 'DISCONNECTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold animate-pulse">
            <Lock className="w-2.5 h-2.5" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-4">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Radar className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold text-white tracking-wide uppercase">
                Opportunity Scanner
              </h2>
              <span className="bg-slate-950 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                Multi-Instrument
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous multi-agent opportunity ranking across live market feeds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="hidden sm:inline">Updated: {lastRefreshed.toLocaleTimeString()}</span>
          <button
            onClick={() => loadData()}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Scanner"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Display */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
              <th className="py-2.5 px-3">Symbol</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">Confidence</th>
              <th className="py-2.5 px-3">R:R</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Last Update</th>
              <th className="py-2.5 px-3 text-right">Analysis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {scannerData?.opportunities?.map((item: OpportunityItem) => {
              const isActive = item.symbol === activeSymbol;
              const isExpanded = expandedSymbol === item.symbol;

              return (
                <React.Fragment key={item.symbol}>
                  <tr
                    className={`transition-colors cursor-pointer ${
                      isActive ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-slate-800/40'
                    }`}
                    onClick={() => onSelectSymbol(item.symbol)}
                  >
                    {/* SYMBOL */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">
                          {item.displayName || item.symbol}
                        </span>
                        {isActive && (
                          <span className="text-[9px] uppercase font-sans font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {item.currentBid > 0 ? `Bid: ${item.currentBid}` : 'No Quote'}
                      </span>
                    </td>

                    {/* ACTION */}
                    <td className="py-3 px-3">
                      {getActionBadge(item.action)}
                    </td>

                    {/* CONFIDENCE */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${item.confidence >= 70 ? 'text-emerald-400' : item.confidence >= 55 ? 'text-amber-400' : 'text-slate-400'}`}>
                          {item.confidence > 0 ? `${item.confidence}%` : '—'}
                        </span>
                        {item.confidence > 0 && (
                          <div className="w-12 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full rounded-full ${item.confidence >= 70 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                              style={{ width: `${item.confidence}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* R:R */}
                    <td className="py-3 px-3 font-semibold text-slate-300">
                      {item.riskReward}
                    </td>

                    {/* STATUS */}
                    <td className="py-3 px-3">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* LAST UPDATE */}
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '—'}
                    </td>

                    {/* ANALYSIS DETAILS BUTTON */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSymbol(item.symbol);
                          }}
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-sans font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSymbol(isExpanded ? null : item.symbol);
                          }}
                          className="p-1 hover:bg-slate-800 text-slate-400 rounded cursor-pointer"
                          title="Expand Opportunity Evidence"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* EXPANDED EVIDENCE DRAWER */}
                  {isExpanded && (
                    <tr className="bg-slate-950/90 border-t border-slate-800/80">
                      <td colSpan={7} className="p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-sans">
                          {/* Entry & Risk Info */}
                          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg space-y-1">
                            <span className="text-[10px] font-mono text-slate-500 uppercase block">Trade Execution Parameters</span>
                            <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                              <span>Entry Zone:</span> <strong className="text-amber-400">{item.entryZone}</strong>
                            </div>
                            <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                              <span>Stop Loss:</span> <strong className="text-rose-400">{item.stopLoss}</strong>
                            </div>
                            <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                              <span>Take Profit:</span> <strong className="text-emerald-400">{item.takeProfit}</strong>
                            </div>
                            <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                              <span>Account Risk:</span> <strong>{item.riskPercent}</strong>
                            </div>
                          </div>

                          {/* Technical & Structure Evidence */}
                          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg space-y-1">
                            <span className="text-[10px] font-mono text-slate-500 uppercase block">Technical & Structure Evidence</span>
                            <p className="text-[11px] text-slate-300 leading-snug">{item.technicalEvidence}</p>
                            <p className="text-[10px] font-mono text-emerald-400 font-semibold">{item.marketStructureEvidence}</p>
                          </div>

                          {/* Macro & Liquidity Evidence */}
                          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg space-y-1">
                            <span className="text-[10px] font-mono text-slate-500 uppercase block">Macro & Liquidity Synthesis</span>
                            <p className="text-[11px] text-slate-300 leading-snug">{item.macroEvidence}</p>
                            <span className="text-[10px] font-mono text-slate-400 block">{item.liquidityEvidence}</span>
                          </div>

                          {/* Risk & Provenance */}
                          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg space-y-1">
                            <span className="text-[10px] font-mono text-slate-500 uppercase block">Risk & Data Provenance</span>
                            <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                              <span>Risk State:</span> <strong className="text-amber-300">{item.riskAssessment}</strong>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">
                              Source: {item.dataProvenance}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">
                              Decision ID: {item.decisionId}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
