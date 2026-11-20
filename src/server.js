import env from './config/env.js';
import prisma from './config/prisma.js';
import { connectMongo, closeMongo } from './config/mongodb.js';
import app from './app.js';

const start = async () => {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected (Prisma)');
  } catch (err) {
    console.warn('⚠️  PostgreSQL connection failed:', err.message);
    console.warn('   (The server is running; full DB operations require a running PostgreSQL instance)');
  }

  try {
    await connectMongo();
    console.log('MongoDB connected (native driver)');
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed:', err.message);
    console.warn('   (The server is running; MongoDB operations require a running MongoDB instance)');
  }

  const server = app.listen(env.port, () => {
    console.log(`Campus Delivery Matrix API running on http://localhost:${env.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      try { await prisma.$disconnect(); } catch (_) {}
      try { await closeMongo(); } catch (_) {}
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
