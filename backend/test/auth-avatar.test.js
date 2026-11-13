const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'auth-avatar-test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/auth_avatar_test';

const { User, UserProfile } = require('../src/models');
const auth = require('../src/services/auth.service');
const { hashPassword } = require('../src/utils/password');

afterEach(() => mock.restoreAll());

const customer = () => ({
  _id: '507f1f77bcf86cd799439011',
  full_name: 'Test Customer',
  email: 'avatar@example.test',
  status: 'ACTIVE',
  is_verified: true,
  role_id: { role_name: 'CUSTOMER' },
});

test('restored sessions use the current saved avatar after replacement and deletion', async () => {
  const user = customer();
  mock.method(User, 'findById', () => ({
    select: () => ({ populate: async () => user }),
  }));
  let profile = { avatar_url: 'https://example.test/first.png' };
  mock.method(UserProfile, 'findOne', filter => {
    assert.equal(filter.user_id, user._id);
    return { select: async () => profile };
  });

  assert.equal((await auth.getMe(user._id)).avatar_url, profile.avatar_url);
  profile = { avatar_url: 'https://example.test/replacement.png' };
  assert.equal((await auth.getMe(user._id)).avatar_url, profile.avatar_url);
  profile = { avatar_url: null };
  assert.equal((await auth.getMe(user._id)).avatar_url, null);
  profile = null;
  assert.equal((await auth.getMe(user._id)).avatar_url, null);
});

test('login includes the saved customer avatar immediately', async () => {
  const user = { ...customer(), password_hash: await hashPassword('TestPassword123') };
  mock.method(User, 'findOne', () => ({ populate: async () => user }));
  mock.method(UserProfile, 'findOne', () => ({
    select: async () => ({ avatar_url: 'https://example.test/saved.png' }),
  }));

  const result = await auth.login({ email: user.email, password: 'TestPassword123' });
  assert.ok(result.token);
  assert.equal(result.user.avatar_url, 'https://example.test/saved.png');
});

test('staff session restoration does not require a customer profile', async () => {
  const user = { ...customer(), role_id: { role_name: 'ADMIN' } };
  mock.method(User, 'findById', () => ({
    select: () => ({ populate: async () => user }),
  }));
  mock.method(UserProfile, 'findOne', () => ({ select: async () => null }));

  assert.equal((await auth.getMe(user._id)).avatar_url, null);
});

const express = require('express');
const userRoutes = require('../src/routes/user.routes');
const users = require('../src/services/user.service');
const storage = require('../src/services/avatar.service');
const { generateToken, ROLES } = require('../src/middlewares/authMiddleware');

for (const role of Object.values(ROLES)) {
  test(`${role} can upload, restore and delete their own avatar`, async () => {
    const user = { ...customer(), role_id: { role_name: role } };
    mock.method(User, 'findById', id => {
      assert.equal(String(id), user._id);
      return { select() { return this; }, populate: async () => user };
    });
    let saved = null;
    mock.method(UserProfile, 'findOne', filter => {
      assert.equal(filter.user_id, user._id);
      return { select: async () => saved };
    });
    mock.method(UserProfile, 'findOneAndUpdate', async (filter, update) => {
      assert.equal(filter.user_id, user._id);
      saved = { avatar_url: update.$set.avatar_url };
      return saved;
    });
    const url = 'https://example.test/avatar.png';
    const upload = mock.method(storage, 'uploadBuffer', async () => ({ secureUrl: url, publicId: 'test/avatar' }));
    mock.method(storage, 'publicIdFromUrl', value => value ? 'test/avatar' : null);
    mock.method(storage, 'deleteByPublicId', async () => {});
    const app = express();
    app.use('/api/users', userRoutes);
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const endpoint = `http://127.0.0.1:${server.address().port}/api/users/me/avatar`;
    const headers = { Authorization: `Bearer ${generateToken({ id: user._id, role })}` };
    try {
      const body = new FormData();
      body.append('avatar', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' }), 'avatar.png');
      const response = await fetch(endpoint, { method: 'POST', headers, body });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).data.avatar_url, url);
      assert.equal(upload.mock.calls[0].arguments[1], user._id);
      assert.equal((await users.getMyProfile(user._id)).avatar_url, url);
      assert.equal((await auth.getMe(user._id)).avatar_url, url);
      const removed = await fetch(endpoint, { method: 'DELETE', headers });
      assert.equal(removed.status, 200);
      assert.equal((await removed.json()).data.avatar_url, null);
      assert.equal((await auth.getMe(user._id)).avatar_url, null);
      const denied = await fetch(endpoint, { method: 'DELETE' });
      assert.equal(denied.status, 401);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
}
