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

const logParcel = async () => {
  const res = await request(`${app.api}/parcels`, {
    method: 'POST',
    token,
    body: { studentEnrollmentNo: 'RU2025CS004', carrier: 'Flipkart' },
  });
  assert.equal(res.status, 201);
  return res.body.data;
};

test('a waiting parcel shows up in the student search', async () => {
  const parcel = await logParcel();
  const res = await request(`${app.api}/parcels/search?enrollmentNo=RU2025CS004`, { token });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.lookupNumbers.includes(parcel.lookupNumber));
});

test('pickup succeeds once, then returns 409', async () => {
  const parcel = await logParcel();
  const first = await request(`${app.api}/parcels/${parcel.id}/pickup`, { method: 'PATCH', token });
  assert.equal(first.status, 200);
  assert.equal(first.body.data.status, 'PICKED_UP');

  const second = await request(`${app.api}/parcels/${parcel.id}/pickup`, { method: 'PATCH', token });
  assert.equal(second.status, 409);
});

test('three simultaneous pickups of one parcel: exactly one succeeds', async () => {
  const parcel = await logParcel();
  const results = await Promise.all(
    [1, 2, 3].map(() => request(`${app.api}/parcels/${parcel.id}/pickup`, { method: 'PATCH', token }))
  );
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [200, 409, 409]);
});

test('picking up a parcel that does not exist returns 404', async () => {
  const res = await request(`${app.api}/parcels/00000000-0000-0000-0000-000000000000/pickup`, { method: 'PATCH', token });
  assert.equal(res.status, 404);
});
