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

const logParcel = (enrollmentNo) =>
  request(`${app.api}/parcels`, {
    method: 'POST',
    token,
    body: { studentEnrollmentNo: enrollmentNo, carrier: 'Amazon' },
  });

test('a logged parcel gets a P-### tag', async () => {
  const res = await logParcel('RU2025CS001');
  assert.equal(res.status, 201);
  assert.match(res.body.data.lookupNumber, /^P-\d+$/);
});

test('consecutive parcels get consecutive tags', async () => {
  const first = await logParcel('RU2025CS002');
  const second = await logParcel('RU2025CS003');
  const n = (r) => Number(r.body.data.lookupNumber.slice(2));
  assert.equal(n(second), n(first) + 1);
});

test('12 guards logging at the same moment all succeed with unique tags', async () => {
  const results = await Promise.all(
    Array.from({ length: 12 }, (_, i) => logParcel(`RU2025CS00${(i % 9) + 1}`))
  );
  assert.deepEqual(results.map((r) => r.status), Array(12).fill(201));
  const tags = results.map((r) => r.body.data.lookupNumber);
  assert.equal(new Set(tags).size, 12, `duplicate tags issued: ${tags.join(', ')}`);
});

test('unknown student returns 404', async () => {
  const res = await logParcel('NOT-A-STUDENT');
  assert.equal(res.status, 404);
});
