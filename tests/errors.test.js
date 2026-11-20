import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, request, login, GUARD } from './helpers.js';

let app;
let token;
before(async () => {
  app = await startApp();
  token = await login(app.api, GUARD);
});
after(() => app.close());

test('health check responds', async () => {
  const res = await request(`${app.root}/health`);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('malformed JSON body returns 400 in the error envelope', async () => {
  const res = await request(`${app.api}/parcels`, { method: 'POST', token, rawBody: '{not json' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, 'Invalid JSON in request body');
});

test('unknown route returns 404 in the error envelope', async () => {
  const res = await request(`${app.api}/does-not-exist`, { token });
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Route not found/);
});

test('successful responses use the success envelope', async () => {
  const res = await request(`${app.api}/parcels/inventory`, { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok('data' in res.body);
});

test('request body over the 100kb limit returns 413, not 500', async () => {
  const res = await request(`${app.api}/auth/login`, {
    method: 'POST',
    body: { email: 'a@b.c', password: 'x'.repeat(200 * 1024) },
  });
  assert.equal(res.status, 413);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, 'Request body is too large (limit 100kb)');
});
