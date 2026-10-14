const mongoose = require('mongoose');
const env = require('../src/configs/env');
const { migrateTicketTypes } = require('../src/services/ticketMigration.service');
(async () => {
  await mongoose.connect(env.mongoUri);
  console.log(JSON.stringify(await migrateTicketTypes({ apply: process.argv.includes('--apply') }), null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
