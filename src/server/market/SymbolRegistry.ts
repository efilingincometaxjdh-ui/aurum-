import { logger } from '../utils/logger.js';
import { CTraderQuote } from './CTraderClient.js';

export type SymbolStatus =
  | 'REGISTERED'
  | 'SUBSCRIBED'
  | 'CONNECTED_STREAMING'
  | 'WAITING_FOR_FIRST_BROKER_TICK'
  | 'DISCONNECTED';

export interface RegisteredSymbol {
  symbol: string;                  // e.g. 'XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'XAGUSD'
  displayName: string;             // e.g. 'XAU/USD', 'BTC/USD', 'EUR/USD', 'GBP/USD', 'XAG/USD'
  category: 'Metals' | 'Crypto' | 'Forex';
  symbolId: number;                // cTrader symbolId
  digits: number;                  // decimal places
  pipSize: number;
  status: SymbolStatus;
  subscribed: boolean;
  firstTickReceived: boolean;
  lastQuote: CTraderQuote | null;
}

class SymbolRegistryManager {
  private symbols: Map<string, RegisteredSymbol> = new Map();
  private activeSymbol: string = 'XAUUSD';

  constructor() {
    this.initializeRegistry();
  }

  private initializeRegistry() {
    const defaultSymbols: Omit<RegisteredSymbol, 'status' | 'subscribed' | 'firstTickReceived' | 'lastQuote'>[] = [
      {
        symbol: 'XAUUSD',
        displayName: 'XAU/USD',
        category: 'Metals',
        symbolId: 1,
        digits: 2,
        pipSize: 0.01
      },
      {
        symbol: 'BTCUSD',
        displayName: 'BTC/USD',
        category: 'Crypto',
        symbolId: 22396, // Default fallback or dynamically replaced by cTrader discovery
        digits: 2,
        pipSize: 1.0
      },
      {
        symbol: 'EURUSD',
        displayName: 'EUR/USD',
        category: 'Forex',
        symbolId: 2,
        digits: 5,
        pipSize: 0.0001
      },
      {
        symbol: 'GBPUSD',
        displayName: 'GBP/USD',
        category: 'Forex',
        symbolId: 3,
        digits: 5,
        pipSize: 0.0001
      },
      {
        symbol: 'XAGUSD',
        displayName: 'XAG/USD',
        category: 'Metals',
        symbolId: 4,
        digits: 3,
        pipSize: 0.001
      }
    ];

    for (const item of defaultSymbols) {
      this.symbols.set(item.symbol, {
        ...item,
        status: 'REGISTERED',
        subscribed: false,
        firstTickReceived: false,
        lastQuote: null
      });
    }

    logger.info(`Initialized canonical SymbolRegistry with ${this.symbols.size} instruments: ${Array.from(this.symbols.keys()).join(', ')}`, 'SymbolRegistry');
  }

  public getRegisteredSymbols(): RegisteredSymbol[] {
    return Array.from(this.symbols.values());
  }

  public getSymbol(symbol: string): RegisteredSymbol | undefined {
    return this.symbols.get(symbol.toUpperCase());
  }

  public getActiveSymbol(): string {
    return this.activeSymbol;
  }

  public setActiveSymbol(symbol: string): RegisteredSymbol {
    const normalized = symbol.replace(/[\/\-_ ]/g, '').toUpperCase();
    if (!this.symbols.has(normalized)) {
      throw new Error(`Symbol '${symbol}' is not registered in SymbolRegistry`);
    }
    this.activeSymbol = normalized;
    logger.info(`Active symbol changed to ${normalized}`, 'SymbolRegistry');
    return this.symbols.get(normalized)!;
  }

  public setSubscribed(symbol: string, symbolId?: number) {
    const normalized = symbol.replace(/[\/\-_ ]/g, '').toUpperCase();
    const entry = this.symbols.get(normalized);
    if (entry) {
      entry.subscribed = true;
      if (symbolId !== undefined && symbolId > 0) {
        entry.symbolId = symbolId;
      }
      if (!entry.firstTickReceived) {
        entry.status = 'WAITING_FOR_FIRST_BROKER_TICK';
      } else {
        entry.status = 'SUBSCRIBED';
      }
      logger.info(`Symbol ${normalized} marked as SUBSCRIBED (symbolId: ${entry.symbolId}, status: ${entry.status})`, 'SymbolRegistry');
    }
  }

  public updateSymbolId(symbol: string, symbolId: number) {
    const normalized = symbol.replace(/[\/\-_ ]/g, '').toUpperCase();
    const entry = this.symbols.get(normalized);
    if (entry) {
      entry.symbolId = symbolId;
    }
  }

  public updateQuote(symbol: string, quote: CTraderQuote) {
    const normalized = symbol.replace(/[\/\-_ ]/g, '').toUpperCase();
    const entry = this.symbols.get(normalized);
    if (entry) {
      entry.lastQuote = quote;
      entry.firstTickReceived = true;
      entry.status = 'CONNECTED_STREAMING';
    }
  }

  public setDisconnected(isWsConnected: boolean) {
    if (!isWsConnected) {
      for (const entry of this.symbols.values()) {
        if (entry.status !== 'REGISTERED') {
          entry.status = 'DISCONNECTED';
        }
      }
    }
  }
}

export const symbolRegistry = new SymbolRegistryManager();
