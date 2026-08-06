import React, { useState, useEffect } from 'react';
import { Activity, Clock, RefreshCw, TrendingUp, TrendingDown, Layers, BarChart2 } from 'lucide-react';
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
        const data = await fetchCandles(selectedTf, 35);
        setCandles(data);
      } catch (err) {
        console.error('Failed to load chart candles', err);
      } finally {
        setIsLoadingCandles(false);
      }
    }
    loadCandles();
  }, [selectedTf]);

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
              XAUUSD Price Chart ({selectedTf})
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

      {/* Indicator Cards Grid */}
      {tfData ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">EMA 20</span>
            <span className="font-mono text-lg font-bold text-amber-400">${tfData.ema20?.toFixed(2) || 'N/A'}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">EMA 50</span>
            <span className="font-mono text-lg font-bold text-slate-200">${tfData.ema50?.toFixed(2) || 'N/A'}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">RSI (14)</span>
            <span className={`font-mono text-lg font-bold ${
              (tfData.rsi || 50) > 70 ? 'text-rose-400' : (tfData.rsi || 50) < 30 ? 'text-emerald-400' : 'text-amber-300'
            }`}>
              {tfData.rsi || 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {(tfData.rsi || 50) > 70 ? 'Overbought' : (tfData.rsi || 50) < 30 ? 'Oversold' : 'Neutral'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">ADX (14)</span>
            <span className="font-mono text-lg font-bold text-slate-200">{tfData.adx || 'N/A'}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {(tfData.adx || 0) >= 25 ? 'Strong Trend' : 'Weak Trend'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">ATR (14)</span>
            <span className="font-mono text-lg font-bold text-slate-200">${tfData.atr || 'N/A'}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">Trend Signal</span>
            <span className={`font-mono text-sm font-bold block ${
              tfData.trend === 'Bullish' ? 'text-emerald-400' : tfData.trend === 'Bearish' ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {tfData.trend || 'N/A'}
            </span>
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
