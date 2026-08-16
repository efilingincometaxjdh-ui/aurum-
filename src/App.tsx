import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Cpu } from 'lucide-react';
import { Header } from './components/Header.js';
import { TraderViewTab } from './components/TraderViewTab.js';
import { TechnicalTab } from './components/TechnicalTab.js';
import { MacroTab } from './components/MacroTab.js';
import { PipelineTab } from './components/PipelineTab.js';
import { HistoryTab } from './components/HistoryTab.js';
import { SandboxTab } from './components/SandboxTab.js';
import { ExecutorTab } from './components/ExecutorTab.js';
import { RawJsonModal } from './components/RawJsonModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { fetchPipelineStatus, triggerPipelineRun, fetchSymbolRegistry, setActiveSymbolApi } from './services/api.js';
import { PipelineSummary, RegisteredSymbol } from './types.js';

export function App() {
  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  const [activeTab, setActiveTab] = useState<string>('trader-view');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSymbol, setActiveSymbol] = useState<string>('XAUUSD');
  const [symbolRegistryData, setSymbolRegistryData] = useState<RegisteredSymbol[]>([]);

  const loadSymbolRegistry = async () => {
    try {
      const res = await fetchSymbolRegistry();
      if (res && res.symbols) {
        setSymbolRegistryData(res.symbols);
        if (res.activeSymbol) {
          setActiveSymbol(res.activeSymbol);
        }
      }
    } catch (err) {
      console.error('Failed to load symbol registry', err);
    }
  };

  const loadPipeline = async (symbolToLoad?: string) => {
    setIsRefreshing(true);
    const sym = symbolToLoad || activeSymbol;
    try {
      const data = await fetchPipelineStatus(sym);
      setPipeline(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching pipeline status:', err);
      setError('Failed to establish connection to the AURUM Intelligence Engine. Ensure the backend server is fully operational.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunPipeline = async () => {
    setIsRefreshing(true);
    try {
      const data = await triggerPipelineRun(activeSymbol);
      setPipeline(data);
      setError(null);
    } catch (err) {
      console.error('Error running pipeline:', err);
      setError('Failed to execute the AURUM Multi-Agent Pipeline. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectSymbol = async (symbol: string) => {
    setIsRefreshing(true);
    try {
      const res = await setActiveSymbolApi(symbol);
      if (res && res.activeSymbol) {
        setActiveSymbol(res.activeSymbol);
        if (res.symbols) {
          setSymbolRegistryData(res.symbols);
        }
      } else {
        setActiveSymbol(symbol);
      }
      const updatedPipeline = await triggerPipelineRun(symbol);
      setPipeline(updatedPipeline);
      setError(null);
    } catch (err) {
      console.error('Failed to switch active symbol:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSymbolRegistry();
    loadPipeline();

    const interval = setInterval(() => {
      loadSymbolRegistry();
      loadPipeline();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Header Bar & Dynamic Symbol Selector & Tab Navigation */}
        <Header
          pipeline={pipeline}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onRefresh={handleRunPipeline}
          isRefreshing={isRefreshing}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenJsonModal={() => setIsJsonModalOpen(true)}
          activeSymbol={activeSymbol}
          symbolRegistry={symbolRegistryData}
          onSelectSymbol={handleSelectSymbol}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          <ErrorBoundary>
            {error ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-4 shadow-xl">
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-md font-bold text-white">AURUM System Connection Alert</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {error}
                </p>
                <button
                  onClick={() => loadPipeline()}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 mx-auto cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry System Connection</span>
                </button>
              </div>
            ) : !pipeline && isRefreshing ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 max-w-md mx-auto text-center">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin"></div>
                  <Cpu className="w-5 h-5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Initializing AURUM Engine</h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">Consensus pipeline syncing with cTrader live market tick...</p>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'trader-view' && <TraderViewTab pipeline={pipeline} activeSymbol={activeSymbol} onSelectSymbol={handleSelectSymbol} />}
                {activeTab === 'technicals' && <TechnicalTab pipeline={pipeline} />}
                {activeTab === 'macro' && <MacroTab pipeline={pipeline} />}
                {activeTab === 'pipeline' && <PipelineTab pipeline={pipeline} />}
                {activeTab === 'executor' && <ExecutorTab />}
                {activeTab === 'history' && <HistoryTab />}
                {activeTab === 'sandbox' && <SandboxTab pipeline={pipeline} />}
              </>
            )}
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>AURUM Intelligence Infrastructure — Deterministic Fail-Closed V1.0</p>
            <p className="font-mono text-amber-500/80">Active Instrument: {activeSymbol} • Read-Only Alert Boundary</p>
          </div>
        </footer>

        {/* JSON Modal */}
        {isJsonModalOpen && (
          <RawJsonModal
            pipeline={pipeline}
            onClose={() => setIsJsonModalOpen(false)}
          />
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <SettingsModal
            hasApiKey={Boolean((pipeline as any)?.has_api_key)}
            minConfidence={(pipeline as any)?.min_confidence || 55}
            onClose={() => setIsSettingsOpen(false)}
            onSaved={() => loadPipeline()}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
