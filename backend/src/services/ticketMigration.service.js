const { Service, ServiceInventory, BookingDetail, Facility } = require('../models');
const { ticketTypesOf } = require('./ticketTypes');

// Chỉ bổ sung dữ liệu thiếu. Giá lịch bán, unit_price, ID và quan hệ cũ được giữ nguyên.
const migrateTicketTypes = async ({ apply = false } = {}) => {
  const services = await Service.find({ type: 'TICKET' }).lean();
  const report = { apply, legacy_services: 0, inventories: 0, booking_details: 0, inventory_index_updated: false };
  for (const service of services) {
    const needsTypes = !service.ticket_types?.length;
    const type = needsTypes ? ticketTypesOf(service)[0] : service.ticket_types.find(t => String(t._id) === String(service._id));
    if (!type) continue;
    if (needsTypes) report.legacy_services++;
    const inventories = await ServiceInventory.find({ service_id: service._id, ticket_type_id: null }).lean();
    const details = await BookingDetail.find({ inventory_id: { $in: inventories.map(i => i._id) }, ticket_type_id: null }).lean();
    report.inventories += inventories.length; report.booking_details += details.length;
    if (!apply) continue;
    const facility = await Facility.findById(service.facility_id).select('name').lean();
    await Service.updateOne({ _id: service._id, $or: [{ ticket_types: { $exists: false } }, { ticket_types: { $size: 0 } }] }, { $set: { ticket_types: [{ ...type, legacy: undefined }] } });
    await ServiceInventory.updateMany({ _id: { $in: inventories.map(i => i._id) }, ticket_type_id: null }, { $set: { ticket_type_id: type._id, uses_ticket_price: false } });
    for (const detail of details) {
      const inventory = inventories.find(i => String(i._id) === String(detail.inventory_id));
      const additions = { ticket_type_id: type._id, ticket_name: type.name, service_name: service.name, facility_name: facility?.name, ticket_conditions: '', visit_date: inventory.target_date, time_slot: inventory.time_slot };
      for (const key of Object.keys(additions)) if (detail[key] != null || additions[key] === undefined) delete additions[key];
      await BookingDetail.updateOne({ _id: detail._id, ticket_type_id: null }, { $set: additions });
    }
  }
  if (apply) {
    // Xây index mới thành công trước khi bỏ index cũ (không xóa bất kỳ bản ghi nào).
    await ServiceInventory.collection.createIndex({ service_id: 1, ticket_type_id: 1, target_date: 1, time_slot: 1 }, { unique: true });
    const indexes = await ServiceInventory.collection.indexes();
    const old = indexes.find(i => Object.keys(i.key).join(',') === 'service_id,target_date,time_slot' && i.unique);
    if (old) { await ServiceInventory.collection.dropIndex(old.name); report.inventory_index_updated = true; }
  }
  return report;
};

module.exports = { migrateTicketTypes };
