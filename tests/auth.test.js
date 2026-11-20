import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, request, login, ADMIN, GUARD } from './helpers.js';

let app;
before(async () => { app = await startApp(); });
after(() => app.close());

test('correct credentials return a token and the user without passwordHash', async () => {
  const res = await request(`${app.api}/auth/login`, { method: 'POST', body: GUARD });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.user.role, 'GUARD');
  assert.equal(res.body.data.user.passwordHash, undefined);
});

test('email is case-insensitive', async () => {
  const res = await request(`${app.api}/auth/login`, {
    method: 'POST',
    body: { email: GUARD.email.toUpperCase(), password: GUARD.password },
  });
  assert.equal(res.status, 200);
});

test('wrong password returns 401', async () => {
  const res = await request(`${app.api}/auth/login`, { method: 'POST', body: { email: GUARD.email, password: 'wrong' } });
  assert.equal(res.status, 401);
  assert.equal(res.body.message, 'Invalid email or password');
});

test('missing token returns 401', async () => {
  const res = await request(`${app.api}/parcels/inventory`);
  assert.equal(res.status, 401);
});

test('tampered token returns 401', async () => {
  const token = await login(app.api, GUARD);
  const res = await request(`${app.api}/auth/me`, { token: `${token}x` });
  assert.equal(res.status, 401);
});

test('/auth/me returns the logged-in user', async () => {
  const token = await login(app.api, ADMIN);
  const res = await request(`${app.api}/auth/me`, { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.email, ADMIN.email);
});

test('guard is forbidden from admin routes (403), admin is allowed', async () => {
  const guardToken = await login(app.api, GUARD);
  const adminToken = await login(app.api, ADMIN);
  assert.equal((await request(`${app.api}/admin/stats`, { token: guardToken })).status, 403);
  assert.equal((await request(`${app.api}/admin/stats`, { token: adminToken })).status, 200);
});
