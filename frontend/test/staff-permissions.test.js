import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasPermission } from '../src/utils/permissions.js';
import { homePathForRole } from '../src/utils/homePath.js';

test('cached legacy staff permissions cannot restore removed responsibilities', () => {
  const permissions = ['users.view', 'users.update', 'revenue.view', 'analytics.view', 'vendor.dashboard', 'roles.manage', 'partners.review'];
  const admin = { role: 'ADMIN', permissions };
  assert.ok(hasPermission(admin, 'users.update'));
  for (const permission of ['revenue.view', 'analytics.view', 'vendor.dashboard', 'roles.manage', 'partners.review']) assert.equal(hasPermission(admin, permission), false);
  const manager = { role: 'MANAGER', permissions };
  assert.ok(hasPermission(manager, 'revenue.view'));
  assert.ok(hasPermission(manager, 'partners.review'));
  assert.equal(hasPermission(manager, 'users.update'), false);
  assert.equal(hasPermission({ role: 'MANAGER', permissions: [] }, 'revenue.view'), false);
  assert.equal(hasPermission({ role: 'CUSTOMER', permissions }, 'revenue.view'), false);
  assert.equal(homePathForRole('ADMIN'), '/admin');
  assert.equal(homePathForRole('MANAGER'), '/manager');
  assert.equal(homePathForRole('HOTEL_OWNER'), '/vendor');
});
