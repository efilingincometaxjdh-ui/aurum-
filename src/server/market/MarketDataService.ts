import { symbolRegistry, RegisteredSymbol, SymbolStatus } from './SymbolRegistry.js';
import { cTraderClient, CTraderQuote, CTraderCandle } from './CTraderClient.js';
import { cTraderWebSocket } from './CTraderWebSocket.js';
import { logger } from '../utils/logger.js';

export class MarketDataService {
  public getActiveSymbol(): string {
    return symbolRegistry.getActiveSymbol();
  }

  public setActiveSymbol(symbol: string): RegisteredSymbol {
    const updated = symbolRegistry.setActiveSymbol(symbol);
    // Request subscription via WebSocket if connected
    cTraderWebSocket.subscribeToSymbol(updated.symbol);
    return updated;
  }

  public getRegisteredSymbols(): RegisteredSymbol[] {
    // Check ws connection state to update disconnected flags if ws is down
    const wsStatus = cTraderWebSocket.getStatus();
    if (!wsStatus.connected) {
      symbolRegistry.setDisconnected(false);
    }
    return symbolRegistry.getRegisteredSymbols();
  }

  public async getLatestQuote(symbol?: string): Promise<CTraderQuote> {
    const targetSymbol = symbol || this.getActiveSymbol();
    const reg = symbolRegistry.getSymbol(targetSymbol);
    
    // Check WebSocket first
    const wsQuote = cTraderWebSocket.getLatestQuote(targetSymbol);
    if (wsQuote && wsQuote.bid > 0) {
      symbolRegistry.updateQuote(targetSymbol, wsQuote);
      return wsQuote;
    }

    if (reg && reg.lastQuote && reg.lastQuote.bid > 0) {
      return reg.lastQuote;
    }

    // No live tick received yet - return zeroed quote so UI displays "Waiting for live broker data"
    return {
      symbol: (reg?.symbol || targetSymbol) as any,
      symbolId: reg?.symbolId || 1,
      bid: 0,
      ask: 0,
      spread: 0,
      digits: reg?.digits || 2,
      timestamp: new Date().toISOString(),
      environment: cTraderClient.getConfig().environment || 'demo',
      source: 'cTrader Market Stream (Awaiting First Tick)'
    };
  }

  public async fetchCandles(
    timeframe: 'M5' | 'M15' | 'H1' | 'H4',
    count = 50,
    symbol?: string
  ): Promise<CTraderCandle[]> {
    const targetSymbol = symbol || this.getActiveSymbol();
    return cTraderClient.fetchCandlesForSymbol(targetSymbol, timeframe, count);
  }
}

export const marketDataService = new MarketDataService();
