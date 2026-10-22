const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { setTimeout: delay } = require('node:timers/promises');
process.env.JWT_SECRET = 'review-responses-test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/travelio_review_responses_test';
const mongoose = require('mongoose');
const express = require('express');
const { User, Role, Facility, Review, Service, Booking, BookingDetail } = require('../src/models');
const { generateToken } = require('../src/middlewares/authMiddleware');
const routes = require('../src/routes/facility.routes');
const service = require('../src/services/facility.service');

test('UC21: HTTP API and persistence in an isolated MongoDB', { skip: !process.env.MONGOD_BINARY, timeout: 60000 }, async t => {
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'travelio-review-responses-'));
  const mongo = spawn(process.env.MONGOD_BINARY, ['--dbpath', dbPath, '--port', String(port), '--bind_ip', '127.0.0.1', '--quiet', '--logpath', path.join(dbPath, 'mongo.log')], { stdio: 'ignore', windowsHide: true });
  let server;
  try {
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        await mongoose.connect(`mongodb://127.0.0.1:${port}/travelio_review_responses_test`, { serverSelectionTimeoutMS: 500 });
        break;
      } catch (error) {
        if (attempt === 39) throw error;
        await delay(100);
      }
    }
    const roles = await Role.create(['HOTEL_OWNER', 'ACTIVITY_VENDOR', 'CUSTOMER', 'ADMIN', 'MANAGER'].map(role_name => ({ role_name })));
    const users = await User.create(roles.map((role, index) => ({ full_name: role.role_name, email: `review-${index}@example.com`, password_hash: 'test-only', role_id: role._id, status: 'ACTIVE', is_verified: true })));
    const [owner, vendor, customer, admin] = users;
    const tokens = users.map((user, index) => generateToken({ id: String(user._id), role: roles[index].role_name }));
    const [hotel, attraction, anotherHotel, wrongType] = await Facility.create([
      { vendor_id: owner._id, type: 'HOTEL', name: 'Hotel A' },
      { vendor_id: vendor._id, type: 'ATTRACTION', name: 'Attraction A' },
      { vendor_id: admin._id, type: 'HOTEL', name: 'Other Hotel' },
      { vendor_id: owner._id, type: 'ATTRACTION', name: 'Wrong type' }
    ].map(facility => ({ ...facility, address: '123 Test', city: 'Đà Nẵng', status: 'ACTIVE' })));
    const reviews = await Review.create([hotel, attraction, anotherHotel, wrongType].map(facility => ({ facility_id: facility._id, customer_id: customer._id, rating: 4, comment: 'Đánh giá của khách' })));
    const [hotelReview, attractionReview, otherReview, wrongTypeReview] = reviews;
    const app = express();
    app.use(express.json());
    app.use('/api/facilities', routes);
    app.use('/api/auth', require('../src/routes/auth.routes'));
    const frontend = path.resolve(__dirname, '../../frontend/dist');
    app.use(express.static(frontend));
    app.get('*', (req, res) => res.sendFile(path.join(frontend, 'index.html')));
    app.use((error, req, res, _next) => res.status(error.statusCode || 500).json({ success: false, message: error.message }));
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/facilities`;
    const request = async (route, token, body, method = 'GET') => {
      const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, ...await response.json() };
    };
    const replyPath = (facility, review) => `/${facility._id}/reviews/${review._id}/reply`;
    const hotelPath = replyPath(hotel, hotelReview);
    const attractionPath = replyPath(attraction, attractionReview);

    await t.test('owner and vendor only list reviews of their own facility type', async () => {
      for (const [token, expected] of [[tokens[0], hotelReview], [tokens[1], attractionReview]]) {
        const result = await request('/reviews/managed', token);
        assert.equal(result.status, 200, result.message);
        assert.deepEqual(result.data.reviews.map(review => review._id), [String(expected._id)]);
        assert.equal(result.data.reviews[0].customer_id.full_name, 'CUSTOMER');
        assert.equal(result.data.reviews[0].customer_id.email, undefined);
        assert.equal(result.data.pagination.total, 1);
      }
      for (const page of ['0', '-1', '1.5', 'abc', 'Infinity']) assert.equal((await request(`/reviews/managed?page=${page}`, tokens[0])).status, 400);
    });

    await t.test('missing, invalid and expired tokens are rejected on list and both reply methods', async () => {
      const expired = generateToken({ id: String(owner._id), role: 'HOTEL_OWNER' }, -1);
      for (const token of [undefined, 'invalid-token', expired]) {
        assert.ok([401, 403].includes((await request('/reviews/managed', token)).status));
        for (const method of ['POST', 'PUT']) assert.ok([401, 403].includes((await request(hotelPath, token, { reply: 'Unauthorized' }, method)).status));
      }
    });

    await t.test('customer, admin and manager cannot create or edit partner responses', async () => {
      for (const token of [tokens[2], tokens[3], tokens[4]]) {
        assert.equal((await request('/reviews/managed', token)).status, 403);
        for (const method of ['POST', 'PUT']) assert.equal((await request(hotelPath, token, { reply: 'Forbidden' }, method)).status, 403);
      }
      assert.equal((await Review.findById(hotelReview._id)).vendor_reply, null);
    });

    await t.test('hotel owner and attraction vendor create responses and persist author and time', async () => {
      for (const [route, token, actor, review] of [[hotelPath, tokens[0], owner, hotelReview], [attractionPath, tokens[1], vendor, attractionReview]]) {
        const result = await request(route, token, { reply: '  Cảm ơn quý khách!  ' }, 'POST');
        assert.equal(result.status, 200, result.message);
        const stored = await Review.findById(review._id);
        assert.equal(stored.vendor_reply, 'Cảm ơn quý khách!');
        assert.equal(String(stored.vendor_reply_by), String(actor._id));
        assert.ok(stored.vendor_replied_at instanceof Date);
        assert.equal(stored.rating, 4);
        assert.equal(stored.comment, 'Đánh giá của khách');
      }
    });

    await t.test('ownership, facility type, parent URL and original author are enforced', async () => {
      for (const method of ['POST', 'PUT']) {
        assert.equal((await request(hotelPath, tokens[1], { reply: 'Other vendor' }, method)).status, 404);
        assert.equal((await request(replyPath(anotherHotel, otherReview), tokens[0], { reply: 'Other owner' }, method)).status, 404);
        assert.equal((await request(replyPath(wrongType, wrongTypeReview), tokens[0], { reply: 'Wrong type' }, method)).status, 404);
        assert.equal((await request(replyPath(hotel, attractionReview), tokens[0], { reply: 'Wrong parent' }, method)).status, 404);
      }
      await Review.updateOne({ _id: hotelReview._id }, { $set: { vendor_reply_by: vendor._id } });
      assert.equal((await request(hotelPath, tokens[0], { reply: 'Overwrite another author' }, 'PUT')).status, 403);
      assert.equal((await Review.findById(hotelReview._id)).vendor_reply, 'Cảm ơn quý khách!');
      await Review.updateOne({ _id: hotelReview._id }, { $set: { vendor_reply_by: owner._id } });
    });

    await t.test('empty, malformed, oversized responses and invalid IDs fail without writes', async () => {
      for (const reply of [undefined, null, '', ' \n\t ', 123, true, {}, [], 'x'.repeat(5001)]) {
        assert.equal((await request(hotelPath, tokens[0], { reply }, 'POST')).status, 400);
      }
      assert.equal((await request('/bad/reviews/bad/reply', tokens[0], { reply: 'Test' }, 'PUT')).status, 400);
      assert.equal((await request(`/${hotel._id}/reviews/${new mongoose.Types.ObjectId()}/reply`, tokens[0], { reply: 'Test' }, 'PUT')).status, 404);
      assert.equal((await Review.findById(hotelReview._id)).vendor_reply, 'Cảm ơn quý khách!');
    });

    await t.test('editing through PUT and legacy POST updates one response, including concurrent submissions', async () => {
      for (const [method, reply] of [['PUT', 'Nội dung đã sửa'], ['POST', 'Sửa qua API cũ']]) {
        const result = await request(hotelPath, tokens[0], { vendor_reply: reply }, method);
        assert.equal(result.status, 200, result.message);
        assert.equal(result.data.vendor_reply, reply);
      }
      const results = await Promise.all(['Phản hồi A', 'Phản hồi B'].map(reply => request(attractionPath, tokens[1], { reply }, 'POST')));
      assert.ok(results.every(result => result.status === 200));
      assert.equal(await Review.countDocuments({ _id: attractionReview._id }), 1);
      assert.ok(['Phản hồi A', 'Phản hồi B'].includes((await Review.findById(attractionReview._id)).vendor_reply));
    });

    await t.test('legacy responses without author metadata remain editable by the current owner', async () => {
      await Review.updateOne({ _id: hotelReview._id }, { $unset: { vendor_reply_by: 1, vendor_replied_at: 1 } });
      const result = await request(hotelPath, tokens[0], { reply: 'Phản hồi cũ đã cập nhật' }, 'PUT');
      assert.equal(result.status, 200, result.message);
      assert.equal(result.data.vendor_reply_by, String(owner._id));
    });

    await t.test('public facility detail includes the persisted reply and author metadata for both types', async () => {
      for (const [facility, review] of [[hotel, hotelReview], [attraction, attractionReview]]) {
        const result = await request(`/${facility._id}`);
        assert.equal(result.status, 200, result.message);
        const published = result.data.reviews.find(item => item._id === String(review._id));
        assert.equal(published.vendor_reply, (await Review.findById(review._id)).vendor_reply);
        assert.ok(published.vendor_reply_by);
        assert.ok(published.vendor_replied_at);
      }
    });

    const chromeBinary = process.env.CHROME_BINARY || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    await t.test('browser: both partners can create/edit/reload responses, paginate and use mobile layout', { skip: !fs.existsSync(chromeBinary) || !fs.existsSync(path.join(frontend, 'index.html')) }, async () => {
      const browserReviews = await Review.create([hotel, attraction].flatMap(facility => Array.from({ length: 10 }, (_, index) => ({ facility_id: facility._id, customer_id: customer._id, rating: 4, comment: `Browser review ${index}` }))));
      try {
        await require('./review-responses-browser.cjs')({
          origin: base.replace('/api/facilities', ''), directory: dbPath, chromeBinary,
          sessions: await Promise.all([owner, vendor].map(async (actor, index) => ({ token: tokens[index], user: await require('../src/services/auth.service').getMe(actor._id) }))),
          verify: async (actor, content) => assert.equal(await Review.countDocuments({ vendor_reply_by: actor, vendor_reply: content }), 1)
        });
      } finally {
        await Review.deleteMany({ _id: { $in: browserReviews.map(review => review._id) } });
      }
    });

    await t.test('customer review creation, editing and rating still work and preserve partner reply', async () => {
      const room = await Service.create({ facility_id: hotel._id, type: 'ROOM', name: 'Room', base_price: 100 });
      const booking = await Booking.create({ booking_code: 'UC21-REVIEW', customer_id: customer._id, guest_name: 'Customer', guest_email: customer.email, guest_phone: '0912345678', status: 'CONFIRMED' });
      await BookingDetail.create({ booking_id: booking._id, facility_id: hotel._id, service_id: room._id, quantity: 1 });
      await Review.deleteOne({ _id: hotelReview._id });
      const created = await request(`/${hotel._id}/reviews`, tokens[2], { rating: 5, comment: 'Đánh giá mới' }, 'POST');
      assert.equal(created.status, 201, created.message);
      const newPath = `/${hotel._id}/reviews/${created.data._id}/reply`;
      assert.equal((await request(newPath, tokens[0], { reply: 'Cảm ơn' }, 'POST')).status, 200);
      const edited = await request(`/${hotel._id}/reviews`, tokens[2], { rating: 3, comment: 'Đánh giá đã sửa' }, 'POST');
      assert.equal(edited.status, 201, edited.message);
      assert.equal(edited.data._id, created.data._id);
      assert.equal(edited.data.rating, 3);
      assert.equal(edited.data.vendor_reply, 'Cảm ơn');
      // Preserve the existing rating normalization (values above five are clamped).
      const normalized = await request(`/${hotel._id}/reviews`, tokens[2], { rating: 6, comment: 'Rating normalization' }, 'POST');
      assert.equal(normalized.status, 201);
      assert.equal(normalized.data.rating, 5);
    });

    await t.test('locked, pending or downgraded accounts cannot use an existing partner token', async () => {
      for (const status of ['LOCKED', 'PENDING']) {
        await User.updateOne({ _id: vendor._id }, { $set: { status } });
        assert.equal((await request(attractionPath, tokens[1], { reply: 'Blocked' }, 'PUT')).status, 403);
        assert.equal((await request('/reviews/managed', tokens[1])).status, 403);
      }
      await User.updateOne({ _id: vendor._id }, { $set: { status: 'ACTIVE', role_id: customer.role_id } });
      assert.equal((await request(attractionPath, tokens[1], { reply: 'Stale role' }, 'PUT')).status, 403);
      await User.updateOne({ _id: vendor._id }, { $set: { role_id: roles[1]._id } });
      await Role.updateOne({ _id: roles[1]._id }, { $set: { permissions: [] } });
      assert.equal((await request('/reviews/managed', tokens[1])).status, 403);
      assert.equal((await request(attractionPath, tokens[1], { reply: 'Revoked permission' }, 'PUT')).status, 403);
      await assert.rejects(service.replyToReview({ id: String(customer._id), role: 'CUSTOMER' }, String(hotel._id), String(hotelReview._id), 'Direct service call'), { statusCode: 403 });
    });

    await t.test('pagination has stable ordering and no duplicate or foreign reviews', async () => {
      await Review.create(Array.from({ length: 12 }, (_, index) => ({ facility_id: hotel._id, customer_id: customer._id, rating: 4, comment: `Review ${index}` })));
      const first = await request('/reviews/managed', tokens[0]);
      const second = await request('/reviews/managed?page=2', tokens[0]);
      assert.equal(first.data.reviews.length, 10);
      assert.equal(second.data.reviews.length, 3);
      assert.equal(first.data.pagination.total, 13);
      assert.equal(new Set([...first.data.reviews, ...second.data.reviews].map(review => review._id)).size, 13);
      assert.ok([...first.data.reviews, ...second.data.reviews].every(review => review.facility_id._id === String(hotel._id)));
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) {
      try { await mongoose.connection.db.admin().command({ shutdown: 1 }); } catch {}
    }
    await mongoose.disconnect();
    mongo.kill();
  }
});
