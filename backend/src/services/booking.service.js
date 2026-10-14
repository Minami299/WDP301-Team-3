const mongoose = require('mongoose');
const { Booking, BookingDetail, Payment, Promotion, ServiceInventory, SystemConfig, User, Facility, Service } = require('../models');
const crypto = require('node:crypto');
const { ticketTypesOf } = require('./ticketTypes');
const { today } = require('../utils/bookingDate');

const createError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const getPointValue = async (session) => {
  const query = SystemConfig.findOne({ config_key: 'LOYALTY_POINT_VALUE' });
  const config = await (session ? query.session(session) : query);
  const value = Number(config?.config_value);
  if (!Number.isFinite(value) || value <= 0) {
    throw createError('Loyalty point value is not configured', 503);
  }
  return value;
};

const quoteDirectTickets = async (items, session) => {
  const requested = new Map();
  for (const item of items) {
    if (!item || !mongoose.isValidObjectId(item.service_id) || !mongoose.isValidObjectId(item.ticket_type_id)) throw createError('Dịch vụ hoặc hạng vé không hợp lệ', 400);
    const quantity = Number(item.quantity);
    if (!['number', 'string'].includes(typeof item.quantity) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) throw createError('Số lượng vé phải là số nguyên từ 1 đến 1000', 400);
    const visit = item.visit_date || today(); const parsed = new Date(visit);
    if (typeof visit !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(visit) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== visit || visit < today()) throw createError('Ngày tham quan không hợp lệ', 400);
    const key = `${item.service_id}:${item.ticket_type_id}:${visit}`;
    requested.set(key, { ...item, visit_date: visit, quantity: (requested.get(key)?.quantity || 0) + quantity });
  }
  const query = Service.find({ _id: { $in: [...requested.values()].map(i => i.service_id) }, type: 'TICKET' }).populate('facility_id', 'name status vendor_id');
  const services = await (session ? query.session(session) : query);
  const result = [];
  for (const [key, item] of requested) {
    if (item.quantity > 1000) throw createError('Số lượng mỗi hạng vé không vượt quá 1000', 400);
    const service = services.find(s => String(s._id) === String(item.service_id));
    const type = service && ticketTypesOf(service).find(t => String(t._id) === String(item.ticket_type_id));
    if (!service || service.facility_id?.status !== 'ACTIVE' || !type || type.status !== 'ACTIVE') throw createError('Dịch vụ hoặc hạng vé chưa mở bán', 409);
    const calendarQuery = ServiceInventory.exists({ service_id: service._id, $or: [{ ticket_type_id: type._id }, ...(String(type._id) === String(service._id) ? [{ ticket_type_id: null }] : [])] });
    if (await (session ? calendarQuery.session(session) : calendarQuery)) throw createError('Hạng vé có lịch bán riêng. Vui lòng chọn ngày và khung giờ đang mở bán.', 409);
    result.push({ line_key: key, vendor_id: service.facility_id.vendor_id, service_id: service._id, facility_id: service.facility_id._id, facility_name: service.facility_id.name, service_name: service.name,
      ticket_type_id: type._id, ticket_name: type.name, ticket_description: type.description || '', ticket_conditions: type.conditions || '', min_age: type.min_age ?? null, max_age: type.max_age ?? null,
      visit_date: new Date(item.visit_date), time_slot: 'ALL_DAY', type: 'TICKET', quantity: item.quantity, unit_price: type.price, line_total: type.price * item.quantity });
  }
  return result;
};

const quoteBooking = async (userId, { items, promotion_code, points_to_redeem = 0 }, session) => {
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw createError('At least one inventory item is required', 400);
  }

  const pointsRequested = Number(points_to_redeem);
  if (!Number.isInteger(pointsRequested) || pointsRequested < 0) {
    throw createError('points_to_redeem must be a non-negative integer', 400);
  }

  if (items.some(i => !i || typeof i !== 'object')) throw createError('Dữ liệu vé không hợp lệ', 400);
  const directItems = items.filter(i => !i.inventory_id);
  const scheduledItems = items.filter(i => i.inventory_id);
  let invoiceItems = directItems.length ? await quoteDirectTickets(directItems, session) : [];
  if (scheduledItems.length) {
  const requested = new Map();
  for (const item of scheduledItems) {
    if (!item || !mongoose.isValidObjectId(item.inventory_id)) {
      throw createError('Invalid inventory_id', 400);
    }
    const quantity = Number(item.quantity);
    if (!['string', 'number'].includes(typeof item.quantity) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
      throw createError('Each item quantity must be a positive integer', 400);
    }
    requested.set(String(item.inventory_id), (requested.get(String(item.inventory_id)) || 0) + quantity);
  }

  const inventoryQuery = ServiceInventory.find({
    _id: { $in: [...requested.keys()] }
  }).populate({ path: 'service_id', populate: { path: 'facility_id', select: 'name status vendor_id' } });

  const inventories = await (session ? inventoryQuery.session(session) : inventoryQuery);
  if (inventories.length !== requested.size) {
    throw createError('One or more inventory items were not found', 404);
  }

  invoiceItems = [...invoiceItems, ...inventories.map((inventory) => {
    const quantity = requested.get(String(inventory._id));
    if (quantity > 1000) throw createError('Số lượng mỗi hạng vé không vượt quá 1000', 400);
    if (inventory.available_qty < quantity) {
      throw createError(`Insufficient inventory for ${inventory.service_id?.name || 'a selected item'}`, 409);
    }
    if (!inventory.service_id || inventory.service_id.facility_id?.status !== 'ACTIVE') {
      throw createError('One or more selected services are unavailable', 409);
    }
    const service = inventory.service_id;
    const type = service.type === 'TICKET' ? ticketTypesOf(service).find(t => String(t._id) === String(inventory.ticket_type_id || service._id)) : null;
    if (service.type === 'TICKET' && (!type || type.status !== 'ACTIVE')) throw createError('Hạng vé đã ngừng bán hoặc không còn tồn tại', 409);
    if (service.type === 'TICKET' && inventory.target_date < new Date(today())) throw createError('Ngày tham quan đã qua', 409);
    const price = inventory.uses_ticket_price && type ? type.price : inventory.price;
    return {
      line_key: String(inventory._id),
      inventory_id: inventory._id,
      service_id: inventory.service_id._id,
      vendor_id: inventory.service_id.facility_id.vendor_id,
      service_name: inventory.service_id.name,
      facility_name: inventory.service_id.facility_id.name,
      facility_id: inventory.service_id.facility_id._id,
      ...(type ? { ticket_type_id: type._id, ticket_name: type.name, ticket_description: type.description || '', ticket_conditions: type.conditions || '', min_age: type.min_age ?? null, max_age: type.max_age ?? null } : {}),
      visit_date: inventory.target_date, time_slot: inventory.time_slot,
      type: inventory.service_id.type,
      quantity,
      unit_price: price,
      line_total: price * quantity
    };
  })];
  }
  const userQuery = User.findById(userId).select('total_loyalty_points status role_id').populate('role_id');
  const user = await (session ? userQuery.session(session) : userQuery);
  if (!user) throw createError('User not found', 404);
  if (user.status !== 'ACTIVE' || user.role_id?.role_name !== 'CUSTOMER') throw createError('Tài khoản không có quyền đặt vé', 403);
  if (pointsRequested > user.total_loyalty_points) throw createError('Not enough loyalty points', 400);

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.line_total, 0);
  if (!Number.isFinite(subtotal) || subtotal > Number.MAX_SAFE_INTEGER) throw createError('Tổng tiền không hợp lệ', 400);
  let promotion = null;
  let promotionDiscount = 0;

  if (promotion_code?.trim()) {
    const promotionQuery = Promotion.findOne({ code: promotion_code.trim().toUpperCase() });
    promotion = await (session ? promotionQuery.session(session) : promotionQuery);
    const now = new Date();
    if (!promotion || promotion.status !== 'ACTIVE') throw createError('Promotion code is invalid or inactive', 400);
    if (promotion.user_id && String(promotion.user_id) !== String(userId)) {
      throw createError('This promotion belongs to another account', 403);
    }
    if (promotion.valid_from && promotion.valid_from > now) throw createError('Promotion is not active yet', 400);
    if (promotion.valid_to && promotion.valid_to < now) throw createError('Promotion has expired', 400);
    if (promotion.usage_limit !== null && promotion.used_count >= promotion.usage_limit) {
      throw createError('Promotion usage limit has been reached', 400);
    }
    promotionDiscount = promotion.discount_type === 'PERCENTAGE'
      ? subtotal * promotion.discount_value / 100
      : promotion.discount_value;
    if (promotion.max_discount !== null) promotionDiscount = Math.min(promotionDiscount, promotion.max_discount);
    promotionDiscount = Math.min(Math.round(promotionDiscount), subtotal);
  }

  const pointValue = pointsRequested > 0 ? await getPointValue(session) : null;
  const pointsAffordable = pointValue ? Math.floor((subtotal - promotionDiscount) / pointValue) : 0;
  const pointsApplied = Math.min(pointsRequested, pointsAffordable);
  const pointsDiscount = pointsApplied * (pointValue || 0);

  return {
    items: invoiceItems,
    subtotal,
    promotion: promotion ? { id: promotion._id, code: promotion.code } : null,
    promotion_discount_amount: promotionDiscount,
    points_available: user.total_loyalty_points,
    points_redeemed: pointsApplied,
    point_value: pointValue,
    points_discount_amount: pointsDiscount,
    final_amount: Math.max(0, subtotal - promotionDiscount - pointsDiscount)
  };
};

const bookingForCustomer = async (userId, bookingId, session) => {
  if (!mongoose.isValidObjectId(bookingId)) throw createError('Invalid booking ID', 400);
  const bookingQuery = Booking.findOne({ _id: bookingId, customer_id: userId }).lean();
  const booking = await (session ? bookingQuery.session(session) : bookingQuery);
  if (!booking) throw createError('Booking not found', 404);
  const detailsQuery = BookingDetail.find({ booking_id: booking._id }).populate({ path: 'inventory_id', populate: { path: 'service_id', populate: { path: 'facility_id', select: 'name vendor_id type' } } }).populate({ path: 'service_id', populate: { path: 'facility_id', select: 'name vendor_id type' } }).lean();
  const details = await (session ? detailsQuery.session(session) : detailsQuery);
  const paymentQuery = Payment.find({ booking_id: booking._id }).lean();
  const payments = await (session ? paymentQuery.session(session) : paymentQuery);
  const data = { ...booking, details: details.map(d => ({ ...d, ticket_name: d.ticket_name || d.inventory_id?.service_id?.name, service_name: d.service_name || d.inventory_id?.service_id?.name, facility_name: d.facility_name || d.inventory_id?.service_id?.facility_id?.name, visit_date: d.visit_date || d.inventory_id?.target_date, time_slot: d.time_slot || d.inventory_id?.time_slot })), payments };
  data.can_request_cancellation = cancellable(data) && !data.cancellation_requests?.some(r => r.status === 'PENDING');
  return data;
};

const createBooking = async (userId, payload) => {
  for (const field of ['guest_name', 'guest_email', 'guest_phone']) if (typeof payload[field] !== 'string' || !payload[field].trim() || payload[field].length > 200) throw createError(`Vui lòng nhập ${field}`, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.guest_email.trim())) throw createError('Email không hợp lệ', 400);
  if (!/^\+?[\d\s().-]+$/.test(payload.guest_phone) || !/^\d{9,15}$/.test(payload.guest_phone.replace(/\D/g, ''))) throw createError('Số điện thoại không hợp lệ', 400);
  if (payload.agree_conditions !== true) throw createError('Vui lòng đồng ý điều kiện sử dụng vé', 400);
  if (payload.payment_method || Number(payload.points_to_redeem || 0) || payload.promotion_code) throw createError('Phần thanh toán hiện đang tạm ngưng', 400);
  if (typeof payload.request_id !== 'string' || !/^[a-zA-Z0-9-]{16,120}$/.test(payload.request_id)) throw createError('request_id không hợp lệ', 400);
  const existing = await Booking.findOne({ customer_id: userId, request_id: payload.request_id });
  if (existing) return bookingForCustomer(userId, existing._id);
  let bookingId;
  try {
    await mongoose.connection.transaction(async session => {
      const invoice = await quoteBooking(userId, payload, session);
      if (invoice.items.some(i => i.type !== 'TICKET')) throw createError('Luồng đặt vé này chỉ hỗ trợ dịch vụ tham quan', 400);
      const vendors = new Set(invoice.items.map(i => String(i.vendor_id || '')));
      if (vendors.size !== 1 || vendors.has('')) throw createError('Vui lòng đặt vé của từng Vendor trong đơn riêng', 400);
      if (payload.expected_total !== undefined && Number(payload.expected_total) !== invoice.final_amount) throw createError('Giá vé đã thay đổi. Vui lòng cập nhật báo giá trước khi đặt.', 409);
      for (const line of invoice.items) {
        const service = await Service.updateOne({ _id: line.service_id, type: 'TICKET' }, { $inc: { booking_revision: 1 } }, { session });
        if (service.modifiedCount !== 1) throw createError('Dịch vụ vừa thay đổi. Vui lòng chọn lại vé.', 409);
        if (!line.inventory_id) continue;
        const result = await ServiceInventory.updateOne({ _id: line.inventory_id, available_qty: { $gte: line.quantity } }, { $inc: { available_qty: -line.quantity } }, { session });
        if (result.modifiedCount !== 1) throw createError('Vé vừa hết. Vui lòng chọn lại số lượng.', 409);
      }
      const [booking] = await Booking.create([{
        booking_code: 'TVL-' + crypto.randomBytes(8).toString('hex').toUpperCase(), customer_id: userId, request_id: payload.request_id, vendor_id: invoice.items[0].vendor_id,
        guest_name: payload.guest_name.trim(), guest_email: payload.guest_email.trim(), guest_phone: payload.guest_phone.trim(),
        total_amount: invoice.subtotal, final_amount: invoice.final_amount, promotion_id: invoice.promotion?.id,
        promotion_discount_amount: invoice.promotion_discount_amount, points_redeemed: invoice.points_redeemed,
        points_discount_amount: invoice.points_discount_amount, status: 'PENDING'
      }], { session });
      bookingId = booking._id;
      await BookingDetail.insertMany(invoice.items.map(line => ({
        booking_id: booking._id, inventory_id: line.inventory_id, service_id: line.service_id, quantity: line.quantity, unit_price: line.unit_price,
        ticket_type_id: line.ticket_type_id, ticket_name: line.ticket_name, service_name: line.service_name, facility_name: line.facility_name,
        ticket_conditions: line.ticket_conditions, ticket_description: line.ticket_description, min_age: line.min_age, max_age: line.max_age,
        visit_date: line.visit_date, time_slot: line.time_slot
      })), { session });
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const concurrent = await Booking.findOne({ customer_id: userId, request_id: payload.request_id });
    if (!concurrent) throw error;
    bookingId = concurrent._id;
  }
  return bookingForCustomer(userId, bookingId);
};

const listBookings = async (userId) => {
  const bookings = await Booking.find({ customer_id: userId }).sort({ created_at: -1 }).limit(100).lean();
  return Promise.all(bookings.map(b => bookingForCustomer(userId, b._id)));
};

const ownerOf = detail => (detail.service_id || detail.inventory_id?.service_id)?.facility_id?.vendor_id;
const isTicket = detail => {
  const service = detail.service_id || detail.inventory_id?.service_id;
  return service?.type === 'TICKET' && service.facility_id?.type === 'ATTRACTION';
};
const cancellable = booking => booking.status === 'PENDING' && !booking.payments?.length && !booking.points_redeemed && booking.details.length > 0 && booking.details.every(d => isTicket(d) && !d.qr_code) && new Set(booking.details.map(d => String(ownerOf(d) || ''))).size === 1 && Boolean(ownerOf(booking.details[0]));

const vendorBooking = async (userId, bookingId, session) => {
  if (!mongoose.isValidObjectId(bookingId)) throw createError('Mã đơn không hợp lệ', 400);
  const query = Booking.findById(bookingId).lean();
  const booking = await (session ? query.session(session) : query);
  if (!booking) throw createError('Không tìm thấy đơn đặt vé', 404);
  const data = await bookingForCustomer(booking.customer_id, bookingId, session);
  const details = data.details.filter(d => isTicket(d) && String(ownerOf(d)) === String(userId));
  if (!details.length) throw createError('Không tìm thấy đơn đặt vé', 404);
  const complete = details.length === data.details.length;
  const canProcess = complete && cancellable(data);
  // Legacy mixed orders expose only this vendor's lines and subtotal.
  return { ...data, details, payments: undefined, total_amount: complete ? data.total_amount : details.reduce((sum, d) => sum + d.quantity * d.unit_price, 0), final_amount: complete ? data.final_amount : details.reduce((sum, d) => sum + d.quantity * d.unit_price, 0), can_process_cancellation: canProcess, can_request_cancellation: undefined, cancellation_requests: complete ? data.cancellation_requests : [] };
};

const listVendorBookings = async (userId, filters = {}) => {
  const facilities = await Facility.find({ vendor_id: userId, type: 'ATTRACTION' }).distinct('_id');
  const services = await Service.find({ facility_id: { $in: facilities }, type: 'TICKET' }).distinct('_id');
  const inventories = await ServiceInventory.find({ service_id: { $in: services } }).distinct('_id');
  const ids = await BookingDetail.find({ $or: [{ inventory_id: { $in: inventories } }, { service_id: { $in: services } }] }).distinct('booking_id');
  const match = { _id: { $in: ids } };
  if (filters.status) {
    if (!['PENDING', 'CANCELLED'].includes(filters.status)) throw createError('Trạng thái đơn không hợp lệ', 400);
    match.status = filters.status;
  }
  if (filters.q) {
    if (typeof filters.q !== 'string' || filters.q.length > 200) throw createError('Từ khóa quá dài', 400);
    const search = new RegExp(filters.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = ['booking_code', 'guest_name', 'guest_email', 'guest_phone'].map(field => ({ [field]: search }));
  }
  if (filters.cancellations === 'true') match['cancellation_requests.0'] = { $exists: true };
  if (filters.cancellation_status) {
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(filters.cancellation_status)) throw createError('Trạng thái yêu cầu hủy không hợp lệ', 400);
    // Filter the latest request, not an obsolete rejected entry.
    match.$expr = { $eq: [{ $arrayElemAt: ['$cancellation_requests.status', -1] }, filters.cancellation_status] };
  }
  const bookings = await Booking.find(match).sort({ created_at: -1 }).limit(100).lean();
  return Promise.all(bookings.map(b => vendorBooking(userId, b._id)));
};

const validRequestId = value => typeof value === 'string' && /^[a-zA-Z0-9-]{16,120}$/.test(value);
const reasonText = (value, required) => {
  if ((required && (typeof value !== 'string' || !value.trim())) || (value !== undefined && (typeof value !== 'string' || value.length > 1000))) throw createError('Lý do phải có từ 1 đến 1000 ký tự', 400);
  return value?.trim() || '';
};

const requestCancellation = async (userId, bookingId, payload) => {
  if (!validRequestId(payload.request_id)) throw createError('request_id không hợp lệ', 400);
  const reason = reasonText(payload.reason, true);
  await mongoose.connection.transaction(async session => {
    const data = await bookingForCustomer(userId, bookingId, session);
    if (data.cancellation_requests?.some(r => r.request_id === payload.request_id)) return;
    if (!data.can_request_cancellation) throw createError('Chỉ được yêu cầu hủy đơn vé chưa thanh toán, chưa hủy và chưa có yêu cầu đang chờ', 409);
    if (data.cancellation_requests?.length >= 50) throw createError('Đơn đã đạt giới hạn yêu cầu hủy', 409);
    await Booking.updateOne({ _id: bookingId, customer_id: userId, status: 'PENDING' }, { $push: { cancellation_requests: { request_id: payload.request_id, requested_by: userId, reason, status: 'PENDING', requested_at: new Date() } } }, { session, runValidators: true });
  });
  return bookingForCustomer(userId, bookingId);
};

const decideCancellation = async (userId, bookingId, requestId, payload) => {
  if (!mongoose.isValidObjectId(requestId)) throw createError('Mã yêu cầu hủy không hợp lệ', 400);
  if (!['APPROVED', 'REJECTED'].includes(payload.status)) throw createError('Chọn APPROVED hoặc REJECTED', 400);
  const reason = reasonText(payload.reason, false);
  await mongoose.connection.transaction(async session => {
    const data = await vendorBooking(userId, bookingId, session);
    const request = data.cancellation_requests?.find(r => String(r._id) === requestId);
    if (!request) throw createError('Không tìm thấy yêu cầu hủy', 404);
    if (request.status === payload.status) return;
    if (request.status !== 'PENDING' || !data.can_process_cancellation) throw createError('Yêu cầu đã xử lý hoặc đơn không còn có thể hủy', 409);
    const now = new Date();
    const changes = { 'cancellation_requests.$.status': payload.status, 'cancellation_requests.$.processed_by': userId, 'cancellation_requests.$.processed_at': now, 'cancellation_requests.$.decision_reason': reason };
    if (payload.status === 'APPROVED') Object.assign(changes, { status: 'CANCELLED', decided_by: userId, decided_at: now, decision_note: reason });
    const result = await Booking.updateOne({ _id: bookingId, status: 'PENDING', cancellation_requests: { $elemMatch: { _id: requestId, status: 'PENDING' } } }, { $set: changes }, { session, runValidators: true });
    if (result.modifiedCount !== 1) throw createError('Yêu cầu vừa được xử lý. Vui lòng tải lại.', 409);
    if (payload.status === 'APPROVED') {
      for (const detail of data.details) {
        if (!detail.inventory_id) continue;
        const restored = await ServiceInventory.updateOne({ _id: detail.inventory_id._id }, { $inc: { available_qty: detail.quantity } }, { session });
        if (restored.modifiedCount !== 1) throw createError('Không thể cập nhật tồn kho; đơn chưa được hủy', 409);
      }
    }
  });
  return vendorBooking(userId, bookingId);
};

module.exports = { quoteBooking, createBooking, bookingForCustomer, listBookings, listVendorBookings, vendorBooking, requestCancellation, decideCancellation };
