export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  traceId?: string;
  module?: string;
  context?: Record<string, any>;
}

class Logger {
  private formatLog(entry: LogEntry): string {
    const traceStr = entry.traceId ? ` [trace:${entry.traceId}]` : '';
    const moduleStr = entry.module ? ` [${entry.module}]` : '';
    const ctxStr = entry.context && Object.keys(entry.context).length > 0 ? ` ${JSON.stringify(entry.context)}` : '';
    return `${entry.timestamp} [${entry.level.toUpperCase()}]${moduleStr}${traceStr}: ${entry.message}${ctxStr}`;
  }

  log(level: LogLevel, message: string, module?: string, traceId?: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module,
      traceId,
      context
    };

    const formatted = this.formatLog(entry);
    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
        break;
    }
  }

  info(message: string, module?: string, traceId?: string, context?: Record<string, any>) {
    this.log('info', message, module, traceId, context);
  }

  warn(message: string, module?: string, traceId?: string, context?: Record<string, any>) {
    this.log('warn', message, module, traceId, context);
  }

  error(message: string, module?: string, traceId?: string, context?: Record<string, any>) {
    this.log('error', message, module, traceId, context);
  }

  debug(message: string, module?: string, traceId?: string, context?: Record<string, any>) {
    this.log('debug', message, module, traceId, context);
  }
}

export const logger = new Logger();
