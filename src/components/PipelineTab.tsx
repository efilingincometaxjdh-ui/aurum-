import React from 'react';
import { ShieldCheck, ShieldAlert, Cpu, Activity, ArrowRight, CheckCircle2, Lock, AlertTriangle, Terminal } from 'lucide-react';
import { PipelineSummary } from '../types.js';

interface PipelineTabProps {
  pipeline: PipelineSummary | null;
}

export const PipelineTab: React.FC<PipelineTabProps> = ({ pipeline }) => {
  if (!pipeline) return null;

  const { agent02, agent03, agent04, agent05, agent06 } = pipeline;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h2 className="font-display font-bold text-lg text-white">Deterministic Agent Pipeline (A04 - A06)</h2>
        </div>
        <p className="text-xs text-slate-400">
          Agent 04 fuses Technical (A02) and Macro (A03) evidence. Agent 05 enforces fail-closed permission gates. Agent 06 emits read-only alerts.
        </p>
      </div>

      {/* Visual Pipeline Flow Diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
        <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider mb-6">
          System Architecture Data Flow
        </h3>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 min-w-[700px]">
          {/* Inputs Column */}
          <div className="space-y-3 w-full lg:w-48">
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-amber-400 font-bold">Agent 02</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                  {agent02.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Technical Intelligence</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-amber-400 font-bold">Agent 03</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                  {agent03.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Macro & News RSS</p>
            </div>
          </div>

          <ArrowRight className="w-6 h-6 text-slate-600 hidden lg:block shrink-0" />

          {/* Decision Engine Column */}
          <div className="bg-slate-950 border border-amber-500/30 p-4 rounded-xl text-xs w-full lg:w-56 shadow-lg shadow-amber-500/5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-amber-400 font-bold">Agent 04 — Decision</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                {agent04.status}
              </span>
            </div>
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Decision:</span>
                <span className="font-mono font-bold text-white">{agent04.data.decision}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Confidence:</span>
                <span className="font-mono font-bold text-amber-400">{agent04.data.confidence}%</span>
              </div>
            </div>
          </div>

          <ArrowRight className="w-6 h-6 text-slate-600 hidden lg:block shrink-0" />

          {/* Permission Gate Column */}
          <div className="bg-slate-950 border border-emerald-500/30 p-4 rounded-xl text-xs w-full lg:w-56 shadow-lg shadow-emerald-500/5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-emerald-400 font-bold">Agent 05 — Permission</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                {agent05.status}
              </span>
            </div>
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Permission:</span>
                <span className="font-mono font-bold text-emerald-400">{agent05.data.permission}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Min Threshold:</span>
                <span className="font-mono text-slate-300">{agent05.data.minimum_confidence_required}%</span>
              </div>
            </div>
          </div>

          <ArrowRight className="w-6 h-6 text-slate-600 hidden lg:block shrink-0" />

          {/* Alert Gateway Column */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs w-full lg:w-52">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-slate-300 font-bold">Agent 06 — Alert</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                Read-Only
              </span>
            </div>
            <div className="pt-1 border-t border-slate-800 space-y-1 text-[11px]">
              <span className="text-slate-400 block">Execution Authority:</span>
              <span className="font-mono text-rose-400 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                DISABLED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fail-Closed Safety Contracts Check */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agent 04 Fusion Logic */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            Agent 04 Multi-Timeframe Fusion Logic
          </h3>

          <div className="space-y-2 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block mb-1">Timeframe Weighting</span>
              <p className="text-slate-200 font-mono">H4 (Weight 4) &gt; H1 (Weight 3) &gt; M15 (Weight 2) &gt; M5 (Weight 1)</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-slate-400 block mb-1">Evaluation Reasons</span>
              {agent04.data.reasons.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent 05 Permission Rules */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Agent 05 Safety Gate Contracts
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-300">Minimum Confidence Gate</span>
              <span className="font-mono text-emerald-400 font-bold">
                {agent04.data.confidence}% &ge; {agent05.data.minimum_confidence_required}% PASS
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-300">Extreme News Risk Gate</span>
              <span className="font-mono text-emerald-400 font-bold">
                {agent04.data.risk} (PASS - NOT EXTREME)
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-300">Upstream Health Status</span>
              <span className="font-mono text-emerald-400 font-bold">
                ALL SUCCESS
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Permission Reason</span>
              <p className="text-emerald-400 font-medium">{agent05.data.reason}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
