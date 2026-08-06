import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { TraderViewTab } from './components/TraderViewTab.js';
import { TechnicalTab } from './components/TechnicalTab.js';
import { MacroTab } from './components/MacroTab.js';
import { PipelineTab } from './components/PipelineTab.js';
import { HistoryTab } from './components/HistoryTab.js';
import { RawJsonModal } from './components/RawJsonModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { fetchPipelineStatus, triggerPipelineRun } from './services/api.js';
import { PipelineSummary } from './types.js';

export function App() {
  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  const [activeTab, setActiveTab] = useState<string>('trader-view');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const loadPipeline = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchPipelineStatus();
      setPipeline(data);
    } catch (err) {
      console.error('Error fetching pipeline status:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunPipeline = async () => {
    setIsRefreshing(true);
    try {
      const data = await triggerPipelineRun();
      setPipeline(data);
    } catch (err) {
      console.error('Error running pipeline:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPipeline();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPipeline, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Bar & Tab Navigation */}
      <Header
        pipeline={pipeline}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={handleRunPipeline}
        isRefreshing={isRefreshing}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenJsonModal={() => setIsJsonModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'trader-view' && <TraderViewTab pipeline={pipeline} />}
        {activeTab === 'technicals' && <TechnicalTab pipeline={pipeline} />}
        {activeTab === 'macro' && <MacroTab pipeline={pipeline} />}
        {activeTab === 'pipeline' && <PipelineTab pipeline={pipeline} />}
        {activeTab === 'history' && <HistoryTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>AURUM XAUUSD Intelligence Infrastructure — Deterministic Fail-Closed V1.0</p>
          <p className="font-mono text-amber-500/80">Read-Only Alert Boundary • No Broker Execution</p>
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
          onSaved={loadPipeline}
        />
      )}
    </div>
  );
}

export default App;
