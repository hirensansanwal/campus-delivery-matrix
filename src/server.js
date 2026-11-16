import env from './config/env.js';
import prisma from './config/prisma.js';
import app from './app.js';

const start = async () => {
  await prisma.$connect();
  console.log('PostgreSQL connected (Prisma)');

  app.listen(env.port, () => {
    console.log(`Campus Delivery Matrix API running on http://localhost:${env.port}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
