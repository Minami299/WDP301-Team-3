const { mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { User, Role, Facility, Service, AuditLog } = require('../src/models');
const Application = require('../src/models/PartnerApplication');
const email = require('../src/services/email.service');
const otp = require('../src/services/authOtp.service');

const userId = '507f1f77bcf86cd799439011';
const roleId = '507f1f77bcf86cd799439012';
const query = value => {
  const result = { select: () => result, populate: () => result, session: () => result, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) };
  return result;
};

function draftSetup() {
  const session = {};
  mock.method(mongoose.connection, 'transaction', async fn => fn(session));
  mock.method(User, 'exists', async () => null);
  mock.method(Role, 'findOne', async () => ({ _id: roleId, role_name: 'CUSTOMER' }));
  mock.method(User, 'create', async (fields, options) => {
    assert.equal(options.session, session);
    return fields.map(field => ({ ...field, _id: userId }));
  });
  mock.method(Application, 'create', async (fields, options) => {
    assert.equal(options.session, session);
    return fields.map(field => new Application(field));
  });
  mock.method(AuditLog, 'create', async (_fields, options) => { assert.equal(options.session, session); return []; });
  mock.method(Facility, 'create', async () => { throw Error('No public business before approval'); });
  mock.method(Service, 'insertMany', async () => { throw Error('No public service before approval'); });
  mock.method(email, 'assertSmtpConfigured', () => {});
  mock.method(otp, 'send', async (user, kind) => {
    assert.equal(user.is_verified, false); assert.equal(kind, 'verification');
    return { resendAfterSeconds: 60 };
  });
  return session;
}

module.exports = { query, draftSetup, userId, roleId };
