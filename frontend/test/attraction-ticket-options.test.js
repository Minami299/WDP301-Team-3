import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attractionTicketOptions } from '../src/utils/attractionTicketOptions.js';

test('vendor ticket selection respects activation, availability load and dated inventory', () => {
  const service = { _id: 'service' };
  const type = { _id: 'adult', status: 'ACTIVE', price: 80000, requires_schedule: true,
    schedules: [{ inventory_id: 'stock', available_qty: 3, price: 90000 }] };
  const options = (ticket = type, ready = true) => attractionTicketOptions(service, ticket, '2026-11-03', ready);
  assert.equal(options()[0].available_qty, 3);
  assert.equal(options()[0].price, 90000);
  assert.equal(options({ ...type, status: 'INACTIVE' })[0].available_qty, 0);
  assert.equal(options(type, false)[0].available_qty, 0);
  assert.equal(options({ ...type, schedules: [] })[0].available_qty, 0);
  assert.equal(options({ ...type, schedules: [], requires_schedule: undefined })[0].available_qty, 0);
  assert.equal(options({ ...type, schedules: [], requires_schedule: false })[0].available_qty, 1000);
});
