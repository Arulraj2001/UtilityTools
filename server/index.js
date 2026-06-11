import { app } from './app.js';
import { apiConfig } from './config/apiConfig.js';

const server = app.listen(apiConfig.port, () => {
  console.log(`QuickUtils API service listening on port ${apiConfig.port}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down QuickUtils API service`);
  server.close((error) => {
    if (error) {
      console.error('QuickUtils API service shutdown failed', error);
      process.exit(1);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
