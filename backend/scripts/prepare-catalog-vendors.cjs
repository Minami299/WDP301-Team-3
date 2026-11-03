// Creates explicitly internal operator accounts and inactive ticket drafts.
// No email, partner endorsement, sellable stock, order or payment is created.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { EJSON } = require('bson');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const { User, UserProfile, Role, Facility, FacilityImage, Service, ServiceInventory, BookingDetail } = require('../src/models');
const { hashPassword, verifyPassword } = require('../src/utils/password');
const { normalizeService } = require('../src/services/vendorServiceFields');
const { uploadTemporaryImages } = require('../src/services/facilityImage.service');
const { today } = require('../src/utils/bookingDate');
const { ensureTicketInventoryIndex } = require('../src/services/ticketMigration.service');
const catalog = require('../src/seeds/attraction-catalog.json');
const drafts = require('../src/seeds/catalog-ticket-drafts.json');
const privateDir = path.resolve(__dirname, '../.internal-credentials');
const journalPath = path.join(privateDir, 'catalog-vendors.json');

async function main() {
  fs.mkdirSync(privateDir, { recursive: true });
  const journal = fs.existsSync(journalPath) ? JSON.parse(fs.readFileSync(journalPath, 'utf8')) : {
    created_at: new Date().toISOString(),
    note: 'Internal Travelio operator accounts. Not issued or endorsed by the actual attractions. Ticket drafts are INACTIVE; allocation is zero.',
    accounts: drafts.map(draft => ({ key: draft.key, email: draft.login, password: 'Trv!' + crypto.randomBytes(15).toString('base64url') + '9a' })),
  };
  const saveJournal = () => fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), { mode: 0o600 });
  saveJournal();
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
    const role = await Role.findOne({ role_name: 'ACTIVITY_VENDOR' });
    if (!role) throw Error('Existing ACTIVITY_VENDOR role is required');
    // Validate all input and ownership before provisioning any account.
    for (const draft of drafts) {
      const facility = await Facility.findOne({ catalog_key: draft.key });
      if (!facility || facility.listing_mode !== 'INFORMATIONAL') throw Error('Missing informational catalog point: ' + draft.key);
      const record = journal.accounts.find(account => account.key === draft.key);
      if (!record || record.email !== draft.login) throw Error('Credential journal does not match the requested account');
      const user = await User.findOne({ email: record.email });
      if (user && (user.account_kind !== 'INTERNAL' || !(await verifyPassword(record.password, user.password_hash)))) throw Error('Existing account will not be overwritten: ' + record.email);
      if (facility.vendor_id && String(facility.vendor_id) !== String(user?._id)) throw Error('Catalog point already belongs to another account: ' + draft.key);
      normalizeService({ name: draft.name, service_category: 'ATTRACTION', location: facility.address + ', ' + facility.city, pricing_unit: 'TICKET', description: draft.description, photos: [], ticket_types: draft.types.map(type => ({ ...type, status: 'INACTIVE' })) });
    }
    if (!fs.existsSync(path.join(privateDir, 'inventory-indexes-before.json'))) fs.writeFileSync(path.join(privateDir, 'inventory-indexes-before.json'), EJSON.stringify(await ServiceInventory.collection.indexes(), null, 2));
    console.log('Ticket inventory index updated: ' + await ensureTicketInventoryIndex());
    const start = new Date(today() + 'T00:00:00.000Z');
    for (const draft of drafts) {
      const entry = catalog.find(point => point.key === draft.key);
      const record = journal.accounts.find(account => account.key === draft.key);
      const previousUser = await User.findOne({ email: record.email });
      if (previousUser) { console.log('Preserved existing internal account: ' + record.email); continue; }
      const facility = await Facility.findOne({ catalog_key: draft.key });
      const service = await Service.findOne({ facility_id: facility._id, informational_only: true });
      if (!service) throw Error('Missing catalog service: ' + draft.key);
      const previousInventory = await ServiceInventory.find({ service_id: service._id }).lean();
      if (await BookingDetail.exists({ $or: [{ service_id: service._id }, { inventory_id: { $in: previousInventory.map(row => row._id) } }] })) throw Error('Service has booking history; refusing to reconfigure it');
      fs.writeFileSync(path.join(privateDir, draft.key + '-before.json'), EJSON.stringify({ facility: facility.toObject(), service: service.toObject(), inventory: previousInventory }, null, 2));
      if (!record.photo_url) {
        [record.photo_url] = await uploadTemporaryImages([{ buffer: fs.readFileSync(path.resolve(__dirname, '../public/catalog', draft.key + '.jpg')), mimetype: 'image/jpeg' }], 'TICKET');
        saveJournal();
      }
      const fields = normalizeService({ name: draft.name, service_category: 'ATTRACTION', location: facility.address + ', ' + facility.city, pricing_unit: 'TICKET', description: draft.description + '\n' + draft.source_note, ticket_audience: 'ALL', duration_minutes: null, photos: [record.photo_url], ticket_types: draft.types.map(type => ({ ...type, status: 'INACTIVE' })) });
      const passwordHash = await hashPassword(record.password);
      const created = await mongoose.connection.transaction(async session => {
        const [user] = await User.create([{
          email: record.email, full_name: 'Nội bộ - ' + entry.name, password_hash: passwordHash,
          role_id: role._id, account_kind: 'INTERNAL', status: 'ACTIVE', approvalStatus: null, is_verified: false,
        }], { session });
        await UserProfile.create([{ user_id: user._id, address: facility.address + ', ' + facility.city, host_type: 'professional', preferences: { internal_catalog_key: entry.key } }], { session });
        facility.vendor_id = user._id;
        facility.business_type = 'ATTRACTION'; facility.attraction_category = 'ATTRACTION'; facility.contact_phone = draft.phone;
        facility.description = entry.description.split('. ')[0].replace(/\.$/, '') + '.';
        facility.source_urls = [...new Set([...(facility.source_urls || []), draft.price_source])];
        await facility.save({ session });
        service.set({ ...fields, informational_only: true });
        await service.save({ session });
        await FacilityImage.updateOne({ facility_id: facility._id, is_primary: true }, { $set: { image_url: record.photo_url } }, { session });
        const rows = fields.ticket_types.flatMap(type => Array.from({ length: 7 }, (_, offset) => ({
          service_id: service._id, ticket_type_id: type._id,
          target_date: new Date(start.getTime() + offset * 86400000), time_slot: 'ALL_DAY',
          uses_ticket_price: true, price: type.price, total_qty: 0, available_qty: 0,
        })));
        await ServiceInventory.insertMany(rows, { session });
        return { user_id: String(user._id), facility_id: String(facility._id), service_id: String(service._id), name: entry.name, inventory_rows: rows.length, ticket_types: fields.ticket_types.length };
      });
      Object.assign(record, created); saveJournal();
      console.log('Created internal account and inactive ticket drafts: ' + record.email + ' (' + created.ticket_types + ' types; ' + created.inventory_rows + ' zero-allocation rows)');
    }
    console.log('Private credentials saved to: ' + journalPath);
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) main().catch(error => {
  console.error(error.name + ': ' + error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]'));
  process.exitCode = 1;
});
