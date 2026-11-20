// Shared helpers for the API tests (run with `npm test`).
// Starts the real Express app on a random free port against the TEST database.
import { execSync } from 'node:child_process';

if (!/test/i.test(process.env.DATABASE_URL || '')) {
  throw new Error('Refusing to run tests: DATABASE_URL must point at a test database (name containing "test"). See .env.test.example.');
}

let databaseReady = false;

// Apply migrations and seed the test database once per test file.
// Both steps are safe to repeat (migrate deploy skips applied migrations, the seed uses upserts).
const prepareDatabase = () => {
  if (databaseReady) return;
  execSync('npx prisma migrate deploy', { stdio: 'ignore' });
  execSync('node prisma/seed.js', { stdio: 'ignore' });
  databaseReady = true;
};

export const startApp = async () => {
  prepareDatabase();
  const { default: app } = await import('../src/app.js');
  const { default: prisma } = await import('../src/config/prisma.js');

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const root = `http://127.0.0.1:${server.address().port}`;

  const close = async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  };

  return { root, api: `${root}/api/v1`, close };
};

// Small fetch wrapper: returns { status, body }.
export const request = async (url, { method = 'GET', token, body, rawBody } = {}) => {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: rawBody ?? (body ? JSON.stringify(body) : undefined),
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty or non-JSON body */ }
  return { status: res.status, body: json };
};

// Seeded accounts from prisma/seed.js.
export const ADMIN = { email: 'admin@campus.edu', password: 'Admin@123' };
export const GUARD = { email: 'guard1@campus.edu', password: 'Guard@123' };

export const login = async (api, { email, password }) => {
  const { status, body } = await request(`${api}/auth/login`, { method: 'POST', body: { email, password } });
  if (status !== 200) throw new Error(`Login failed for ${email}: ${status}`);
  return body.data.token;
};
