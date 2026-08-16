import React, { useState, useEffect } from 'react';
import { Activity, Clock, RefreshCw, TrendingUp, TrendingDown, Layers, BarChart2, Compass, Zap, Crosshair, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PipelineSummary, Timeframe, Candle } from '../types.js';
import { fetchCandles } from '../services/api.js';

interface TechnicalTabProps {
  pipeline: PipelineSummary | null;
}

export const TechnicalTab: React.FC<TechnicalTabProps> = ({ pipeline }) => {
  const [selectedTf, setSelectedTf] = useState<Timeframe>('M5');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoadingCandles, setIsLoadingCandles] = useState(false);

  const agent02 = pipeline?.agent02;
  const tfData = agent02?.data?.[selectedTf];

  useEffect(() => {
    async function loadCandles() {
      setIsLoadingCandles(true);
      try {
        const activeSym = pipeline?.market_ticker?.symbol;
        const data = await fetchCandles(selectedTf, 35, activeSym);
        setCandles(data);
      } catch (err) {
        console.error('Failed to load chart candles', err);
      } finally {
        setIsLoadingCandles(false);
      }
    }
    loadCandles();
  }, [selectedTf, pipeline?.market_ticker?.symbol]);

  if (!agent02) return null;

  return (
    <div className="space-y-6">
      {/* Header Info & Timeframe Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-amber-400" />
            <h2 className="font-display font-bold text-lg text-white">Agent 02 — Multi-Timeframe Technical Intelligence</h2>
          </div>
          <p className="text-xs text-slate-400">
            Calculates EMA20, EMA50, RSI14, ATR14, ADX14 and market structure across 4 required timeframes.
          </p>
        </div>

        {/* Timeframe Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          {(['M5', 'M15', 'H1', 'H4'] as Timeframe[]).map((tf) => {
            const active = selectedTf === tf;
            return (
              <button
                key={tf}
                onClick={() => setSelectedTf(tf)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Chart Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider">
              {pipeline?.market_ticker?.symbol || 'XAUUSD'} Price Chart ({selectedTf})
            </h3>
          </div>
          {tfData?.close_price && (
            <span className="font-mono text-sm font-bold text-amber-400">
              Close: ${tfData.close_price.toFixed(2)}
            </span>
          )}
        </div>

        <div className="h-64 sm:h-72 w-full">
          {isLoadingCandles ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Loading {selectedTf} Candles...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={candles}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={11} tickLine={false} orientation="right" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Price']}
                />
                <Area type="monotone" dataKey="close" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Indicator & SMC Analytics Dashboard */}
      {tfData ? (
        <div className="space-y-6">
          {/* Row 1: Traditional Indicators & Core SMC Status */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block mb-1">EMA 20</span>
              <span className="font-mono text-base font-bold text-amber-400">${tfData.ema20?.toFixed(2) || 'N/A'}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block mb-1">EMA 50</span>
              <span className="font-mono text-base font-bold text-slate-200">${tfData.ema50?.toFixed(2) || 'N/A'}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block mb-1">RSI (14)</span>
              <span className={`font-mono text-base font-bold block ${
                (tfData.rsi || 50) > 70 ? 'text-rose-400' : (tfData.rsi || 50) < 30 ? 'text-emerald-400' : 'text-amber-300'
              }`}>
                {tfData.rsi || 'N/A'}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                {(tfData.rsi || 50) > 70 ? 'Overbought' : (tfData.rsi || 50) < 30 ? 'Oversold' : 'Neutral'}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block mb-1">ADX (14)</span>
              <span className="font-mono text-base font-bold text-slate-200">{tfData.adx || 'N/A'}</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                {(tfData.adx || 0) >= 25 ? 'Strong Trend' : 'Weak Trend'}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block mb-1">ATR (14)</span>
              <span className="font-mono text-base font-bold text-slate-200">${tfData.atr || 'N/A'}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block mb-1">Market Regime</span>
              <span className="font-mono text-xs font-bold text-amber-400 block truncate">
                {tfData.smc?.regime?.classification?.replace('TRENDING_', '') || 'RANGING'}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                Vol: {tfData.smc?.regime.volatilityIndex.toFixed(1) || '0.0'}
              </span>
            </div>
          </div>

          {/* Row 2: SMC Contextual Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Session & Dealing Range Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="font-display text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  Dealing Range & Session Context
                </h4>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400">Trading Session</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">
                      {tfData.smc?.context.currentSession || 'NEWYORK'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400">Pricing Zone</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      tfData.smc?.context.pricingZone === 'PREMIUM' ? 'bg-rose-500/10 text-rose-400' :
                      tfData.smc?.context.pricingZone === 'DISCOUNT' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {tfData.smc?.context.pricingZone || 'EQUILIBRIUM'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Dealing Range</span>
                      <span className="text-slate-200">
                        ${tfData.smc?.context.dealingRange.low.toFixed(2)} - ${tfData.smc?.context.dealingRange.high.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Structure (BOS / CHoCH) Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h4 className="font-display text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Structural Breaks (BOS / CHoCH)
              </h4>

              <div className="space-y-2 max-h-[145px] overflow-y-auto pr-1">
                {tfData.smc?.choch.slice(-1).map((ch, idx) => (
                  <div key={`ch-${idx}`} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 font-mono text-xs">
                    <span className="text-amber-400 font-bold">CHoCH Breakout</span>
                    <span className={`font-semibold ${ch.type.includes('BULLISH') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${ch.price.toFixed(2)}
                    </span>
                  </div>
                ))}
                {tfData.smc?.bos.slice(-2).map((b, idx) => (
                  <div key={`bos-${idx}`} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 font-mono text-xs">
                    <span className="text-slate-300">BOS Breakout</span>
                    <span className={`font-semibold ${b.type.includes('BULLISH') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${b.price.toFixed(2)}
                    </span>
                  </div>
                ))}
                {(!tfData.smc?.bos.length && !tfData.smc?.choch.length) && (
                  <div className="text-center py-6 text-slate-500 font-mono text-xs">
                    No structural breaks in current range.
                  </div>
                )}
              </div>
            </div>

            {/* Institutional Block & Gaps Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h4 className="font-display text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-amber-400" />
                Supply / Demand Order Blocks (OB)
              </h4>

              <div className="space-y-2 max-h-[145px] overflow-y-auto pr-1">
                {tfData.smc?.orderBlocks.slice(0, 3).map((ob, idx) => (
                  <div key={`ob-${idx}`} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/50 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${ob.type === 'BULLISH' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      <span className="text-slate-300">{ob.type === 'BULLISH' ? 'Demand Block' : 'Supply Block'}</span>
                    </div>
                    <span className={`font-semibold ${ob.type === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${ob.low.toFixed(2)} - ${ob.high.toFixed(2)}
                    </span>
                  </div>
                ))}
                {!tfData.smc?.orderBlocks.length && (
                  <div className="text-center py-6 text-slate-500 font-mono text-xs">
                    No active institutional order blocks.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Imbalance (FVG) and Liquidity Sweeps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fair Value Gaps (FVG) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-display text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Fair Value Gaps (FVG / Imbalances)
                </h4>
                <span className="text-[10px] font-mono text-slate-500">Imbalance Ratio: {(tfData.smc?.context.imbalanceRatio || 0).toFixed(1)}%</span>
              </div>

              <div className="space-y-2 font-mono text-xs max-h-[150px] overflow-y-auto pr-1">
                {tfData.smc?.fvgs.slice(0, 3).map((f, idx) => (
                  <div key={`fvg-${idx}`} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className={f.type === 'BULLISH' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {f.type === 'BULLISH' ? 'Bullish Gap (Discount)' : 'Bearish Gap (Premium)'}
                    </span>
                    <span className="text-slate-300">
                      ${f.bottom.toFixed(2)} - ${f.top.toFixed(2)}
                    </span>
                  </div>
                ))}
                {!tfData.smc?.fvgs.length && (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No unmitigated imbalances (FVGs) in this window.
                  </div>
                )}
              </div>
            </div>

            {/* Liquidity Highs/Lows and Sweeps */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h4 className="font-display text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Liquidity Pools & Sweeps Analysis
              </h4>

              <div className="space-y-2 font-mono text-xs max-h-[150px] overflow-y-auto pr-1">
                {tfData.smc?.liquidity.sweeps.slice(-3).map((sw, idx) => (
                  <div key={`sweep-${idx}`} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">Liquidity Sweep</span>
                    <span className="text-slate-300">
                      Swept ${sw.triggerPrice.toFixed(2)} at ${sw.sweepPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
                {tfData.smc?.liquidity.equalHighs.map((eh, idx) => (
                  <div key={`eh-${idx}`} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/50">
                    <span className="text-rose-400 font-bold">EQH (Equal Highs Pool)</span>
                    <span className="text-slate-300">${eh.price.toFixed(2)}</span>
                  </div>
                ))}
                {tfData.smc?.liquidity.equalLows.map((el, idx) => (
                  <div key={`el-${idx}`} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/50">
                    <span className="text-emerald-400 font-bold">EQL (Equal Lows Pool)</span>
                    <span className="text-slate-300">${el.price.toFixed(2)}</span>
                  </div>
                ))}
                {(!tfData.smc?.liquidity.sweeps.length && !tfData.smc?.liquidity.equalHighs.length && !tfData.smc?.liquidity.equalLows.length) && (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No significant liquidity pools detected.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-sm">
          No technical data available for timeframe {selectedTf}.
        </div>
      )}

      {/* All Timeframes Overview Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider mb-4">
          Multi-Timeframe Technical Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono">
                <th className="py-2.5 px-3">Timeframe</th>
                <th className="py-2.5 px-3">Trend</th>
                <th className="py-2.5 px-3">EMA20 vs EMA50</th>
                <th className="py-2.5 px-3">RSI (14)</th>
                <th className="py-2.5 px-3">ADX (14)</th>
                <th className="py-2.5 px-3">Structure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {(['H4', 'H1', 'M15', 'M5'] as Timeframe[]).map((tf) => {
                const item = agent02.data[tf];
                if (!item) return null;
                const isEmaBullish = (item.ema20 || 0) > (item.ema50 || 0);

                return (
                  <tr key={tf} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-amber-400">{tf}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        item.trend === 'Bullish' ? 'bg-emerald-500/10 text-emerald-400' :
                        item.trend === 'Bearish' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.trend}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={isEmaBullish ? 'text-emerald-400' : 'text-rose-400'}>
                        {isEmaBullish ? 'EMA20 > EMA50' : 'EMA20 < EMA50'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-200">{item.rsi}</td>
                    <td className="py-3 px-3 text-slate-200">{item.adx}</td>
                    <td className="py-3 px-3 text-slate-400 font-sans">{item.structure || 'Normal'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
