const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'informational-attraction-unit-test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/travelio_catalog_test';
const { Facility, Service, ServiceInventory } = require('../src/models');
const booking = require('../src/services/booking.service');
const { publicFacility } = require('../src/utils/publicFacility');
const { assertTestDatabase } = require('../src/utils/testDatabase');
const { approvalStatusOf, assertActiveAccount } = require('../src/utils/accountStatus');
const { ensureTicketInventoryIndex } = require('../src/services/ticketMigration.service');
const { confirmedTest } = require('../scripts/curate-attractions.cjs');
const id = '507f1f77bcf86cd799439011';
const query = rows => ({ populate() { return this; }, then(resolve, reject) { return Promise.resolve(rows).then(resolve, reject); } });
afterEach(() => mock.restoreAll());

test('informational listings need no invented vendor account or ticket price', () => {
  const facility = new Facility({ listing_mode: 'INFORMATIONAL', type: 'ATTRACTION', name: 'Heritage site', address: 'Verified address', city: 'Đà Nẵng' });
  assert.equal(facility.validateSync(), undefined);
  const service = new Service({ facility_id: facility._id, type: 'TICKET', informational_only: true, name: 'Site visit', base_price: null, ticket_types: [] });
  assert.equal(service.validateSync(), undefined);
  facility.listing_mode = 'BOOKABLE';
  assert.ok(facility.validateSync().errors.vendor_id);
  service.informational_only = false;
  assert.ok(service.validateSync().errors.base_price);
});

test('unknown catalog prices stay null and legacy seed offers are not exposed as catalog offers', () => {
  const original = { listing_mode: 'INFORMATIONAL', min_price: 0, services: [
    { informational_only: false, base_price: 100000 },
    { informational_only: true, base_price: 0, name: 'Visit' },
  ] };
  const result = publicFacility(original);
  assert.equal(result.min_price, null);
  assert.deepEqual(result.services, [{ informational_only: true, base_price: null, name: 'Visit', ticket_types: [] }]);
  const bookable = { listing_mode: 'BOOKABLE', min_price: 100000 };
  assert.equal(publicFacility(bookable), bookable);
});

test('direct checkout rejects informational facilities even with a forged legacy ticket id', async () => {
  mock.method(Service, 'find', () => query([{ _id: id, name: 'Visit', base_price: null, ticket_types: [], facility_id: { status: 'ACTIVE', listing_mode: 'INFORMATIONAL' } }]));
  await assert.rejects(booking.quoteBooking(id, { items: [{ service_id: id, ticket_type_id: id, quantity: 1 }] }), { statusCode: 409 });
});

test('scheduled checkout also rejects informational facilities even if inventory exists', async () => {
  mock.method(ServiceInventory, 'find', () => query([{ _id: id, available_qty: 10, service_id: { name: 'Visit', facility_id: { status: 'ACTIVE', listing_mode: 'INFORMATIONAL' } } }]));
  await assert.rejects(booking.quoteBooking(id, { items: [{ inventory_id: id, quantity: 1 }] }), { statusCode: 409 });
});

test('cleanup never classifies a facility from a missing photo or zero price', () => {
  assert.equal(confirmedTest({ name: 'A real park', address: 'Verified address', description: 'Free community park', images: [], min_price: 0 }), null);
  assert.equal(confirmedTest({ name: 'abc', address: 'Real street', description: 'Actual business' }), null);
  assert.ok(confirmedTest({ name: 'abc', address: 'abc', description: '123' }));
  assert.ok(confirmedTest({ name: 'Travelio Tours Pending QA', address: '123 Test Street' }));
});

test('demo seed and live fixture scripts cannot repopulate the application database', () => {
  for (const uri of ['mongodb://localhost/travelio_db', 'mongodb+srv://example.test/travelio']) assert.throws(() => assertTestDatabase(uri));
  assert.doesNotThrow(() => assertTestDatabase('mongodb://localhost/travelio_catalog_test'));
});

test('internal operator login does not imply partner approval and still respects locks/rejections', () => {
  const user = { account_kind: 'INTERNAL', role: 'ACTIVITY_VENDOR', status: 'ACTIVE', approvalStatus: null, is_verified: false };
  assert.equal(approvalStatusOf(user), null);
  assert.doesNotThrow(() => assertActiveAccount(user));
  assert.throws(() => assertActiveAccount({ ...user, status: 'LOCKED' }), { code: 'ACCOUNT_LOCKED' });
  assert.throws(() => assertActiveAccount({ ...user, approvalStatus: 'REJECTED' }), { code: 'REGISTRATION_REJECTED' });
});

test('informational pages can expose inactive draft types without publishing live offers or base prices', () => {
  const draft = { name: 'Reference ticket', price: 60000, status: 'INACTIVE' };
  const result = publicFacility({ listing_mode: 'INFORMATIONAL', services: [{ informational_only: true, base_price: 60000, ticket_types: [draft, { name: 'Accidentally active', price: 1, status: 'ACTIVE' }] }] });
  assert.equal(result.services[0].base_price, null);
  assert.deepEqual(result.services[0].ticket_types, [draft]);
});

test('inventory upgrade builds the ticket-type unique key before dropping only the obsolete key', async () => {
  const steps = [];
  mock.method(ServiceInventory.collection, 'createIndex', async (key, options) => { assert.equal(key.ticket_type_id, 1); assert.equal(options.unique, true); steps.push('create'); });
  mock.method(ServiceInventory.collection, 'indexes', async () => [{ name: 'old', unique: true, key: { service_id: 1, target_date: 1, time_slot: 1 } }, { name: 'date', key: { target_date: 1 } }]);
  mock.method(ServiceInventory.collection, 'dropIndex', async name => { assert.equal(name, 'old'); steps.push('drop'); });
  assert.equal(await ensureTicketInventoryIndex(), true);
  assert.deepEqual(steps, ['create', 'drop']);
});

test('inventory upgrade preserves the old constraint if the replacement cannot be built', async () => {
  mock.method(ServiceInventory.collection, 'createIndex', async () => { throw Error('duplicate'); });
  const drop = mock.method(ServiceInventory.collection, 'dropIndex', async () => {});
  await assert.rejects(ensureTicketInventoryIndex(), /duplicate/);
  assert.equal(drop.mock.callCount(), 0);
});
