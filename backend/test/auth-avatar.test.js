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
  const profileLookup = mock.method(UserProfile, 'findOne', () => {
    throw new Error('Staff should not query a customer profile');
  });

  assert.equal((await auth.getMe(user._id)).avatar_url, null);
  assert.equal(profileLookup.mock.callCount(), 0);
});
