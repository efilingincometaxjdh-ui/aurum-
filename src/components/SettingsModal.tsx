import React, { useState, useEffect } from 'react';
import { X, Save, Check, Globe, Cpu, ShieldCheck, CheckCircle2, AlertCircle, Download, Upload, Bell, Sliders, Send, Key, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { updateSettings, fetchSettings, testWebhookNotification } from '../services/api.js';

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
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [accountId, setAccountId] = useState('882194');
  const [environment, setEnvironment] = useState<'demo' | 'live'>('demo');
  const [confidence, setConfidence] = useState(minConfidence);
  
  // Advanced Risk Rules
  const [maxDrawdown, setMaxDrawdown] = useState<number>(2.5);
  const [maxPositionSize, setMaxPositionSize] = useState<number>(1.0);
  const [minRiskReward, setMinRiskReward] = useState<number>(1.5);
  
  // Automated Cron Cadence & Lateness Tolerance
  const [maxQuoteLatenessSeconds, setMaxQuoteLatenessSeconds] = useState<number>(60);
  const [maxCronLatenessMinutes, setMaxCronLatenessMinutes] = useState<number>(5);
  
  // Webhook settings
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Executor API Gateway Key
  const [executorApiKey, setExecutorApiKey] = useState<string>('');

  // Upstream Connection Settings
  const [upstreamDecisionApiUrl, setUpstreamDecisionApiUrl] = useState<string>('');
  const [upstreamDecisionApiKey, setUpstreamDecisionApiKey] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  // Status flags from backend
  const [savedConfigStatus, setSavedConfigStatus] = useState<{
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasAccessToken: boolean;
    hasAccountId: boolean;
    hasCredentials: boolean;
  }>({
    hasClientId: false,
    hasClientSecret: false,
    hasAccessToken: false,
    hasAccountId: false,
    hasCredentials: false
  });

  useEffect(() => {
    let mounted = true;
    async function loadCurrentSettings() {
      try {
        const data = await fetchSettings();
        if (mounted && data) {
          const cfg = data.ctrader_config || {};
          if (cfg.client_id) setClientId(cfg.client_id);
          if (cfg.account_id) setAccountId(cfg.account_id);
          if (cfg.environment) setEnvironment(cfg.environment);
          if (data.min_confidence) setConfidence(data.min_confidence);

          if (data.advanced_settings) {
            const adv = data.advanced_settings;
            if (adv.maxDailyDrawdownPercent !== undefined) setMaxDrawdown(adv.maxDailyDrawdownPercent);
            if (adv.maxPositionSizeLots !== undefined) setMaxPositionSize(adv.maxPositionSizeLots);
            if (adv.minRiskRewardRatio !== undefined) setMinRiskReward(adv.minRiskRewardRatio);
            if (adv.webhookUrl) setWebhookUrl(adv.webhookUrl);
            if (adv.maxQuoteLatenessSeconds !== undefined) setMaxQuoteLatenessSeconds(adv.maxQuoteLatenessSeconds);
            if (adv.maxCronLatenessMinutes !== undefined) setMaxCronLatenessMinutes(adv.maxCronLatenessMinutes);
            if (adv.executorApiKey !== undefined) setExecutorApiKey(adv.executorApiKey);
            if (adv.upstreamDecisionApiUrl !== undefined) setUpstreamDecisionApiUrl(adv.upstreamDecisionApiUrl);
            if (adv.upstreamDecisionApiKey !== undefined) setUpstreamDecisionApiKey(adv.upstreamDecisionApiKey);
          }

          setSavedConfigStatus({
            hasClientId: Boolean(cfg.has_client_id),
            hasClientSecret: Boolean(cfg.has_client_secret),
            hasAccessToken: Boolean(cfg.has_access_token),
            hasAccountId: Boolean(cfg.has_account_id),
            hasCredentials: Boolean(cfg.has_credentials || data.has_api_key)
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadCurrentSettings();
    return () => { mounted = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await updateSettings({
        clientId: clientId.trim() || undefined,
        clientSecret: clientSecret.trim() || undefined,
        accessToken: accessToken.trim() || undefined,
        accountId: accountId.trim() || undefined,
        environment,
        minConfidence: confidence,
        maxDailyDrawdownPercent: maxDrawdown,
        maxPositionSizeLots: maxPositionSize,
        minRiskRewardRatio: minRiskReward,
        webhookUrl: webhookUrl.trim(),
        maxQuoteLatenessSeconds,
        maxCronLatenessMinutes,
        executorApiKey: executorApiKey.trim() || undefined,
        upstreamDecisionApiUrl: upstreamDecisionApiUrl.trim(),
        upstreamDecisionApiKey: upstreamDecisionApiKey.trim()
      });

      if (res && res.ctrader_config) {
        const cfg = res.ctrader_config;
        setSavedConfigStatus({
          hasClientId: Boolean(cfg.has_client_id),
          hasClientSecret: Boolean(cfg.has_client_secret),
          hasAccessToken: Boolean(cfg.has_access_token),
          hasAccountId: Boolean(cfg.has_account_id),
          hasCredentials: Boolean(cfg.has_credentials || res.has_api_key)
        });
      }

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onSaved();
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setWebhookMsg({ text: 'Please enter a Webhook URL first.', success: false });
      return;
    }
    setTestingWebhook(true);
    setWebhookMsg(null);
    try {
      const res = await testWebhookNotification(webhookUrl.trim());
      if (res.success) {
        setWebhookMsg({ text: res.message || 'Test alert delivered successfully!', success: true });
      } else {
        setWebhookMsg({ text: res.error || 'Webhook test failed.', success: false });
      }
    } catch (err: any) {
      setWebhookMsg({ text: err.message || 'Error sending webhook request.', success: false });
    } finally {
      setTestingWebhook(false);
    }
  };

  const [copiedKey, setCopiedKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const handleRotateKey = () => {
    const chars = 'abcdef0123456789';
    let result = 'aurum_exec_prod_';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setExecutorApiKey(result);
  };

  const handleCopyKey = () => {
    if (!executorApiKey) return;
    navigator.clipboard.writeText(executorApiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleExportConfig = () => {
    const configData = {
      clientId,
      accountId,
      environment,
      minConfidence: confidence,
      maxDrawdown,
      maxPositionSize,
      minRiskReward,
      webhookUrl,
      executorApiKey,
      exportedAt: new Date().toISOString(),
      app: 'AURUM Intelligence Suite v1.0'
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurum-settings-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed) {
          if (parsed.clientId) setClientId(parsed.clientId);
          if (parsed.accountId) setAccountId(parsed.accountId);
          if (parsed.environment) setEnvironment(parsed.environment);
          if (parsed.minConfidence) setConfidence(parsed.minConfidence);
          if (parsed.maxDrawdown) setMaxDrawdown(parsed.maxDrawdown);
          if (parsed.maxPositionSize) setMaxPositionSize(parsed.maxPositionSize);
          if (parsed.minRiskReward) setMinRiskReward(parsed.minRiskReward);
          if (parsed.webhookUrl) setWebhookUrl(parsed.webhookUrl);
          if (parsed.executorApiKey) setExecutorApiKey(parsed.executorApiKey);
          alert('Configuration imported successfully! Click "Save Settings" to apply changes.');
        }
      } catch {
        alert('Invalid JSON settings backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-display font-bold text-white text-base leading-tight">cTrader Open API & Engine Settings</h3>
              <p className="text-[11px] text-slate-400 font-mono">Server Configuration & Live Data Persistence Status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmation Status Banner */}
        <div className="px-6 pt-4 shrink-0">
          {savedSuccess ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold block">Settings Successfully Saved & Confirmed!</span>
                <span className="text-[11px] text-emerald-300/80">API configuration has been applied and stored on the server engine.</span>
              </div>
            </div>
          ) : savedConfigStatus.hasCredentials ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>API Status:</strong> Saved Credentials Active on Server</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 uppercase font-semibold">
                CONFIGURED
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>API Status:</strong> High-Precision cTrader Market Feed Active</span>
              </div>
              <span className="text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-semibold">
                SANDBOX / DEFAULT
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* cTrader Environment Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-300 block">
              cTrader API Target Environment
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEnvironment('demo')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  environment === 'demo'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Demo Environment</span>
              </button>
              <button
                type="button"
                onClick={() => setEnvironment('live')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  environment === 'live'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Live Environment</span>
              </button>
            </div>
          </div>

          {/* cTrader Client ID & Secret */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 block">
                  cTrader Client ID
                </label>
                {savedConfigStatus.hasClientId && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="Client ID (e.g. 1234_abc...)"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 block">
                  cTrader Client Secret
                </label>
                {savedConfigStatus.hasClientSecret && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder={savedConfigStatus.hasClientSecret ? "•••••••• (Secret Saved)" : "Client Secret"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors font-mono"
              />
            </div>
          </div>

          {/* cTrader Access Token & Account ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 block">
                  OAuth Access Token
                </label>
                {savedConfigStatus.hasAccessToken && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder={savedConfigStatus.hasAccessToken ? "•••••••• (Token Saved)" : "Bearer / Access Token"}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 block">
                  Trading Account ID
                </label>
                {savedConfigStatus.hasAccountId && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="e.g. 882194"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Section: Advanced Risk & Safety Gate Rules */}
          <div className="pt-3 border-t border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider font-mono">
              <Sliders className="w-4 h-4" />
              <span>Advanced Risk & Permission Gate Rules</span>
            </div>

            {/* Minimum Confidence Gate */}
            <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
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

            {/* Risk Parameters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 block">Max Daily Drawdown (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={maxDrawdown}
                  onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 block">Max Position Size (Lots)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={maxPositionSize}
                  onChange={(e) => setMaxPositionSize(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 block">Min Risk:Reward Ratio</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="5.0"
                  value={minRiskReward}
                  onChange={(e) => setMinRiskReward(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
                />
              </div>
            </div>

            {/* Cadence & Lateness Tolerance Rules */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase font-semibold text-amber-400 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5" /> Cloud Run Cron Cadence & Lateness Limits
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Fail-Closed Safety Active</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 block">Max Spot Quote Lateness (Seconds)</label>
                  <input
                    type="number"
                    min="10"
                    max="600"
                    value={maxQuoteLatenessSeconds}
                    onChange={(e) => setMaxQuoteLatenessSeconds(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
                  />
                  <span className="text-[10px] text-slate-500 block">Quotes older than this trigger stale status & safety gate caution.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 block">Max Multi-Hour Cron Cadence (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={maxCronLatenessMinutes}
                    onChange={(e) => setMaxCronLatenessMinutes(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
                  />
                  <span className="text-[10px] text-slate-500 block">Max allowed gap between scheduled Cloud Run executions.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Notification Webhook Channel */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider font-mono">
              <Bell className="w-4 h-4" />
              <span>Notification Webhook Integration</span>
            </div>

            <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <label className="text-[11px] font-mono uppercase text-slate-300 block">
                Discord / Telegram / Custom Webhook Endpoint URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/... or https://custom-endpoint.com/alert"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 text-xs font-mono font-medium rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testingWebhook ? 'Testing...' : 'Test Webhook'}</span>
                </button>
              </div>

              {webhookMsg && (
                <div className={`text-xs p-2 rounded-lg font-mono flex items-center gap-2 ${
                  webhookMsg.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  <span>{webhookMsg.text}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Upstream Decision API Connection */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider font-mono">
                <Globe className="w-4 h-4" />
                <span>Upstream Decision API Connection</span>
              </div>
            </div>

            <div className="space-y-4 bg-slate-950 p-4.5 rounded-xl border border-slate-800/80">
              <p className="text-[11px] text-slate-400 leading-normal font-mono">
                Configure the target endpoint and authorization token that the local Trading Executor connects to. Leave empty to connect to this local server.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
                    Upstream Decision API URL (VITE_DECISION_API_URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://your-aurum-core-url.app"
                    value={upstreamDecisionApiUrl}
                    onChange={(e) => setUpstreamDecisionApiUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
                    Upstream Bearer Token (VITE_DECISION_API_KEY)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter decision stream bearer token"
                    value={upstreamDecisionApiKey}
                    onChange={(e) => setUpstreamDecisionApiKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Executor API Gateway Key */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider font-mono">
                <Key className="w-4 h-4" />
                <span>DECISION API TUNNEL CREDENTIALS</span>
              </div>
              {copiedKey && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono animate-fade-in">
                  <Check className="w-3 h-3" /> Copied to Clipboard!
                </span>
              )}
            </div>

            <div className="space-y-4 bg-slate-950 p-4.5 rounded-xl border border-slate-800/80">
              {/* Field 1: Secure Stream Endpoint */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
                  Secure Stream Endpoint
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/v1/pipeline/decision/stream`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/v1/pipeline/decision/stream`);
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    className="absolute right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-mono border border-slate-700/60 transition-colors cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Field 2: Decision Stream Bearer Secret */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
                  Decision Stream Bearer Secret
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    readOnly
                    value={executorApiKey}
                    placeholder="Generating bearer token..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none pr-28"
                  />
                  <div className="absolute right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
                      title={showApiKey ? 'Hide Token' : 'Reveal Token'}
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-mono border border-slate-700/60 transition-colors cursor-pointer"
                      title="Copy Key"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 font-mono">
                  Authentication Type: HTTP Bearer / Custom Header
                </span>
                <button
                  type="button"
                  onClick={handleRotateKey}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-amber-500/10 hover:text-amber-400 border border-slate-800 hover:border-amber-500/20 text-[10px] font-mono rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Rotate Secrets</span>
                </button>
              </div>

              {/* Developer Integration Quick-Guides */}
              <div className="text-[11px] text-slate-400 font-mono leading-relaxed space-y-2 bg-slate-900/30 p-3.5 rounded-xl border border-slate-850">
                <span className="text-[10px] text-amber-400/80 block uppercase font-bold tracking-wider">
                  Executor Integration Cheat Sheet:
                </span>
                
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-300 block">1. Fetch Latest Decision Snapshot (Polling)</span>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-[10px] text-slate-300 overflow-x-auto whitespace-pre scrollbar-thin">
{`curl -X GET "${window.location.origin}/api/v1/pipeline/decision" \\
  -H "X-Aurum-API-Key: ${executorApiKey || 'YOUR_BEARER_SECRET'}"`}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-slate-300 block">2. Connect to Real-time Decision SSE Stream (Sub-second updates)</span>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-[10px] text-slate-300 overflow-x-auto whitespace-pre scrollbar-thin">
{`curl -N "${window.location.origin}/api/v1/pipeline/decision/stream?token=${executorApiKey || 'YOUR_BEARER_SECRET'}"`}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-normal">
                  Both endpoints are completely active, allowing high-performance Python, cTrader cBots, or MetaTrader expert advisors to consume instantaneous trading signal transitions.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Export / Import Backup Settings */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Configuration Backup & Restore</span>
              <span className="text-[11px] text-slate-400">Export or import engine parameters as JSON file.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportConfig}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export</span>
              </button>

              <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import</span>
                <input type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{savedSuccess ? 'Saved & Verified!' : isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


