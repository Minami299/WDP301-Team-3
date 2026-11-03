// Explicit, repeatable catalog migration. Default is a read-only plan; --apply writes.
// Never deletes accounts, applications, orders, payments, reviews, or audit records.
const fs = require('node:fs');
const path = require('node:path');
const { EJSON } = require('bson');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const { Facility, FacilityImage, Service } = require('../src/models');
const catalog = require('../src/seeds/attraction-catalog.json');
const credits = require('../public/catalog/credits.json');

function confirmedTest(facility, vendor) {
  if (facility.catalog_key) return null;
  if (facility.name === 'abc' && facility.address === 'abc' && facility.description === '123') {
    return 'Placeholder name/address abc and description 123, confirmed in the requested cleanup.';
  }
  if (/^(Travelio Tours Pending QA|Customer Upgrade Pending QA|Vendor Long Email QA)$/.test(facility.name)
      && /^123 (Test|QA)/.test(facility.address)) return 'Exact fixture name/address from registration/approval QA scripts.';
  if (/^(Cơ sở kiểm thử hạng vé|Travelio Sapa - kiểm thử đăng ký)$/.test(facility.name)
      || /^(MVP Orders Test|Other Orders Test) \d+$/.test(facility.name)) return 'Explicit ticket/registration test fixture.';
  if (facility.name === 'Tour Hội An Test' && facility.description === '123') return 'Explicit Test name and placeholder description.';
  if (facility.name === 'Sun World Ba Na Hills Đà Nẵng' && vendor?.email === 'sunworld.vendor@travelio.com') {
    return 'Exact seed.js facility and fabricated seed vendor; contains demo ticket service. Preserve its financial history.';
  }
  return null;
}

const childCollections = ['services', 'service_inventory', 'facility_images', 'facility_amenities'];
async function inspect(db, facility, collectionNames, session) {
  const options = session ? { session } : {};
  const services = await db.collection('services').find({ facility_id: facility._id }, options).toArray();
  const serviceIds = services.map(service => service._id);
  const inventory = await db.collection('service_inventory').find({ service_id: { $in: serviceIds } }, options).toArray();
  const ids = [facility._id, ...serviceIds, ...inventory.map(row => row._id)];
  const links = { $or: [
    { facility_id: facility._id }, { service_id: { $in: serviceIds } },
    { inventory_id: { $in: inventory.map(row => row._id) } },
    { record_id: { $in: ids } }, { related_id: { $in: ids } },
    { 'items.facility_id': facility._id }, { 'items.service_id': { $in: serviceIds } },
  ] };
  const details = await db.collection('booking_details').find(links, options).toArray();
  const bookingIds = details.map(detail => detail.booking_id);
  const references = {};
  // Session operations are sequential; a transaction must not run parallel commands.
  for (const name of collectionNames.filter(name => !childCollections.includes(name) && name !== 'facilities')) {
    const query = { $or: [...links.$or,
      { booking_id: { $in: bookingIds } }, { booking_detail_id: { $in: details.map(detail => detail._id) } },
      ...(name === 'bookings' ? [{ _id: { $in: bookingIds } }, ...(facility.vendor_id ? [{ vendor_id: facility.vendor_id }] : [])] : []),
    ] };
    const count = await db.collection(name).countDocuments(query, options);
    if (count) references[name] = count;
  }
  const images = await db.collection('facility_images').find({ facility_id: facility._id }, options).toArray();
  const amenities = await db.collection('facility_amenities').find({ facility_id: facility._id }, options).toArray();
  return { references, children: { services, service_inventory: inventory, facility_images: images, facility_amenities: amenities } };
}

async function run({ apply = false } = {}) {
  const backupDir = path.resolve(__dirname, '../.catalog-backups', new Date().toISOString().replace(/[:.]/g, '-'));
  if (apply) fs.mkdirSync(backupDir, { recursive: true });
  const report = { applied: apply, deleted: [], hidden: [], added: [], untouched: [] };
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;
    const protectedNames = ['users', 'bookings', 'booking_details', 'payments', 'payouts', 'payout_details', 'reviews'];
    report.protected_before = {};
    for (const name of protectedNames) report.protected_before[name] = await db.collection(name).countDocuments({});
    const collectionNames = (await db.listCollections().toArray()).map(row => row.name);
    for (const facility of await db.collection('facilities').find({ type: 'ATTRACTION' }).toArray()) {
      const vendor = facility.vendor_id ? await db.collection('users').findOne({ _id: facility.vendor_id }, { projection: { email: 1 } }) : null;
      const reason = confirmedTest(facility, vendor);
      if (!reason) { if (!facility.catalog_key) report.untouched.push({ id: String(facility._id), name: facility.name, status: facility.status }); continue; }
      const execute = async session => {
        const options = session ? { session } : {};
        const current = await db.collection('facilities').findOne({ _id: facility._id }, options);
        if (!current) return;
        if (!confirmedTest(current, vendor)) throw Error('Fixture changed during audit; refusing cleanup: ' + current._id);
        const audit = await inspect(db, current, collectionNames, session);
        const action = Object.keys(audit.references).length ? 'hidden' : 'deleted';
        const summary = { id: String(current._id), name: current.name, reason, references: audit.references };
        if (apply) {
          fs.writeFileSync(path.join(backupDir, current._id + '.json'), EJSON.stringify({ facilities: [current], ...audit.children }, null, 2));
          if (action === 'hidden') {
            await db.collection('facilities').updateOne({ _id: current._id }, { $set: { status: 'INACTIVE' } }, options);
          } else {
            await db.collection('service_inventory').deleteMany({ service_id: { $in: audit.children.services.map(row => row._id) } }, options);
            await db.collection('services').deleteMany({ facility_id: current._id }, options);
            await db.collection('facility_images').deleteMany({ facility_id: current._id }, options);
            await db.collection('facility_amenities').deleteMany({ facility_id: current._id }, options);
            await db.collection('facilities').deleteOne({ _id: current._id }, options);
          }
        }
        return { action, summary };
      };
      const result = apply ? await mongoose.connection.transaction(execute) : await execute();
      if (result) {
        report[result.action].push(result.summary);
        console.log(`${apply ? 'Applied' : 'Planned'} ${result.action}: ${result.summary.id} ${result.summary.name}`);
      }
    }

    for (const entry of catalog) {
      const configured = await Facility.findOne({ catalog_key: entry.key }).lean();
      if (configured?.vendor_id) {
        (report.configured_preserved ||= []).push({ key: entry.key, id: String(configured._id) });
        continue;
      }
      const credit = credits.find(image => image.key === entry.key);
      if (!credit || !fs.existsSync(path.resolve(__dirname, '../public/catalog', credit.file))) throw Error('Missing licensed image: ' + entry.key);
      if (apply) await mongoose.connection.transaction(async session => {
        const facility = await Facility.findOne({ catalog_key: entry.key }).session(session) || new Facility();
        facility.set({
          catalog_key: entry.key, vendor_id: null, type: 'ATTRACTION', listing_mode: 'INFORMATIONAL', status: 'ACTIVE', stars: null,
          name: entry.name, address: entry.address, city: entry.city, description: entry.description,
          official_website: entry.official_website, source_urls: entry.source_urls,
          source_checked_at: new Date('2026-11-03T00:00:00+07:00'),
          image_credit: { author: credit.author, source_url: credit.source_url, license: credit.license, license_url: credit.license_url, changes: credit.changes },
        });
        await facility.save({ session });
        const imageUrl = '/api/catalog-images/' + credit.file;
        await FacilityImage.findOneAndUpdate({ facility_id: facility._id, is_primary: true }, { $set: { image_url: imageUrl } }, { upsert: true, session });
        const service = await Service.findOne({ facility_id: facility._id, informational_only: true }).session(session) || new Service();
        service.set({ facility_id: facility._id, type: 'TICKET', informational_only: true, name: entry.activity, description: entry.activity_description, base_price: null, ticket_types: [], photos: [] });
        await service.save({ session });
      });
      report.added.push({ key: entry.key, name: entry.name, website: entry.official_website });
    }
    report.protected_after = {};
    for (const name of protectedNames) report.protected_after[name] = await db.collection(name).countDocuments({});
    if (apply) {
      fs.writeFileSync(path.join(backupDir, 'report.json'), JSON.stringify(report, null, 2));
      console.log('Backup/report: ' + backupDir);
    }
    console.log(JSON.stringify(report, null, 2));
    return report;
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) run({ apply: process.argv.includes('--apply') }).catch(error => {
  console.error(error.name + ': ' + error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]'));
  process.exitCode = 1;
});
module.exports = { confirmedTest, run };
