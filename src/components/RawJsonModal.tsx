import React, { useState } from 'react';
import { X, Copy, Check, Terminal } from 'lucide-react';
import { PipelineSummary } from '../types.js';

interface RawJsonModalProps {
  pipeline: PipelineSummary | null;
  onClose: () => void;
}

export const RawJsonModal: React.FC<RawJsonModalProps> = ({ pipeline, onClose }) => {
  const [selectedAgent, setSelectedAgent] = useState<'agent01' | 'agent02' | 'agent03' | 'agent04' | 'agent05' | 'agent06' | 'trader_view'>('trader_view');
  const [copied, setCopied] = useState(false);

  if (!pipeline) return null;

  const jsonData = pipeline[selectedAgent];
  const jsonString = JSON.stringify(jsonData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold text-white text-base">Normalized State Contracts (JSON)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Agent File Switcher Tabs */}
        <div className="px-6 py-3 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar bg-slate-950/50">
          {[
            { id: 'trader_view', label: 'trader_view.json' },
            { id: 'agent01', label: 'agent01.json' },
            { id: 'agent02', label: 'agent02.json' },
            { id: 'agent03', label: 'agent03.json' },
            { id: 'agent04', label: 'decision.json (A04)' },
            { id: 'agent05', label: 'permission.json (A05)' },
            { id: 'agent06', label: 'alert.json (A06)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedAgent(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                selectedAgent === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* JSON Code Viewer */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs bg-slate-950 text-emerald-400 leading-relaxed">
          <pre>{jsonString}</pre>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-900">
          <span>Atomic Contract Standard v1.0</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
