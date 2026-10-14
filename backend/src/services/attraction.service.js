const mongoose = require('mongoose');
const { Facility, Service, ServiceInventory, BookingDetail } = require('../models');
const { validateBusinessDetails } = require('./vendorRegistration.service');
const { normalizeService } = require('./vendorServiceFields');
const { normalizeTicketType, normalizeTicketTypes, ticketTypesOf, minimumPrice } = require('./ticketTypes');
const { today } = require('../utils/bookingDate');

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const text = (value, label, required = true) => {
  if (typeof value !== 'string' || (required && !value.trim())) throw fail(`${label} không hợp lệ`);
  return value.trim();
};
const number = (value, label, integer = false) => {
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') throw fail(`${label} không hợp lệ`);
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0 || (integer && !Number.isSafeInteger(result))) throw fail(`${label} không hợp lệ`);
  return result;
};
const id = (value) => {
  if (!mongoose.isValidObjectId(value)) throw fail('Mã dữ liệu không hợp lệ');
};
const date = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw fail('Ngày phải có định dạng YYYY-MM-DD');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw fail('Ngày không hợp lệ');
  return parsed;
};

const ownedAttraction = async (user, facilityId) => {
  id(facilityId);
  const facility = await Facility.findOne({ _id: facilityId, vendor_id: user.id, type: 'ATTRACTION' });
  if (!facility) throw fail('Không tìm thấy điểm tham quan hoặc bạn không có quyền quản lý', 404);
  return facility;
};
const ownedTicket = async (user, ticketId) => {
  id(ticketId);
  const ticket = await Service.findOne({ _id: ticketId, type: 'TICKET' });
  if (!ticket) throw fail('Không tìm thấy hạng vé', 404);
  await ownedAttraction(user, ticket.facility_id);
  return ticket;
};

const attractionFields = (payload) => {
  const category = payload.attraction_category || 'ATTRACTION';
  if (!['ATTRACTION', 'TOUR', 'EXPERIENCE'].includes(category)) throw fail('Loại hình kinh doanh không hợp lệ');
  const status = payload.status || 'ACTIVE';
  if (!['ACTIVE', 'INACTIVE'].includes(status)) throw fail('Trạng thái kinh doanh không hợp lệ');
  return {
    ...validateBusinessDetails({
      facility_name: payload.name, facility_address: payload.address, facility_city: payload.city,
      facility_description: payload.description ?? '', phone: payload.contact_phone,
      business_type: payload.business_type
    }, false),
    attraction_category: category,
    status
  };
};

const listAttractions = async (user) => {
  const facilities = await Facility.find({ vendor_id: user.id, type: 'ATTRACTION' }).sort({ created_at: -1 }).lean();
  const tickets = await Service.find({ facility_id: { $in: facilities.map((f) => f._id) }, type: 'TICKET' }).lean();
  return facilities.map((facility) => ({ ...facility, tickets: tickets.filter((t) => String(t.facility_id) === String(facility._id)).map(t => ({ ...t, ticket_types: ticketTypesOf(t) })) }));
};

const createAttraction = async (user, payload) => {
  const fields = attractionFields(payload);
  return Facility.create({ ...fields, vendor_id: user.id, type: 'ATTRACTION' });
};

const updateAttraction = async (user, facilityId, payload) => {
  const facility = await ownedAttraction(user, facilityId);
  Object.assign(facility, attractionFields(payload));
  await facility.save();
  return facility;
};

const ticketFields = (payload) => {
  return normalizeService(payload);
};

const createTicket = async (user, facilityId, payload) => {
  await ownedAttraction(user, facilityId);
  const fields = ticketFields(payload);
  if (fields.ticket_types) fields.ticket_types = fields.ticket_types.map(t => ({ ...t, _id: new mongoose.Types.ObjectId() }));
  return Service.create({ ...fields, facility_id: facilityId, type: 'TICKET', capacity: 1 });
};

const updateTicket = async (user, ticketId, payload) => {
  const ticket = await ownedTicket(user, ticketId);
  const fields = ticketFields(payload);
  if (fields.ticket_types) {
    const currentIds = new Set(ticketTypesOf(ticket).map(t => String(t._id)));
    if (payload.ticket_types.some(t => t._id && !currentIds.has(String(t._id)))) throw fail('ID hạng vé không thuộc dịch vụ này', 400);
    return saveServiceTypes(ticket, fields.ticket_types, fields);
  }
  if (ticket.ticket_types?.length) {
    if (ticket.ticket_types.length > 1) throw fail('Dịch vụ có nhiều hạng vé; vui lòng gửi danh sách ticket_types', 400);
    const types = ticket.ticket_types.map(t => ({ ...t.toObject(), price: fields.base_price }));
    return saveServiceTypes(ticket, types, fields);
  }
  Object.assign(ticket, fields);
  await ticket.save();
  return ticket;
};

const saveServiceTypes = async (service, types, fields = {}) => {
  const previous = ticketTypesOf(service);
  const ids = new Set(types.map(t => String(t._id)));
  const removed = previous.filter(t => !ids.has(String(t._id)));
  return mongoose.connection.transaction(async session => {
    for (const type of removed) {
      if (await BookingDetail.exists({ service_id: service._id, ticket_type_id: type._id }).session(session)) throw fail('Hạng vé đã có yêu cầu mua: hãy ngừng bán thay vì xóa', 409);
      const inventoryIds = await ServiceInventory.find({ service_id: service._id, $or: [{ ticket_type_id: type._id }, ...(String(type._id) === String(service._id) ? [{ ticket_type_id: null }] : [])] }).session(session).distinct('_id');
      if (await BookingDetail.exists({ inventory_id: { $in: inventoryIds } }).session(session)) throw fail('Hạng vé đã có đơn đặt: hãy ngừng bán thay vì xóa', 409);
      await ServiceInventory.deleteMany({ _id: { $in: inventoryIds } }, { session });
    }
    Object.assign(service, fields, { ticket_types: types, base_price: minimumPrice(types) });
    await service.save({ session });
    return service;
  });
};

const createTicketType = async (user, serviceId, payload) => {
  const service = await ownedTicket(user, serviceId);
  const type = normalizeTicketType({ ...payload, _id: undefined });
  const types = normalizeTicketTypes([...ticketTypesOf(service).map(t => t.toObject ? t.toObject() : t), type]);
  await saveServiceTypes(service, types);
  return service.ticket_types.find(t => String(t._id) === String(type._id));
};
const updateTicketType = async (user, serviceId, typeId, payload) => {
  id(typeId); const service = await ownedTicket(user, serviceId);
  const existing = ticketTypesOf(service).find(t => String(t._id) === typeId);
  if (!existing) throw fail('Không tìm thấy hạng vé của dịch vụ', 404);
  const updated = normalizeTicketType({ ...(existing.toObject ? existing.toObject() : existing), ...payload, _id: typeId });
  const types = normalizeTicketTypes(ticketTypesOf(service).map(t => String(t._id) === typeId ? updated : (t.toObject ? t.toObject() : t)));
  await saveServiceTypes(service, types);
  return service.ticket_types.find(t => String(t._id) === typeId);
};
const deleteTicketType = async (user, serviceId, typeId) => {
  id(typeId); const service = await ownedTicket(user, serviceId);
  const types = ticketTypesOf(service).filter(t => String(t._id) !== typeId).map(t => t.toObject ? t.toObject() : t);
  if (types.length === ticketTypesOf(service).length) throw fail('Không tìm thấy hạng vé', 404);
  if (!types.length) throw fail('Dịch vụ cần ít nhất một hạng vé. Có thể ngừng bán hạng vé cuối cùng.', 409);
  await saveServiceTypes(service, types);
  return { id: typeId, deleted: true };
};

const deleteTicket = async (user, ticketId) => {
  await ownedTicket(user, ticketId);
  await mongoose.connection.transaction(async session => {
    if (await BookingDetail.exists({ service_id: ticketId }).session(session)) throw fail('Không thể xóa dịch vụ đã có yêu cầu mua vé', 409);
    const inventoryIds = await ServiceInventory.find({ service_id: ticketId }).session(session).distinct('_id');
    if (await BookingDetail.exists({ inventory_id: { $in: inventoryIds } }).session(session)) throw fail('Không thể xóa dịch vụ đã có đơn đặt. Hãy quản lý lịch bán của dịch vụ.', 409);
    await ServiceInventory.deleteMany({ service_id: ticketId }, { session });
    await Service.deleteOne({ _id: ticketId, type: 'TICKET' }, { session });
  });
  return { id: ticketId, deleted: true };
};

// Vé đã đặt được giữ nguyên khi cập nhật hạn mức, kể cả dữ liệu tồn kho cũ.
const reservedQuantities = async (inventoryIds) => {
  if (!inventoryIds.length) return new Map();
  const rows = await BookingDetail.aggregate([
    { $match: { inventory_id: { $in: inventoryIds } } },
    { $lookup: { from: 'bookings', localField: 'booking_id', foreignField: '_id', as: 'booking' } },
    { $unwind: '$booking' },
    { $match: { 'booking.status': { $in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } } },
    { $group: { _id: '$inventory_id', quantity: { $sum: '$quantity' } } }
  ]);
  return new Map(rows.map((row) => [String(row._id), row.quantity]));
};

const listInventory = async (user, ticketId, query) => {
  const service = await ownedTicket(user, ticketId);
  const from = date(query.from);
  const to = date(query.to);
  if (from > to || to - from > 365 * 86400000) throw fail('Khoảng ngày phải hợp lệ và không quá 366 ngày');
  const rows = await ServiceInventory.find({ service_id: ticketId, target_date: { $gte: from, $lt: new Date(to.getTime() + 86400000) } })
    .sort({ target_date: 1, time_slot: 1 }).lean();
  const reserved = await reservedQuantities(rows.map((row) => row._id));
  return rows.map((row) => {
    const booked = Math.max(reserved.get(String(row._id)) || 0, (row.total_qty ?? row.available_qty) - row.available_qty);
    const type = ticketTypesOf(service).find(t => String(t._id) === String(row.ticket_type_id || service._id));
    return { ...row, ticket_type_id: row.ticket_type_id || service._id, ticket_name: type?.name || service.name, price: row.uses_ticket_price ? type?.price ?? row.price : row.price, total_qty: row.available_qty + booked, booked_qty: booked };
  });
};

const saveInventory = async (user, ticketId, payload) => {
  const service = await ownedTicket(user, ticketId);
  const typeId = payload.ticket_type_id ?? (service.ticket_types?.length === 1 ? service.ticket_types[0]._id : undefined);
  if (typeId != null) id(typeId);
  if (!typeId && service.ticket_types?.length > 1) throw fail('Vui lòng chọn hạng vé cần thiết lập lịch bán');
  const type = typeId ? ticketTypesOf(service).find(t => String(t._id) === String(typeId)) : ticketTypesOf(service)[0];
  if (typeId && !type) throw fail('Hạng vé không thuộc dịch vụ này', 404);
  const targetDate = date(payload.target_date);
  const slot = text(payload.time_slot ?? 'ALL_DAY', 'Khung giờ');
  if (slot !== 'ALL_DAY' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot)) throw fail('Khung giờ phải là ALL_DAY hoặc HH:mm');
  const total = number(payload.total_qty, 'Hạn mức phát hành', true);
  const inheritedPrice = payload.uses_ticket_price === true;
  const price = number(inheritedPrice ? type?.price : payload.price, 'Giá bán');
  const key = { service_id: ticketId, ...(typeId ? { ticket_type_id: type._id } : {}), target_date: targetDate, time_slot: slot };
  if (payload.inventory_id !== undefined) id(payload.inventory_id);
  const current = await ServiceInventory.findOne(payload.inventory_id ? { _id: payload.inventory_id, service_id: ticketId } : key);
  if (payload.inventory_id) {
    if (!current) throw fail('Không tìm thấy lịch bán vé của hạng vé này', 404);
    if (current.target_date.toISOString().slice(0, 10) !== payload.target_date || current.time_slot !== slot) {
      throw fail('Không thể đổi ngày hoặc khung giờ của lịch bán vé đã tạo');
    }
    if (typeId && String(current.ticket_type_id || service._id) !== String(typeId)) throw fail('Không thể đổi hạng vé của lịch bán đã tạo');
  }
  if (!current) {
    try {
      return await ServiceInventory.create({ ...key, ...(typeId ? { uses_ticket_price: inheritedPrice } : {}), total_qty: total, available_qty: total, price });
    } catch (error) {
      if (error.code === 11000) throw fail('Lịch bán vừa được tạo bởi thao tác khác. Vui lòng tải lại.', 409);
      throw error;
    }
  }
  const reserved = await reservedQuantities([current._id]);
  const booked = Math.max(reserved.get(String(current._id)) || 0, (current.total_qty ?? current.available_qty) - current.available_qty);
  if (total < booked) throw fail(`Hạn mức không thể nhỏ hơn ${booked} vé đã đặt`, 409);
  // Điều kiện cập nhật bảo vệ các thay đổi tồn kho đồng thời.
  const updated = await ServiceInventory.findOneAndUpdate(
    { _id: current._id, available_qty: current.available_qty, total_qty: current.total_qty === undefined ? { $exists: false } : current.total_qty, price: current.price },
    { $set: { total_qty: total, available_qty: total - booked, price, ...(typeId ? { ticket_type_id: type._id, uses_ticket_price: inheritedPrice } : {}) } },
    { new: true, runValidators: true }
  );
  if (!updated) throw fail('Tồn kho vừa thay đổi. Vui lòng tải lại trước khi lưu.', 409);
  return updated;
};

const publicAvailability = async (facilityId, query) => {
  id(facilityId); const targetDate = date(query.date);
  if (targetDate < new Date(today())) throw fail('Ngày tham quan đã qua');
  const facility = await Facility.findOne({ _id: facilityId, type: 'ATTRACTION', status: 'ACTIVE' }).lean();
  if (!facility) throw fail('Cơ sở chưa mở bán hoặc không tồn tại', 404);
  const services = await Service.find({ facility_id: facilityId, type: 'TICKET' }).lean();
  const inventories = await ServiceInventory.find({ service_id: { $in: services.map(s => s._id) }, target_date: targetDate }).lean();
  const configured = await ServiceInventory.find({ service_id: { $in: services.map(s => s._id) } }).select('service_id ticket_type_id').lean();
  return services.map(service => ({ ...service, ticket_types: ticketTypesOf(service).filter(t => t.status === 'ACTIVE').map(type => ({
    ...type, requires_schedule: configured.some(i => String(i.service_id) === String(service._id) && String(i.ticket_type_id || service._id) === String(type._id)), schedules: inventories.filter(i => String(i.service_id) === String(service._id) && String(i.ticket_type_id || service._id) === String(type._id)).map(i => ({ inventory_id: i._id, date: i.target_date, time_slot: i.time_slot, available_qty: i.available_qty, price: i.uses_ticket_price ? type.price : i.price }))
  })) })).filter(service => service.ticket_types.length > 0);
};

module.exports = { listAttractions, createAttraction, updateAttraction, createTicket, updateTicket, deleteTicket, createTicketType, updateTicketType, deleteTicketType, listInventory, saveInventory, publicAvailability };
