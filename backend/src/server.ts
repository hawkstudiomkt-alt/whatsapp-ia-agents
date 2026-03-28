import Fastify from 'fastify';
import cors from '@fastify/cors';
import { routes } from './routes';
import { prisma } from './config/database';
import { followupService } from './services/followup.service';
import fs from 'fs';
import path from 'path';

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// Plugins
app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});

// Routes
app.register(routes, { prefix: '/api' });

// Error handler global
app.setErrorHandler((error: any, request, reply) => {
  app.log.error(error);
  
  // Log to disk for debugging
  const logPath = path.join(process.cwd(), 'backend_error.log');
  const logMsg = `[${new Date().toISOString()}] ERROR: ${error.message}\nSTACK: ${error.stack}\n\n`;
  fs.appendFileSync(logPath, logMsg);

  return reply.status(error.statusCode || 500).send({
    error: error.name,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  try {
    await app.close();
    await prisma.$disconnect();
    console.log('Shutdown completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  const port = parseInt(process.env.PORT || '3333', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    // Test database connection
    await prisma.$connect();
    console.log('Database connected successfully');

    await app.listen({ port, host });
    console.log(`🚀 Server running at http://${host}:${port}`);
    console.log(`📡 Webhook endpoint: http://${host}:${port}/api/webhook`);

    // Inicia o motor de follow-ups
    followupService.startEngine();
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();
