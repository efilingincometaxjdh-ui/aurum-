import React from 'react';
import { Cpu, Rss, AlertCircle, TrendingUp, TrendingDown, Clock, ShieldAlert, Calendar, AlertTriangle } from 'lucide-react';
import { PipelineSummary } from '../types.js';

interface MacroTabProps {
  pipeline: PipelineSummary | null;
}

export const MacroTab: React.FC<MacroTabProps> = ({ pipeline }) => {
  if (!pipeline) return null;

  const agent03 = pipeline.agent03;
  const agent01 = pipeline.agent01;
  const headlines = agent03.data.headlines || [];
  const calendarEvents = agent03.data.calendar_events || [];
  const blackoutActive = agent03.data.blackout_active;
  const activeBlackoutEvent = agent03.data.active_blackout_event;

  return (
    <div className="space-y-6">
      {/* Blackout Active Banner if EXTREME news risk */}
      {blackoutActive && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-rose-500 text-white px-2 py-0.5 rounded uppercase">
                  EXTREME BLACKOUT ACTIVE
                </span>
                <span className="text-xs text-rose-300 font-medium">Agent 05 Safety Gate Engaged</span>
              </div>
              <p className="text-xs text-rose-200/90 mt-1">
                Active news blackout window for <strong className="text-white">{activeBlackoutEvent}</strong>. Trading permissions automatically locked (`BLOCK_TRADING`).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-5 h-5 text-amber-400" />
            <h2 className="font-display font-bold text-lg text-white">Agent 03 — Macro & News Intelligence</h2>
          </div>
          <p className="text-xs text-slate-400">
            Consumes official Federal Reserve RSS feeds & structured economic calendar feeds for automated event blackout protection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Macro Risk</span>
            <span className={`font-mono text-sm font-bold ${
              agent03.data.news_risk === 'LOW' ? 'text-emerald-400' :
              agent03.data.news_risk === 'MEDIUM' ? 'text-blue-400' :
              agent03.data.news_risk === 'HIGH' ? 'text-amber-400' : 'text-rose-400 animate-pulse'
            }`}>
              {agent03.data.news_risk}
            </span>
          </div>

          <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Gold Bias</span>
            <span className="font-mono text-amber-400 text-sm font-bold">
              {agent03.data.gold_bias}
            </span>
          </div>
        </div>
      </div>

      {/* Structured Economic Calendar Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Economic Calendar Feed & Blackout Windows
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated ±15m (HIGH) to ±30m (CRITICAL) blackout windows protect account capital from news volatility.
            </p>
          </div>
          <span className="text-xs font-mono bg-slate-950 text-slate-300 border border-slate-800 px-3 py-1 rounded-lg self-start sm:self-center">
            {calendarEvents.length} Calendar Releases Tracked
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {calendarEvents.map((event) => {
            const isBlackout = event.blackout_active;
            const timeFormatted = event.time_until_minutes > 0
              ? `in ${Math.floor(event.time_until_minutes / 60)}h ${Math.abs(event.time_until_minutes % 60)}m`
              : `${Math.abs(event.time_until_minutes)}m ago`;

            return (
              <div
                key={event.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isBlackout
                    ? 'bg-rose-500/10 border-rose-500/40'
                    : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold bg-slate-800 text-slate-200 px-2 py-0.5 rounded">
                      {event.country}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      event.impact === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      event.impact === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {event.impact} IMPACT
                    </span>
                    {isBlackout && (
                      <span className="text-[10px] font-mono font-bold bg-rose-500 text-white px-2 py-0.5 rounded animate-pulse">
                        BLACKOUT ACTIVE (±{event.blackout_window_minutes}m)
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-100">{event.title}</p>
                  <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-0.5">
                    {event.forecast && <span>Forecast: <strong className="text-slate-200">{event.forecast}</strong></span>}
                    {event.previous && <span>Previous: <strong className="text-slate-300">{event.previous}</strong></span>}
                    {event.actual && <span>Actual: <strong className="text-emerald-400">{event.actual}</strong></span>}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Scheduled</span>
                    <span className="text-xs font-mono font-semibold text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {timeFormatted}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metrics & Agent Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <span className="text-xs text-slate-400 uppercase tracking-widest font-mono block mb-2">Macro Score</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-extrabold text-3xl text-amber-400">{agent03.data.macro_score}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full mt-3 overflow-hidden border border-slate-800">
            <div className="bg-amber-400 h-full rounded-full" style={{ width: `${agent03.data.macro_score}%` }}></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <span className="text-xs text-slate-400 uppercase tracking-widest font-mono block mb-2">Confidence Level</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-extrabold text-3xl text-emerald-400">{agent03.data.confidence}%</span>
          </div>
          <p className="text-xs text-slate-400 mt-3">High statistical confidence derived from Federal Reserve primary RSS feeds.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase tracking-widest font-mono">Agent 01 Research</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Legacy / Research</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-400">USD Bias:</span>
            <span className="font-mono text-rose-400 font-semibold">{agent01.data.usd_bias}</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-400">LLM Gold Bias:</span>
            <span className="font-mono text-emerald-400 font-semibold">{agent01.data.gold_bias}</span>
          </div>
        </div>
      </div>

      {/* Headlines RSS Scored Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Rss className="w-4 h-4 text-amber-400" />
            Federal Reserve & Macro Feed Headlines
          </h3>
          <span className="text-xs text-slate-400">{headlines.length} Observed Headlines</span>
        </div>

        <div className="space-y-3">
          {headlines.map((item, i) => (
            <div key={i} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-semibold text-amber-400">{item.source}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {item.pubDate}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-200 leading-relaxed">{item.title}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                  item.bias === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  item.bias === 'BEARISH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-300'
                }`}>
                  {item.impact_score > 0 ? `+${item.impact_score}` : item.impact_score} {item.bias}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

