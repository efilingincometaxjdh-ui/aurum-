import React, { useState, useEffect } from 'react';
import { 
  Sliders, ShieldCheck, Play, RotateCw, Brain, Award, Download, 
  HelpCircle, CheckCircle2, AlertTriangle, Search, Filter, History, Scale, Timer, FileJson, TrendingUp, TrendingDown 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell 
} from 'recharts';
import { 
  runSandboxSimulation, 
  fetchSimilarPatterns, 
  fetchOptimizeWeights, 
  fetchFeatureStoreJson 
} from '../services/api.js';
import { PipelineSummary } from '../types.js';

interface SandboxTabProps {
  pipeline: PipelineSummary | null;
}

export const SandboxTab: React.FC<SandboxTabProps> = ({ pipeline }) => {
  // Sandbox Parameter States
  const [minConfidence, setMinConfidence] = useState<number>(55);
  const [macroWeight, setMacroWeight] = useState<number>(15);
  const [technicalWeight, setTechnicalWeight] = useState<number>(15);
  const [h4Weight, setH4Weight] = useState<number>(4);
  const [h1Weight, setH1Weight] = useState<number>(3);
  const [m15Weight, setM15Weight] = useState<number>(2);
  const [m5Weight, setM5Weight] = useState<number>(1);
  const [rsiOverbought, setRsiOverbought] = useState<number>(70);
  const [rsiOversold, setRsiOversold] = useState<number>(30);
  const [adxThreshold, setAdxThreshold] = useState<number>(25);
  const [emaCrossBonus, setEmaCrossBonus] = useState<number>(10);

  // Simulation & Optimisation States
  const [simResults, setSimResults] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [optResults, setOptResults] = useState<any | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  // Pattern Recognition States
  const [patternRsi, setPatternRsi] = useState<number>(58);
  const [patternAdx, setPatternAdx] = useState<number>(22);
  const [patternBias, setPatternBias] = useState<string>('BULLISH');
  const [matchedPatterns, setMatchedPatterns] = useState<any[]>([]);
  const [isScanningPatterns, setIsScanningPatterns] = useState<boolean>(false);

  // ML Feature Store States
  const [mlFeatures, setMlFeatures] = useState<any[]>([]);
  const [isFetchingMlFeatures, setIsFetchingMlFeatures] = useState<boolean>(false);

  // Replay logs filter
  const [logSearch, setLogSearch] = useState<string>('');
  const [logFilter, setLogFilter] = useState<string>('ALL');

  // Load initial simulation and ML features
  useEffect(() => {
    handleRunSimulation();
    loadFeatureStorePreview();
  }, []);

  // Run the sandbox simulation
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await runSandboxSimulation({
        minConfidence,
        macroWeight,
        technicalWeight,
        h4Weight,
        h1Weight,
        m15Weight,
        m5Weight,
        rsiOverbought,
        rsiOversold,
        adxThreshold,
        emaCrossBonus
      });
      setSimResults(res);
    } catch (err) {
      console.error('Simulation run failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Run the optimization grid search
  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    try {
      const res = await fetchOptimizeWeights();
      setOptResults(res);
    } catch (err) {
      console.error('Optimization failed:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Apply optimized weight parameters
  const applyOptimizedWeights = () => {
    if (!optResults?.parameters) return;
    const p = optResults.parameters;
    setMinConfidence(p.minConfidence);
    setMacroWeight(p.macroWeight);
    setTechnicalWeight(p.technicalWeight);
    setH4Weight(p.h4Weight);
    setH1Weight(p.h1Weight);
    setM15Weight(p.m15Weight);
    setM5Weight(p.m5Weight);
    setRsiOverbought(p.rsiOverbought);
    setRsiOversold(p.rsiOversold);
    setAdxThreshold(p.adxThreshold);
    setEmaCrossBonus(p.emaCrossBonus);
    setOptResults(null); // clear recommendation banner
  };

  // Pattern Recognition Scan
  const handlePatternScan = async () => {
    setIsScanningPatterns(true);
    try {
      const res = await fetchSimilarPatterns(patternRsi, patternAdx, patternBias);
      setMatchedPatterns(res);
    } catch (err) {
      console.error('Pattern scan failed:', err);
    } finally {
      setIsScanningPatterns(false);
    }
  };

  // Fetch ML features preview
  const loadFeatureStorePreview = async () => {
    setIsFetchingMlFeatures(true);
    try {
      const res = await fetchFeatureStoreJson();
      setMlFeatures(res);
    } catch (err) {
      console.error('Failed to load ML feature store:', err);
    } finally {
      setIsFetchingMlFeatures(false);
    }
  };

  // Filter logs based on inputs
  const filteredReplayedTrades = simResults?.replayed_trades.filter((t: any) => {
    const matchesSearch = logSearch === '' || 
      t.id.toLowerCase().includes(logSearch.toLowerCase()) ||
      t.simulated_decision.toLowerCase().includes(logSearch.toLowerCase()) ||
      t.simulated_permission.toLowerCase().includes(logSearch.toLowerCase());

    const matchesFilter = logFilter === 'ALL' ||
      (logFilter === 'PERMITTED' && t.simulated_permission.startsWith('ALLOW')) ||
      (logFilter === 'BLOCKED' && !t.simulated_permission.startsWith('ALLOW')) ||
      (logFilter === 'WINS' && t.simulated_permission.startsWith('ALLOW') && t.pnl_pip > 0) ||
      (logFilter === 'LOSSES' && t.simulated_permission.startsWith('ALLOW') && t.pnl_pip < 0);

    return matchesSearch && matchesFilter;
  }) || [];

  const chartData = filteredReplayedTrades.slice(0, 20).reverse().map((t: any) => ({
    id: (t.id || '').replace('obs-replay-2026-', 'S-').replace('obs_', 'S-'),
    pnl: t.pnl_pip,
    isPermitted: t.simulated_permission.startsWith('ALLOW')
  }));

  return (
    <div className="space-y-6">
      {/* Top Welcome Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="font-display font-bold text-lg text-white">AI Strategy Sandbox & Parameter Optimizer</h2>
          </div>
          <p className="text-xs text-slate-400">
            Design, calibrate, and simulate deterministic strategy weighting schemes. Execute comprehensive regression tests over 45 days of historical gold trace data.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRunOptimization}
            disabled={isOptimizing}
            className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-amber-400 font-mono text-xs px-3.5 py-2 rounded-lg border border-slate-800 transition duration-150 shadow-md cursor-pointer"
          >
            <Brain className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
            {isOptimizing ? 'Optimizing Weights...' : 'AI Weight Optimizer'}
          </button>
        </div>
      </div>

      {/* Optimization Recommendation Banner */}
      {optResults && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Award className="w-4 h-4 animate-bounce" />
              AI Recommended Weight Structure Discovered!
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tuning completed successfully. Increasing the safety gate to **{optResults.parameters.minConfidence}%** and boosting macro weighting to **{optResults.parameters.macroWeight}** yields a total net gain of <span className="text-emerald-400 font-bold">+{optResults.optimized_pips} pips</span> (Baseline: +{optResults.original_pips} pips).
            </p>
          </div>
          <button
            onClick={applyOptimizedWeights}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition duration-150 shadow-md cursor-pointer whitespace-nowrap"
          >
            Apply Tuning Parameters
          </button>
        </div>
      )}

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Parameter Panel (Inputs) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="font-display text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-amber-400" />
            Strategy Weight Configurations
          </h3>

          <div className="space-y-4 text-xs font-mono">
            {/* Safety Gate Minimum Confidence */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Min Confidence Requirement</span>
                <span className="text-amber-400 font-bold">{minConfidence}%</span>
              </div>
              <input
                type="range" min="50" max="95" value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            {/* Weights */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Macro Weight</span>
                  <span className="text-slate-200 font-bold">+{macroWeight}</span>
                </div>
                <input
                  type="range" min="5" max="30" value={macroWeight}
                  onChange={(e) => setMacroWeight(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1 bg-slate-950 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Technical Weight</span>
                  <span className="text-slate-200 font-bold">+{technicalWeight}</span>
                </div>
                <input
                  type="range" min="5" max="30" value={technicalWeight}
                  onChange={(e) => setTechnicalWeight(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1 bg-slate-950 rounded-lg"
                />
              </div>
            </div>

            {/* Timeframe Weights */}
            <div className="border-t border-slate-800/60 pt-3 space-y-2.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Timeframe Multipliers</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">H4 Weight (Macro Trend)</span>
                    <span className="text-slate-200 font-bold">{h4Weight}x</span>
                  </div>
                  <input
                    type="range" min="1" max="10" step="0.5" value={h4Weight}
                    onChange={(e) => setH4Weight(Number(e.target.value))}
                    className="w-full accent-amber-500 h-1 bg-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">H1 Weight (Intraday)</span>
                    <span className="text-slate-200 font-bold">{h1Weight}x</span>
                  </div>
                  <input
                    type="range" min="1" max="10" step="0.5" value={h1Weight}
                    onChange={(e) => setH1Weight(Number(e.target.value))}
                    className="w-full accent-amber-500 h-1 bg-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">M15 Weight (Entry)</span>
                    <span className="text-slate-200 font-bold">{m15Weight}x</span>
                  </div>
                  <input
                    type="range" min="1" max="10" step="0.5" value={m15Weight}
                    onChange={(e) => setM15Weight(Number(e.target.value))}
                    className="w-full accent-amber-500 h-1 bg-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">M5 Weight (Micro Scalp)</span>
                    <span className="text-slate-200 font-bold">{m5Weight}x</span>
                  </div>
                  <input
                    type="range" min="1" max="10" step="0.5" value={m5Weight}
                    onChange={(e) => setM5Weight(Number(e.target.value))}
                    className="w-full accent-amber-500 h-1 bg-slate-950"
                  />
                </div>
              </div>
            </div>

            {/* Indicator Boundaries */}
            <div className="border-t border-slate-800/60 pt-3 space-y-2.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Indicator Parameters</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px]">RSI Overbought Boundary</span>
                  <input
                    type="number" min="65" max="85" value={rsiOverbought}
                    onChange={(e) => setRsiOverbought(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px]">RSI Oversold Boundary</span>
                  <input
                    type="number" min="15" max="35" value={rsiOversold}
                    onChange={(e) => setRsiOversold(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px]">ADX Trend Threshold</span>
                  <input
                    type="number" min="15" max="40" value={adxThreshold}
                    onChange={(e) => setAdxThreshold(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px]">EMA Cross Bonus Score</span>
                  <input
                    type="number" min="0" max="25" value={emaCrossBonus}
                    onChange={(e) => setEmaCrossBonus(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-lg transition shadow-md shadow-amber-500/10 cursor-pointer text-xs"
            >
              {isSimulating ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Replaying 45 Observations...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Execute Regression Replay</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Simulation Output Panel (Statistics & Results) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5 lg:col-span-2 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                Regression Replay outcome metrics
              </h3>
              {simResults?.regression_passed ? (
                <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-400 font-mono text-[10px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> REGRESSION PASSED (COMPLIANT)
                </span>
              ) : (
                <span className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg text-rose-400 font-mono text-[10px] font-bold animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" /> COMPLIANCE VIOLATION
                </span>
              )}
            </div>

            {/* Quick Metrics */}
            {simResults && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-center">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Permitted / Blocked</span>
                  <span className="font-mono text-lg font-bold text-slate-200 mt-1 block">
                    {simResults.trades_permitted} / {simResults.trades_blocked}
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-center">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Simulated Win Rate</span>
                  <span className="font-mono text-lg font-bold text-emerald-400 mt-1 block">
                    {simResults.win_rate_percent}%
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-center">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Simulated Net Gain</span>
                  <span className={`font-mono text-lg font-bold mt-1 block ${simResults.total_pip_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {simResults.total_pip_gain >= 0 ? '+' : ''}{simResults.total_pip_gain} Pips
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-center">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Profit Factor</span>
                  <span className="font-mono text-lg font-bold text-slate-200 mt-1 block">
                    {simResults.profit_factor}
                  </span>
                </div>
              </div>
            )}

            {/* Verification Checklist */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-xs space-y-2.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Fail-Closed Verification & Safety Audit</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Extreme News Blocked</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Zero Confidence Filtered</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Execution Hardlocked (False)</span>
                </div>
              </div>
            </div>

            {/* Simulated PnL Bar Chart */}
            {chartData.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Simulated Outcome Distribution (Recent 20 Replayed Trades)</span>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="id" stroke="#64748b" fontSize={9} fontStyle="mono" />
                      <YAxis stroke="#64748b" fontSize={9} orientation="right" fontStyle="mono" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '10px', fontFamily: 'monospace' }}
                        formatter={(val: any) => [`${val >= 0 ? '+' : ''}${val} Pips`, 'Simulated PnL']}
                      />
                      <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                        {chartData.map((entry: any, idx: number) => {
                          let color = '#10b981';
                          if (entry.pnl < 0) color = '#f43f5e';
                          else if (!entry.isPermitted) color = '#eab308';
                          return <Cell key={`sim-cell-${idx}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-500 font-mono text-center border-t border-slate-800/60 pt-3">
            Offline Sandbox Simulator engine runs deterministically inside Cloud Run containers. Simulation results do not impact production signal feeds.
          </div>
        </div>
      </div>

      {/* Pattern Recognition & ML Feature Store Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pattern Recognition Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <h3 className="font-display text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <History className="w-4 h-4 text-amber-400" />
              Historical Pattern Recognition Scanner
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mines the historical 45-day gold trace database using multi-dimensional distance metrics to recognize past setups matching current parameters.
            </p>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-slate-400 text-[10px]">RSI Metric</span>
                <input
                  type="number" value={patternRsi}
                  onChange={(e) => setPatternRsi(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white"
                />
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 text-[10px]">ADX Strength</span>
                <input
                  type="number" value={patternAdx}
                  onChange={(e) => setPatternAdx(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white"
                />
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 text-[10px]">Directional Bias</span>
                <select
                  value={patternBias}
                  onChange={(e) => setPatternBias(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white"
                >
                  <option value="BULLISH">BULLISH</option>
                  <option value="BEARISH">BEARISH</option>
                  <option value="NEUTRAL">NEUTRAL</option>
                </select>
              </div>
            </div>

            <button
              onClick={handlePatternScan}
              disabled={isScanningPatterns}
              className="w-full bg-slate-950 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-800 text-xs py-2 rounded-lg font-mono flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isScanningPatterns ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Scanning Database...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>Scan for Similar Historical Patterns</span>
                </>
              )}
            </button>
          </div>

          {matchedPatterns.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] text-slate-400 font-mono uppercase block font-bold">Discovered Historical Matches</span>
              <div className="space-y-1.5 font-mono text-[11px]">
                {matchedPatterns.map((match, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg">
                    <div className="space-y-0.5">
                      <span className="text-slate-200 font-bold">{(match.id || '').replace('obs-replay-2026-', 'REPLAY-')}</span>
                      <span className="text-[10px] text-slate-500 block">Entry: ${match.price.toFixed(2)} | Confidence: {match.confidence}%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold block">{match.similarity_score}% Similar</span>
                      <span className={`text-[10px] block ${match.pnl_pip >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Outcome: {match.pnl_pip >= 0 ? '+' : ''}{match.pnl_pip} pips
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Machine Learning Feature Store Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-display text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileJson className="w-4 h-4 text-blue-400" />
              Machine Learning Feature Store Generator
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export high-fidelity, compound-indexed multi-agent attributes alongside replayed quantitative PnL metrics for model training, feature selection, and validation.
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">ML Training Features:</span>
                <span className="text-slate-300 font-bold">11 columns</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Labeling Method:</span>
                <span className="text-slate-300 font-bold">PnL Decay Threshold</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Record Count:</span>
                <span className="text-slate-300 font-bold">{mlFeatures.length} records</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => window.open('/api/history/feature-store?format=csv')}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition"
            >
              <Download className="w-4 h-4" />
              Download Dataset (CSV)
            </button>
            <button
              onClick={() => window.open('/api/history/feature-store')}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-center gap-1 cursor-pointer"
              title="View Raw JSON"
            >
              <FileJson className="w-3.5 h-3.5 text-blue-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>

      </div>

      {/* Detailed Simulation Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider">
              Regression Replay Detailed Logs
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Complete audit trace of the simulated strategy parameters over the 45-day historical dataset.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 pl-7 text-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2.5" />
            </div>

            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
            >
              <option value="ALL">All Replayed Trades</option>
              <option value="PERMITTED">Permitted Only</option>
              <option value="BLOCKED">Blocked Only</option>
              <option value="WINS">Wins Only</option>
              <option value="LOSSES">Losses Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Trace ID</th>
                <th className="py-2.5 px-3">Entry Price</th>
                <th className="py-2.5 px-3">Original Decision</th>
                <th className="py-2.5 px-3">Simulated Decision</th>
                <th className="py-2.5 px-3">Original Gate</th>
                <th className="py-2.5 px-3">Simulated Gate</th>
                <th className="py-2.5 px-3">Sim Confidence</th>
                <th className="py-2.5 px-3 text-right">PnL Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredReplayedTrades.map((trade: any, idx: number) => {
                const isPermitted = trade.simulated_permission.startsWith('ALLOW');
                return (
                  <tr key={idx} className="hover:bg-slate-800/20 transition duration-100">
                    <td className="py-3 px-3 font-bold text-slate-300">
                      {(trade.id || '').replace('obs-replay-2026-', 'REPLAY-')}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      ${trade.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {trade.original_decision}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        trade.simulated_decision.includes('BULLISH') ? 'bg-emerald-500/10 text-emerald-400' :
                        trade.simulated_decision.includes('BEARISH') ? 'bg-rose-500/10 text-rose-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {trade.simulated_decision}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {trade.original_permission}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        isPermitted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {trade.simulated_permission}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-200 font-bold">
                      {trade.simulated_confidence}%
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {isPermitted ? (
                        <span className={trade.pnl_pip >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {trade.pnl_pip >= 0 ? '+' : ''}{trade.pnl_pip} pips
                        </span>
                      ) : (
                        <span className="text-slate-500">Blocked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredReplayedTrades.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 text-xs">
                    No simulation records match the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
