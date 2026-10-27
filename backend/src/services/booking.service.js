const mongoose = require('mongoose');
const { Booking, BookingDetail, Payment, Promotion, ServiceInventory, SystemConfig, User, Facility, FacilityImage, Service, LoyaltyPointTransaction } = require('../models');
const crypto = require('node:crypto');
const { ticketTypesOf } = require('./ticketTypes');
const { today } = require('../utils/bookingDate');

const createError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const HOLD_MINUTES = 15;
const holdExpiry = () => new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

const assertGuest = payload => {
  for (const field of ['guest_name', 'guest_email', 'guest_phone']) if (typeof payload[field] !== 'string' || !payload[field].trim() || payload[field].length > 200) throw createError(`Vui lòng nhập ${field}`, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.guest_email.trim())) throw createError('Email không hợp lệ', 400);
  if (!/^\+?[\d\s().-]+$/.test(payload.guest_phone) || !/^\d{9,15}$/.test(payload.guest_phone.replace(/\D/g, ''))) throw createError('Số điện thoại không hợp lệ', 400);
  if (payload.agree_conditions !== true) throw createError('Vui lòng đồng ý điều kiện sử dụng', 400);
  if (typeof payload.request_id !== 'string' || !/^[a-zA-Z0-9-]{16,120}$/.test(payload.request_id)) throw createError('request_id không hợp lệ', 400);
};
const isoDate = (value, label) => {
  const parsed = new Date(value);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw createError(`${label} không hợp lệ`, 400);
  return parsed;
};

const getPointValue = async (session) => {
  if (mongoose.connection.readyState !== 1) return 1000;
  try {
    const query = SystemConfig.findOne({ config_key: 'LOYALTY_POINT_VALUE' });
    const config = await (session ? query.session(session) : query);
    const value = Number(config?.config_value);
    if (!Number.isFinite(value) || value <= 0) {
      return 1000;
    }
    return value;
  } catch (error) {
    return 1000;
  }
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
  const query = Service.find({ _id: { $in: [...requested.values()].map(i => i.service_id) }, type: 'TICKET' }).populate('facility_id', 'name status vendor_id commission_rate');
  const services = await (session ? query.session(session) : query);
  const result = [];
  for (const [key, item] of requested) {
    if (item.quantity > 1000) throw createError('Số lượng mỗi hạng vé không vượt quá 1000', 400);
    const service = services.find(s => String(s._id) === String(item.service_id));
    const type = service && ticketTypesOf(service).find(t => String(t._id) === String(item.ticket_type_id));
    if (!service || service.facility_id?.status !== 'ACTIVE' || !type || type.status !== 'ACTIVE') throw createError('Dịch vụ hoặc hạng vé chưa mở bán', 409);
    const calendarQuery = ServiceInventory.exists({ service_id: service._id, $or: [{ ticket_type_id: type._id }, ...(String(type._id) === String(service._id) ? [{ ticket_type_id: null }] : [])] });
    if (await (session ? calendarQuery.session(session) : calendarQuery)) throw createError('Hạng vé có lịch bán riêng. Vui lòng chọn ngày và khung giờ đang mở bán.', 409);
    result.push({ line_key: key, vendor_id: service.facility_id.vendor_id, service_id: service._id, facility_id: service.facility_id._id, facility_name: service.facility_id.name, service_name: service.name, commission_rate: service.facility_id.commission_rate,
      ticket_type_id: type._id, ticket_name: type.name, ticket_description: type.description || '', ticket_conditions: type.conditions || '', min_age: type.min_age ?? null, max_age: type.max_age ?? null,
      visit_date: new Date(item.visit_date), time_slot: 'ALL_DAY', type: 'TICKET', quantity: item.quantity, unit_price: type.price, line_total: type.price * item.quantity });
  }
  return result;
};

const calculateDiscounts = async (userId, subtotal, promotion_code, points_to_redeem = 0, session) => {
  const pointsRequested = Number(points_to_redeem || 0);
  if (!Number.isInteger(pointsRequested) || pointsRequested < 0) {
    throw createError('points_to_redeem must be a non-negative integer', 400);
  }
  const userQuery = User.findById(userId).select('total_loyalty_points status role_id').populate('role_id');
  const user = await (session ? userQuery.session(session) : userQuery);
  if (!user) throw createError('User not found', 404);
  if (user.status !== 'ACTIVE' || user.role_id?.role_name !== 'CUSTOMER') throw createError('Tài khoản không có quyền đặt vé', 403);
  if (pointsRequested > (user.total_loyalty_points || 0)) throw createError('Not enough loyalty points', 400);

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
      ? (subtotal * promotion.discount_value) / 100
      : promotion.discount_value;
    if (promotion.max_discount !== null) promotionDiscount = Math.min(promotionDiscount, promotion.max_discount);
    promotionDiscount = Math.min(Math.round(promotionDiscount), subtotal);
  }

  const pointValue = await getPointValue(session);
  const pointsAffordable = Math.floor((subtotal - promotionDiscount) / pointValue);
  const pointsApplied = Math.min(pointsRequested, pointsAffordable);
  const pointsDiscount = pointsApplied * pointValue;

  return {
    subtotal,
    promotion: promotion ? { id: promotion._id, code: promotion.code, discount_type: promotion.discount_type, discount_value: promotion.discount_value } : null,
    promotion_discount_amount: promotionDiscount,
    points_available: user.total_loyalty_points || 0,
    points_redeemed: pointsApplied,
    point_value: pointValue,
    points_discount_amount: pointsDiscount,
    final_amount: Math.max(0, subtotal - promotionDiscount - pointsDiscount)
  };
};

const quoteBooking = async (userId, payload, session) => {
  const { items, promotion_code, points_to_redeem = 0 } = payload || {};
  if (payload?.service_id && payload?.check_in && payload?.check_out) {
    const checkIn = isoDate(payload.check_in, 'Ngày nhận phòng');
    const checkOut = isoDate(payload.check_out, 'Ngày trả phòng');
    const nights = Math.max(1, Math.round((checkOut - checkIn) / 86400000));
    const rooms = Number(payload.rooms) || 1;
    const query = Service.findOne({ _id: payload.service_id, type: 'ROOM' }).populate('facility_id', 'name status type vendor_id commission_rate');
    const service = await (session ? query.session(session) : query);
    if (!service || service.facility_id?.status !== 'ACTIVE' || service.facility_id.type !== 'HOTEL') throw createError('Loại phòng chưa mở bán', 409);
    const subtotal = service.base_price * nights * rooms;
    const discounts = await calculateDiscounts(userId, subtotal, promotion_code, points_to_redeem, session);
    return {
      service_id: service._id,
      service_name: service.name,
      facility_name: service.facility_id?.name,
      nights,
      rooms,
      unit_price: service.base_price,
      items: [{
        service_id: service._id,
        service_name: service.name,
        facility_name: service.facility_id?.name,
        quantity: rooms,
        unit_price: service.base_price * nights,
        line_total: subtotal
      }],
      ...discounts
    };
  }
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
    }).populate({ path: 'service_id', populate: { path: 'facility_id', select: 'name status vendor_id commission_rate' } });

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
        commission_rate: inventory.service_id.facility_id.commission_rate,
        ...(type ? { ticket_type_id: type._id, ticket_name: type.name, ticket_description: type.description || '', ticket_conditions: type.conditions || '', min_age: type.min_age ?? null, max_age: type.max_age ?? null } : {}),
        visit_date: inventory.target_date, time_slot: inventory.time_slot,
        type: inventory.service_id.type,
        quantity,
        unit_price: price,
        line_total: price * quantity
      };
    })];
  }
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.line_total, 0);
  if (!Number.isFinite(subtotal) || subtotal > Number.MAX_SAFE_INTEGER) throw createError('Tổng tiền không hợp lệ', 400);
  const discounts = await calculateDiscounts(userId, subtotal, promotion_code, points_to_redeem, session);

  return {
    items: invoiceItems,
    ...discounts
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
  const facilityOf = detail => detail.service_id?.facility_id || detail.inventory_id?.service_id?.facility_id;
  const facilityIds = [...new Set(details.map(d => facilityOf(d)?._id).filter(Boolean).map(String))];
  let images = [];
  if (facilityIds.length) {
    const imageQuery = FacilityImage.find({ facility_id: { $in: facilityIds } }).sort({ is_primary: -1, _id: 1 }).lean();
    images = await (session ? imageQuery.session(session) : imageQuery);
  }
  const imageByFacility = new Map();
  for (const image of images) if (!imageByFacility.has(String(image.facility_id))) imageByFacility.set(String(image.facility_id), image.image_url);
  const formattedDetails = details.map(d => {
    const service = d.service_id || d.inventory_id?.service_id;
    const facility = facilityOf(d);
    const facilityId = facility?._id || (facility && typeof facility !== 'object' ? facility : null) || d.facility_id;
    const facilityName = d.facility_name || facility?.name;
    return {
      ...d,
      facility_id: facilityId,
      facility_name: facilityName,
      service_type: service?.type || (d.check_in_date ? 'ROOM' : undefined),
      facility_type: facility?.type,
      facility_image: imageByFacility.get(String(facility?._id)) || null,
      ticket_name: d.ticket_name || service?.name,
      service_name: d.service_name || service?.name,
      visit_date: d.visit_date || d.inventory_id?.target_date,
      time_slot: d.time_slot || d.inventory_id?.time_slot
    };
  });
  const data = {
    ...booking,
    facility_id: formattedDetails[0]?.facility_id || null,
    facility_name: formattedDetails[0]?.facility_name || null,
    details: formattedDetails,
    payments
  };
  data.can_request_cancellation = cancellable(data) && !data.cancellation_requests?.some(r => r.status === 'PENDING');
  // Never expose a usage token for unpaid, cancelled, completed or redeemed lines.
  // Calculate cancellation eligibility first to preserve the existing business rules.
  data.details = data.details.map(detail => {
    if (booking.status === 'CONFIRMED' && (!detail.check_in_status || detail.check_in_status === 'PENDING')) return detail;
    const { qr_code, ...safeDetail } = detail;
    return safeDetail;
  });
  return data;
};

const createBooking = async (userId, payload) => {
  assertGuest(payload);
  if (payload.payment_method) throw createError('Phần thanh toán hiện đang tạm ngưng', 400);
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
        points_discount_amount: invoice.points_discount_amount, status: 'PENDING', expires_at: holdExpiry()
      }], { session });
      bookingId = booking._id;
      await BookingDetail.insertMany(invoice.items.map(line => ({
        booking_id: booking._id, inventory_id: line.inventory_id, service_id: line.service_id, facility_id: line.facility_id, quantity: line.quantity, unit_price: line.unit_price,
        ticket_type_id: line.ticket_type_id, ticket_name: line.ticket_name, service_name: line.service_name, facility_name: line.facility_name,
        ticket_conditions: line.ticket_conditions, ticket_description: line.ticket_description, min_age: line.min_age, max_age: line.max_age,
        visit_date: line.visit_date, time_slot: line.time_slot, commission_rate: line.commission_rate
      })), { session });

      if (invoice.points_redeemed > 0) {
        const userUpdate = await User.updateOne({ _id: userId, total_loyalty_points: { $gte: invoice.points_redeemed } }, { $inc: { total_loyalty_points: -invoice.points_redeemed } }, { session });
        if (userUpdate.modifiedCount !== 1) throw createError('Điểm thưởng không đủ để thực hiện giao dịch', 400);
        await LoyaltyPointTransaction.create([{
          user_id: userId,
          booking_id: booking._id,
          points: -invoice.points_redeemed,
          reason: `Quy đổi điểm thưởng cho đơn đặt vé ${booking.booking_code}`
        }], { session });
      }
      if (invoice.promotion?.id) {
        await Promotion.updateOne({ _id: invoice.promotion.id }, { $inc: { used_count: 1 } }, { session });
      }
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const concurrent = await Booking.findOne({ customer_id: userId, request_id: payload.request_id });
    if (!concurrent) throw error;
    bookingId = concurrent._id;
  }
  return bookingForCustomer(userId, bookingId);
};

const createRoomBooking = async (userId, payload) => {
  assertGuest(payload);
  const checkIn = isoDate(payload.check_in, 'Ngày nhận phòng');
  const checkOut = isoDate(payload.check_out, 'Ngày trả phòng');
  if (payload.check_in < today()) throw createError('Ngày nhận phòng đã qua', 400);
  const nights = Math.round((checkOut - checkIn) / 86400000);
  if (nights < 1 || nights > 30) throw createError('Thời gian lưu trú phải từ 1 đến 30 đêm', 400);
  const rooms = Number(payload.rooms), guests = Number(payload.guests);
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > 20) throw createError('Số phòng không hợp lệ', 400);
  if (!Number.isInteger(guests) || guests < 1 || guests > 100) throw createError('Số khách không hợp lệ', 400);
  if (!mongoose.isValidObjectId(payload.service_id)) throw createError('Loại phòng không hợp lệ', 400);
  const existing = await Booking.findOne({ customer_id: userId, request_id: payload.request_id });
  if (existing) return bookingForCustomer(userId, existing._id);
  let bookingId;
  try {
    await mongoose.connection.transaction(async session => {
      const service = await Service.findOne({ _id: payload.service_id, type: 'ROOM' }).populate('facility_id', 'name status type vendor_id commission_rate').session(session);
      if (!service || service.facility_id?.status !== 'ACTIVE' || service.facility_id.type !== 'HOTEL') throw createError('Loại phòng chưa mở bán', 409);
      const totalRooms = service.total_rooms ?? 1;
      if (rooms > totalRooms) throw createError(`Chỉ còn tối đa ${totalRooms} phòng loại này`, 409);
      if (guests > (service.capacity || 2) * rooms) throw createError('Số khách vượt quá sức chứa của số phòng đã chọn', 400);
      const total = service.base_price * nights * rooms;
      const discounts = await calculateDiscounts(userId, total, payload.promotion_code, payload.points_to_redeem, session);
      if (payload.expected_total !== undefined && Number(payload.expected_total) !== discounts.final_amount) throw createError('Giá phòng đã thay đổi. Vui lòng kiểm tra lại.', 409);
      // Serialize concurrent bookings of the same room type before counting overlaps.
      await Service.updateOne({ _id: service._id }, { $inc: { booking_revision: 1 } }, { session });
      const overlapping = await BookingDetail.find({ service_id: service._id, check_in_date: { $lt: checkOut }, check_out_date: { $gt: checkIn } }).populate('booking_id', 'status').session(session);
      const taken = overlapping.filter(d => ['PENDING', 'CONFIRMED'].includes(d.booking_id?.status)).reduce((sum, d) => sum + d.quantity, 0);
      if (taken + rooms > totalRooms) throw createError('Loại phòng này đã hết phòng trong ngày bạn chọn', 409);
      const [booking] = await Booking.create([{
        booking_code: 'TVL-' + crypto.randomBytes(8).toString('hex').toUpperCase(), customer_id: userId, request_id: payload.request_id, vendor_id: service.facility_id.vendor_id,
        guest_name: payload.guest_name.trim(), guest_email: payload.guest_email.trim(), guest_phone: payload.guest_phone.trim(),
        total_amount: total, final_amount: discounts.final_amount,
        promotion_id: discounts.promotion?.id,
        promotion_discount_amount: discounts.promotion_discount_amount,
        points_redeemed: discounts.points_redeemed,
        points_discount_amount: discounts.points_discount_amount,
        status: 'PENDING', expires_at: holdExpiry()
      }], { session });
      bookingId = booking._id;
      await BookingDetail.create([{
        booking_id: booking._id, service_id: service._id, quantity: rooms, unit_price: service.base_price * nights,
        commission_rate: service.facility_id.commission_rate,
        service_name: service.name, ticket_name: service.name, facility_name: service.facility_id.name,
        visit_date: checkIn, check_in_date: checkIn, check_out_date: checkOut, nights
      }], { session });

      if (discounts.points_redeemed > 0) {
        const userUpdate = await User.updateOne({ _id: userId, total_loyalty_points: { $gte: discounts.points_redeemed } }, { $inc: { total_loyalty_points: -discounts.points_redeemed } }, { session });
        if (userUpdate.modifiedCount !== 1) throw createError('Điểm thưởng không đủ để thực hiện giao dịch', 400);
        await LoyaltyPointTransaction.create([{
          user_id: userId,
          booking_id: booking._id,
          points: -discounts.points_redeemed,
          reason: `Quy đổi điểm thưởng cho đơn đặt phòng ${booking.booking_code}`
        }], { session });
      }
      if (discounts.promotion?.id) {
        await Promotion.updateOne({ _id: discounts.promotion.id }, { $inc: { used_count: 1 } }, { session });
      }
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const concurrent = await Booking.findOne({ customer_id: userId, request_id: payload.request_id });
    if (!concurrent) throw error;
    bookingId = concurrent._id;
  }
  return bookingForCustomer(userId, bookingId);
};

// Cancels unpaid orders past their hold time and returns ticket stock.
const expireStaleBookings = async () => {
  const stale = await Booking.find({ status: 'PENDING', expires_at: { $lt: new Date() } }).select('_id').limit(100).lean();
  let expired = 0;
  for (const { _id } of stale) {
    // The customer may have paid without the page open: check PayOS once more before cancelling.
    try {
      const order = await Booking.findById(_id);
      await require('./payment.service').reconcileBooking(order);
    } catch (error) { console.error('Pre-expiry PayOS check failed', error.message); }
    await mongoose.connection.transaction(async session => {
      const result = await Booking.updateOne(
        { _id, status: 'PENDING', expires_at: { $lt: new Date() } },
        { $set: { status: 'CANCELLED', decided_at: new Date(), decision_note: 'Hết thời gian giữ chỗ do chưa thanh toán' } },
        { session }
      );
      if (result.modifiedCount !== 1) return;
      expired += 1;
      const order = await Booking.findById(_id).session(session);
      if (order?.points_redeemed > 0) {
        await User.updateOne({ _id: order.customer_id }, { $inc: { total_loyalty_points: order.points_redeemed } }, { session });
        await LoyaltyPointTransaction.create([{
          user_id: order.customer_id,
          booking_id: order._id,
          points: order.points_redeemed,
          reason: `Hoàn điểm thưởng do đơn hàng ${order.booking_code} hết hạn thanh toán`
        }], { session });
      }
      if (order?.promotion_id) {
        await Promotion.updateOne({ _id: order.promotion_id }, { $inc: { used_count: -1 } }, { session });
      }
      const details = await BookingDetail.find({ booking_id: _id }).session(session);
      for (const detail of details) {
        if (detail.inventory_id) await ServiceInventory.updateOne({ _id: detail.inventory_id }, { $inc: { available_qty: detail.quantity } }, { session });
      }
    });
  }
  return expired;
};

const listBookings = async (userId) => {
  const bookings = await Booking.find({ customer_id: userId }).sort({ created_at: -1 }).limit(100).lean();
  return Promise.all(bookings.map(b => bookingForCustomer(userId, b._id)));
};

const ownerOf = (detail, booking) =>
  (detail.service_id || detail.inventory_id?.service_id)?.facility_id?.vendor_id ||
  booking?.vendor_id ||
  detail.vendor_id;
const isTicket = detail => {
  const service = detail.service_id || detail.inventory_id?.service_id;
  return service?.type === 'TICKET' && service.facility_id?.type === 'ATTRACTION';
};
const isRoom = detail => {
  const service = detail.service_id || detail.inventory_id?.service_id;
  const facility = service?.facility_id;
  return service?.type === 'ROOM' || facility?.type === 'HOTEL' || (!service?.type && !detail.ticket_type_id);
};
const isPartnerService = detail => isTicket(detail) || isRoom(detail);

const cancellable = booking => {
  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) return false;
  if (!booking.details?.length) return false;
  const isAllTickets = booking.details.every(isTicket);
  const isAllRooms = booking.details.every(isRoom);
  if (!isAllTickets && !isAllRooms) return false;
  if (isAllTickets && (booking.status !== 'PENDING' || booking.payments?.length || booking.points_redeemed || booking.details.some(d => d.qr_code))) return false;
  if (isAllRooms && booking.details.some(d => d.check_in_status === 'CHECKED_IN')) return false;
  const vendors = new Set(booking.details.map(d => String(ownerOf(d, booking) || '')));
  return vendors.size === 1 && Boolean(ownerOf(booking.details[0], booking));
};

const vendorBooking = async (userId, bookingId, session) => {
  if (!mongoose.isValidObjectId(bookingId)) throw createError('Mã đơn không hợp lệ', 400);
  const query = Booking.findById(bookingId).lean();
  const booking = await (session ? query.session(session) : query);
  if (!booking) throw createError('Không tìm thấy đơn đặt', 404);
  const data = await bookingForCustomer(booking.customer_id, bookingId, session);
  const details = data.details.filter(d => isPartnerService(d) && (String(ownerOf(d, data)) === String(userId) || String(data.vendor_id) === String(userId)));
  if (!details.length) throw createError('Không tìm thấy đơn đặt', 404);
  const complete = details.length === data.details.length;
  const canProcess = complete && cancellable(data);
  // Legacy mixed orders expose only this vendor's lines and subtotal.
  return { ...data, details, payments: undefined, total_amount: complete ? data.total_amount : details.reduce((sum, d) => sum + d.quantity * d.unit_price, 0), final_amount: complete ? data.final_amount : details.reduce((sum, d) => sum + d.quantity * d.unit_price, 0), can_process_cancellation: canProcess, can_request_cancellation: undefined, cancellation_requests: complete ? data.cancellation_requests : [] };
};

const listVendorBookings = async (userId, filters = {}) => {
  const facilities = await Facility.find({ vendor_id: userId, type: { $in: ['ATTRACTION', 'HOTEL'] } }).distinct('_id');
  const services = await Service.find({ facility_id: { $in: facilities }, type: { $in: ['TICKET', 'ROOM'] } }).distinct('_id');
  const inventories = await ServiceInventory.find({ service_id: { $in: services } }).distinct('_id');
  const ids = await BookingDetail.find({ $or: [{ inventory_id: { $in: inventories } }, { service_id: { $in: services } }] }).distinct('booking_id');
  const vendorBookings = await Booking.find({ vendor_id: userId }).distinct('_id');
  const allIds = [...new Set([...ids.map(String), ...vendorBookings.map(String)])];
  const match = { _id: { $in: allIds } };
  if (filters.status) {
    if (!['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'COMPLETED'].includes(filters.status)) throw createError('Trạng thái đơn không hợp lệ', 400);
    match.status = filters.status;
  }
  if (filters.q) {
    if (typeof filters.q !== 'string' || filters.q.length > 200) throw createError('Từ khóa quá dài', 400);
    const search = new RegExp(filters.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = ['booking_code', 'guest_name', 'guest_email', 'guest_phone'].map(field => ({ [field]: search }));
  }
  if (filters.cancellations === 'true') match['cancellation_requests.0'] = { $exists: true };
  if (filters.cancellation_status) {
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(filters.cancellation_status)) throw createError('Trạng thái yêu cầu không hợp lệ', 400);
    // Filter the latest request, not an obsolete rejected entry.
    match.$expr = { $eq: [{ $arrayElemAt: ['$cancellation_requests.status', -1] }, filters.cancellation_status] };
  }
  if (filters.request_type) {
    if (!['CANCEL', 'CHANGE_DATE', 'REFUND'].includes(filters.request_type)) throw createError('Loại yêu cầu không hợp lệ', 400);
    const typeExpr = { $eq: [{ $arrayElemAt: ['$cancellation_requests.type', -1] }, filters.request_type] };
    match.$expr = match.$expr ? { $and: [match.$expr, typeExpr] } : typeExpr;
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
  const type = ['CHANGE_DATE', 'REFUND'].includes(payload.type) ? payload.type : 'CANCEL';
  let newDate = null;
  if (type === 'CHANGE_DATE') {
    if (!payload.new_date) throw createError('Vui lòng chọn ngày mới cần đổi', 400);
    newDate = new Date(payload.new_date);
    if (isNaN(newDate.getTime())) throw createError('Ngày mới không hợp lệ', 400);
  }

  await mongoose.connection.transaction(async session => {
    const data = await bookingForCustomer(userId, bookingId, session);
    if (data.cancellation_requests?.some(r => r.request_id === payload.request_id)) return;
    if (!data.can_request_cancellation) throw createError('Chỉ được yêu cầu cho đơn chưa hoàn tất/hủy và chưa có yêu cầu đang chờ', 409);
    if (data.cancellation_requests?.length >= 50) throw createError('Đơn đã đạt giới hạn yêu cầu', 409);
    await Booking.updateOne(
      { _id: bookingId, customer_id: userId },
      {
        $push: {
          cancellation_requests: {
            request_id: payload.request_id,
            requested_by: userId,
            reason,
            type,
            new_date: newDate,
            status: 'PENDING',
            requested_at: new Date()
          }
        }
      },
      { session, runValidators: true }
    );
  });
  return bookingForCustomer(userId, bookingId);
};

const decideCancellation = async (userId, bookingId, requestId, payload) => {
  if (!mongoose.isValidObjectId(requestId)) throw createError('Mã yêu cầu không hợp lệ', 400);
  if (!['APPROVED', 'REJECTED'].includes(payload.status)) throw createError('Chọn APPROVED hoặc REJECTED', 400);
  const reason = reasonText(payload.reason, false);
  await mongoose.connection.transaction(async session => {
    const data = await vendorBooking(userId, bookingId, session);
    const request = data.cancellation_requests?.find(r => String(r._id) === requestId);
    if (!request) throw createError('Không tìm thấy yêu cầu', 404);
    if (request.status === payload.status) return;
    if (request.status !== 'PENDING' || !data.can_process_cancellation) throw createError('Yêu cầu đã xử lý hoặc đơn không còn có thể xử lý', 409);
    const now = new Date();
    const changes = { 'cancellation_requests.$.status': payload.status, 'cancellation_requests.$.processed_by': userId, 'cancellation_requests.$.processed_at': now, 'cancellation_requests.$.decision_reason': reason };
    if (payload.status === 'APPROVED') {
      if (request.type === 'CHANGE_DATE' && request.new_date) {
        await BookingDetail.updateMany(
          { booking_id: bookingId },
          { $set: { visit_date: request.new_date } },
          { session }
        );
        Object.assign(changes, { decided_by: userId, decided_at: now, decision_note: `Đã chấp thuận đổi ngày: ${reason || ''}`.trim() });
      } else if (request.type === 'REFUND') {
        Object.assign(changes, { status: 'REFUNDED', decided_by: userId, decided_at: now, decision_note: reason || 'Chấp thuận hoàn tiền theo quy định chính sách' });
      } else {
        Object.assign(changes, { status: 'CANCELLED', decided_by: userId, decided_at: now, decision_note: reason });
      }
    }
    const result = await Booking.updateOne({ _id: bookingId, cancellation_requests: { $elemMatch: { _id: requestId, status: 'PENDING' } } }, { $set: changes }, { session, runValidators: true });
    if (result.modifiedCount !== 1) throw createError('Yêu cầu vừa được xử lý. Vui lòng tải lại.', 409);
    if (payload.status === 'APPROVED' && request.type !== 'CHANGE_DATE') {
      for (const detail of data.details) {
        if (!detail.inventory_id) continue;
        const restored = await ServiceInventory.updateOne({ _id: detail.inventory_id._id }, { $inc: { available_qty: detail.quantity } }, { session });
        if (restored.modifiedCount !== 1) throw createError('Không thể cập nhật tồn kho; đơn chưa được hủy', 409);
      }
    }
  });
  return vendorBooking(userId, bookingId);
};

const listAvailablePromotions = async (userId) => {
  const now = new Date();
  const promotions = await Promotion.find({
    status: 'ACTIVE',
    $or: [{ user_id: null }, { user_id: userId }],
    $and: [
      { $or: [{ valid_from: null }, { valid_from: { $lte: now } }] },
      { $or: [{ valid_to: null }, { valid_to: { $gte: now } }] }
    ]
  }).sort({ discount_value: -1 }).lean();

  const user = await User.findById(userId).select('total_loyalty_points');
  const pointValue = await getPointValue();

  return {
    promotions: promotions.filter(p => p.usage_limit === null || (p.used_count || 0) < p.usage_limit),
    loyalty_points: user?.total_loyalty_points || 0,
    point_value: pointValue
  };
};

module.exports = { quoteBooking, createBooking, createRoomBooking, expireStaleBookings, bookingForCustomer, listBookings, listVendorBookings, vendorBooking, requestCancellation, decideCancellation, listAvailablePromotions };
