import env from './config/env.js';
import prisma from './config/prisma.js';
import { connectMongo } from './config/mongodb.js';
import app from './app.js';

const start = async () => {
  await prisma.$connect();
  console.log('PostgreSQL connected (Prisma)');

  await connectMongo();
  console.log('MongoDB connected (native driver)');

  app.listen(env.port, () => {
    console.log(`Campus Delivery Matrix API running on http://localhost:${env.port}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
