import { createApp } from './src/server/app.js';
import { setupLifecycle } from './src/server/lifecycle.js';
import { logger } from './src/server/utils/logger.js';

const PORT = 3000;

async function start() {
  try {
    const app = await createApp();
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`AURUM XAUUSD Intelligence Infrastructure running on http://0.0.0.0:${PORT}`, 'Server');
    });

    setupLifecycle(server);
  } catch (err: any) {
    logger.error(`Fatal server start error: ${err.message}`, 'Server', undefined, { stack: err.stack });
    process.exit(1);
  }
}

start();
