import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';

async function main() {
  const app = createApp();

  // Verify database connection
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');
  } catch (error) {
    logger.error({ error }, '❌ Failed to connect to PostgreSQL');
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, `🚀 ReachInbox Scheduler API running on port ${env.PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error({ error }, 'Fatal startup error');
  process.exit(1);
});
