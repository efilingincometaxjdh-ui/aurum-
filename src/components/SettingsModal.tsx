import React, { useState } from 'react';
import { X, Key, ShieldCheck, Save, Check } from 'lucide-react';
import { updateSettings } from '../services/api.js';

interface SettingsModalProps {
  hasApiKey: boolean;
  minConfidence: number;
  onClose: () => void;
  onSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  hasApiKey,
  minConfidence,
  onClose,
  onSaved
}) => {
  const [apiKey, setApiKey] = useState('');
  const [confidence, setConfidence] = useState(minConfidence);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({
        apiKey: apiKey.trim() || undefined,
        minConfidence: confidence
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onSaved();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold text-white text-base">Engine Configuration & API Keys</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Twelve Data API Key Input */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-300 block">
              Twelve Data API Key (Optional)
            </label>
            <input
              type="password"
              placeholder={hasApiKey ? '•••••••••••••••• (API Key Connected)' : 'Enter Twelve Data API Key'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors font-mono"
            />
            <p className="text-[11px] text-slate-500">
              If left blank, Agent 02 uses the high-precision simulated XAUUSD technical feed.
            </p>
          </div>

          {/* Minimum Confidence Gate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-300 block">
                Agent 05 Minimum Confidence Threshold
              </label>
              <span className="font-mono text-sm font-bold text-amber-400">{confidence}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              step="5"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Decisions with confidence below this threshold automatically map to <strong className="text-amber-400">CAUTION</strong> permission.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{savedSuccess ? 'Saved!' : isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
