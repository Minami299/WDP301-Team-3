const { DEFAULT_ROLE_PERMISSIONS } = require('../configs/permissions');

async function migrateStaffRoles(Role) {
  const results = [];
  for (const [role_name, description] of [['ADMIN', 'Quản lý tài khoản người dùng'], ['MANAGER', 'Quản lý kinh doanh và đối tác']]) {
    const result = await Role.updateOne({ role_name }, { $set: { description, permissions: DEFAULT_ROLE_PERMISSIONS[role_name] } }, { upsert: true, runValidators: true });
    results.push({ role: role_name, matched: result.matchedCount, modified: result.modifiedCount, created: result.upsertedCount });
  }
  return results;
}

if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const mongoose = require('mongoose');
  const env = require('../configs/env');
  (async () => {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
      const results = await migrateStaffRoles(require('../models/Role'));
      for (const result of results) console.log(JSON.stringify(result));
    } catch (error) {
      // Driver connection messages can contain configured hosts. Do not log URI.
      console.error(`Staff-role migration failed (${error.name}). Check database connectivity and retry.`);
      process.exitCode = 1;
    } finally { await mongoose.disconnect(); }
  })();
}

module.exports = { migrateStaffRoles };
