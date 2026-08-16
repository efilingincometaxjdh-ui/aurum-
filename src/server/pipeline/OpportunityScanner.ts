import { symbolRegistry } from '../market/SymbolRegistry.js';
import { pipelineOrchestrator } from './PipelineOrchestrator.js';
import { cTraderWebSocket } from '../market/CTraderWebSocket.js';
import { eventBus } from '../bus/EventBus.js';
import { OpportunityItem, OpportunityScannerResponse } from '../../types.js';
import { logger } from '../utils/logger.js';

export class OpportunityScanner {
  private cache: Map<string, OpportunityItem> = new Map();

  constructor() {
    this.setupBusListeners();
  }

  private setupBusListeners() {
    // Keep opportunity cache updated when pipeline runs finish
    eventBus.on('pipeline:completed', (payload: any) => {
      if (payload.data?.market_ticker?.symbol) {
        this.updateOpportunityFromSummary(payload.data.market_ticker.symbol, payload.data);
      }
    });
  }

  public async getRankedOpportunities(): Promise<OpportunityScannerResponse> {
    const symbols = symbolRegistry.getRegisteredSymbols();
    const results: OpportunityItem[] = [];

    for (const symInfo of symbols) {
      const sym = symInfo.symbol;
      const quote = cTraderWebSocket.getLatestQuote(sym) || symInfo.lastQuote;
      const wsStatus = cTraderWebSocket.getStatus();

      // Requirement 4: If data is unavailable (no quote tick yet)
      if (!quote || quote.bid === 0) {
        results.push({
          symbol: sym,
          displayName: symInfo.displayName,
          action: 'WAIT',
          confidence: 0,
          currentBid: 0,
          currentAsk: 0,
          spread: 0,
          timeframe: 'M5, M15, H1, H4',
          entryZone: '—',
          stopLoss: '—',
          takeProfit: '—',
          riskPercent: '—',
          riskReward: '—',
          technicalEvidence: 'Awaiting market quote feed',
          marketStructureEvidence: 'No market tick received',
          liquidityEvidence: 'Order book awaiting stream',
          macroEvidence: 'Awaiting symbol data',
          riskAssessment: 'HIGH',
          timestamp: new Date().toISOString(),
          dataProvenance: symInfo.status,
          decisionId: 'none',
          status: 'WAITING FOR LIVE DATA',
          reason: 'Awaiting first broker tick'
        });
        continue;
      }

      // Requirement Stale Protection: Check quote age & connection
      const quoteAgeMs = Date.now() - new Date(quote.timestamp).getTime();
      if (!wsStatus.connected && quoteAgeMs > 30000) {
        results.push({
          symbol: sym,
          displayName: symInfo.displayName,
          action: 'WAIT',
          confidence: 0,
          currentBid: quote.bid,
          currentAsk: quote.ask,
          spread: quote.spread,
          timeframe: 'M5, M15, H1, H4',
          entryZone: '—',
          stopLoss: '—',
          takeProfit: '—',
          riskPercent: '—',
          riskReward: '—',
          technicalEvidence: 'Broker stream disconnected',
          marketStructureEvidence: 'Stale market feed',
          liquidityEvidence: 'Feed paused',
          macroEvidence: 'Macro bias intact',
          riskAssessment: 'EXTREME',
          timestamp: quote.timestamp,
          dataProvenance: quote.source,
          decisionId: 'none',
          status: 'STALE',
          reason: 'Broker connection stale or disconnected'
        });
        continue;
      }

      // Evaluate symbol using authoritative Decision Engine pipeline
      try {
        const traceId = `trc_scanner_${sym}_${Date.now()}`;
        const summary = await pipelineOrchestrator.getLatestSummary(traceId, sym);

        // Requirement 5: Check candle history sufficiency
        const missing = summary.evidence_coverage?.missing || [];
        const isInsufficient = missing.includes('INSUFFICIENT_MARKET_DATA') || missing.some((m: string) => m.startsWith('MISSING_') && m.endsWith('_CANDLES'));

        if (isInsufficient) {
          results.push({
            symbol: sym,
            displayName: symInfo.displayName,
            action: 'WAIT',
            confidence: 0,
            currentBid: quote.bid,
            currentAsk: quote.ask,
            spread: quote.spread,
            timeframe: 'M5, M15, H1, H4',
            entryZone: '—',
            stopLoss: '—',
            takeProfit: '—',
            riskPercent: '—',
            riskReward: '—',
            technicalEvidence: 'Insufficient historical candles',
            marketStructureEvidence: 'Structure analysis pending',
            liquidityEvidence: 'Volume data pending',
            macroEvidence: summary.agent01?.data?.narrative || 'Macro data synced',
            riskAssessment: 'HIGH',
            timestamp: quote.timestamp,
            dataProvenance: quote.source,
            decisionId: summary.trace_id || 'none',
            status: 'INSUFFICIENT MARKET DATA',
            reason: 'Requires minimum 2 timeframes of candle history'
          });
          continue;
        }

        // Action & Confidence from authoritative Decision Engine
        const tv = summary.trader_view;
        let action: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
        if (tv.permission === 'ALLOW_BUYS') action = 'BUY';
        else if (tv.permission === 'ALLOW_SELLS') action = 'SELL';
        else if (tv.permission === 'ALLOW_BOTH') {
          action = tv.decision.includes('BULLISH') ? 'BUY' : (tv.decision.includes('BEARISH') ? 'SELL' : 'WAIT');
        }

        const digits = symInfo.digits;
        const entryZoneStr = action === 'BUY'
          ? `Ask ${quote.ask.toFixed(digits)}`
          : action === 'SELL'
            ? `Bid ${quote.bid.toFixed(digits)}`
            : `Range ${quote.bid.toFixed(digits)}`;

        const pipSize = symInfo.pipSize;
        const slPrice = action === 'BUY' ? (quote.bid - 25 * pipSize).toFixed(digits) : (quote.ask + 25 * pipSize).toFixed(digits);
        const tpPrice = action === 'BUY' ? (quote.ask + 50 * pipSize).toFixed(digits) : (quote.bid - 50 * pipSize).toFixed(digits);

        const techSummary = `Timeframe alignment: ${tv.timeframe_alignment || 'ALIGNED'}. Confluence score: ${tv.multi_timeframe_confluence?.score || 50}%`;
        const structEvidence = tv.multi_timeframe_confluence?.description || 'Market structure validated across timeframes';
        const macroEvidenceStr = summary.agent01?.data?.narrative || `Macro Gold Bias: ${summary.agent03?.data?.gold_bias || 'NEUTRAL'}`;

        const item: OpportunityItem = {
          symbol: sym,
          displayName: symInfo.displayName,
          action,
          confidence: tv.confidence || 0,
          currentBid: quote.bid,
          currentAsk: quote.ask,
          spread: quote.spread,
          timeframe: 'M5, M15, H1, H4',
          entryZone: entryZoneStr,
          stopLoss: action === 'WAIT' ? '—' : `${slPrice} (25 pips)`,
          takeProfit: action === 'WAIT' ? '—' : `${tpPrice} (50 pips)`,
          riskPercent: '1.0%',
          riskReward: action === 'WAIT' ? '—' : '1:2.0',
          technicalEvidence: techSummary,
          marketStructureEvidence: structEvidence,
          liquidityEvidence: `Spread ${quote.spread} pips`,
          macroEvidence: macroEvidenceStr,
          riskAssessment: tv.news_risk || 'MEDIUM',
          timestamp: summary.generated_at,
          dataProvenance: quote.source,
          decisionId: summary.trace_id || 'none',
          status: 'LIVE'
        };

        this.cache.set(sym, item);
        results.push(item);
      } catch (err: any) {
        logger.error(`Error scanning symbol ${sym}: ${err.message}`, 'OpportunityScanner');
        results.push({
          symbol: sym,
          displayName: symInfo.displayName,
          action: 'WAIT',
          confidence: 0,
          currentBid: quote.bid,
          currentAsk: quote.ask,
          spread: quote.spread,
          timeframe: 'M5, M15, H1, H4',
          entryZone: '—',
          stopLoss: '—',
          takeProfit: '—',
          riskPercent: '—',
          riskReward: '—',
          technicalEvidence: 'Evaluation error',
          marketStructureEvidence: 'Analysis failed',
          liquidityEvidence: '—',
          macroEvidence: '—',
          riskAssessment: 'EXTREME',
          timestamp: quote.timestamp,
          dataProvenance: quote.source,
          decisionId: 'none',
          status: 'INSUFFICIENT MARKET DATA',
          reason: 'Evaluation error'
        });
      }
    }

    // Rank opportunities:
    // 1. LIVE status with actionable BUY/SELL ranked by confidence (descending)
    // 2. LIVE status with WAIT ranked by confidence (descending)
    // 3. INSUFFICIENT MARKET DATA
    // 4. WAITING FOR LIVE DATA / STALE / DISCONNECTED
    const sorted = results.sort((a, b) => {
      const getRankScore = (item: OpportunityItem) => {
        if (item.status !== 'LIVE') return 0;
        if (item.action === 'BUY' || item.action === 'SELL') return 1000 + item.confidence;
        return 500 + item.confidence;
      };
      return getRankScore(b) - getRankScore(a);
    });

    return {
      timestamp: new Date().toISOString(),
      totalSymbols: sorted.length,
      opportunities: sorted
    };
  }

  private updateOpportunityFromSummary(symbol: string, summary: any) {
    const symInfo = symbolRegistry.getSymbol(symbol);
    if (!symInfo) return;

    const tv = summary.trader_view;
    let action: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
    if (tv.permission === 'ALLOW_BUYS') action = 'BUY';
    else if (tv.permission === 'ALLOW_SELLS') action = 'SELL';
    else if (tv.permission === 'ALLOW_BOTH') {
      action = tv.decision.includes('BULLISH') ? 'BUY' : (tv.decision.includes('BEARISH') ? 'SELL' : 'WAIT');
    }

    const quote = summary.market_ticker;
    const digits = symInfo.digits;
    const pipSize = symInfo.pipSize;
    const bid = quote.bid || 0;
    const ask = quote.ask || 0;
    const slPrice = action === 'BUY' ? (bid - 25 * pipSize).toFixed(digits) : (ask + 25 * pipSize).toFixed(digits);
    const tpPrice = action === 'BUY' ? (ask + 50 * pipSize).toFixed(digits) : (bid - 50 * pipSize).toFixed(digits);

    const techSummary = `Timeframe alignment: ${tv.timeframe_alignment || 'ALIGNED'}. Confluence score: ${tv.multi_timeframe_confluence?.score || 50}%`;
    const structEvidence = tv.multi_timeframe_confluence?.description || 'Market structure validated across timeframes';
    const macroEvidenceStr = summary.agent01?.data?.narrative || `Macro Gold Bias: ${summary.agent03?.data?.gold_bias || 'NEUTRAL'}`;

    const item: OpportunityItem = {
      symbol,
      displayName: symInfo.displayName,
      action,
      confidence: tv.confidence || 0,
      currentBid: bid,
      currentAsk: ask,
      spread: quote.spread || 0,
      timeframe: 'M5, M15, H1, H4',
      entryZone: action === 'BUY' ? `Ask ${ask.toFixed(digits)}` : `Bid ${bid.toFixed(digits)}`,
      stopLoss: action === 'WAIT' ? '—' : `${slPrice} (25 pips)`,
      takeProfit: action === 'WAIT' ? '—' : `${tpPrice} (50 pips)`,
      riskPercent: '1.0%',
      riskReward: action === 'WAIT' ? '—' : '1:2.0',
      technicalEvidence: techSummary,
      marketStructureEvidence: structEvidence,
      liquidityEvidence: `Spread ${quote.spread}`,
      macroEvidence: macroEvidenceStr,
      riskAssessment: tv.news_risk || 'MEDIUM',
      timestamp: summary.generated_at,
      dataProvenance: quote.source,
      decisionId: summary.trace_id || 'none',
      status: 'LIVE'
    };

    this.cache.set(symbol, item);
  }
}

export const opportunityScanner = new OpportunityScanner();
