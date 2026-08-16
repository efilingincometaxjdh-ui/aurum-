import { Server } from 'http';
import { logger } from './utils/logger.js';
import { cTraderClient } from './market/CTraderClient.js';
import { cTraderWebSocket } from './market/CTraderWebSocket.js';
import { pipelineOrchestrator } from './pipeline/PipelineOrchestrator.js';
import { aurumExecutor } from './executor/AurumExecutor.js';

export function setupLifecycle(server: Server) {
  logger.info('Initializing AURUM Intelligence Engine Lifecycle Handlers...', 'Lifecycle');
  logger.info('Booting Aurum Executor Trading Client & Risk Gateway...', 'Lifecycle');

  // Start persistent cTrader WebSocket stream
  cTraderWebSocket.connect();

  // Establish server-to-server connection now that HTTP server is listening
  if (server.listening) {
    aurumExecutor.connect();
  } else {
    server.once('listening', () => {
      aurumExecutor.connect();
    });
  }

  // Pre-warm pipeline and cTrader connector on startup
  setTimeout(async () => {
    try {
      logger.info('Performing initial pipeline pre-warm run...', 'Lifecycle');
      await pipelineOrchestrator.runPipeline('trc_startup_prewarm', true);
      logger.info('AURUM Engine pre-warm completed successfully', 'Lifecycle');
    } catch (err: any) {
      logger.warn(`Startup pre-warm failed: ${err.message}`, 'Lifecycle');
    }
  }, 1000);

  // Background auto-refresh interval (every 30 seconds)
  const autoRefreshTimer = setInterval(async () => {
    try {
      await pipelineOrchestrator.runPipeline(`trc_bg_${Date.now()}`, true);
    } catch (err: any) {
      logger.debug(`Background pipeline run status: ${err.message}`, 'Lifecycle');
    }
  }, 30000);

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown of AURUM Engine...`, 'Lifecycle');
    clearInterval(autoRefreshTimer);
    cTraderWebSocket.disconnect();

    server.close(() => {
      logger.info('HTTP server closed. Engine shut down cleanly.', 'Lifecycle');
      process.exit(0);
    });

    // Force exit after 10s if remaining open connections
    setTimeout(() => {
      logger.error('Forced shutdown timeout reached.', 'Lifecycle');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
