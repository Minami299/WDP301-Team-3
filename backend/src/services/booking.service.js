const mongoose = require('mongoose');
const { Booking, Promotion, ServiceInventory, SystemConfig, User } = require('../models');

const createError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const getPointValue = async () => {
  const config = await SystemConfig.findOne({ config_key: 'LOYALTY_POINT_VALUE' });
  const value = Number(config?.config_value);
  if (!Number.isFinite(value) || value <= 0) {
    throw createError('Loyalty point value is not configured', 503);
  }
  return value;
};

const quoteBooking = async (userId, { items, promotion_code, points_to_redeem = 0 }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw createError('At least one inventory item is required', 400);
  }

  const pointsRequested = Number(points_to_redeem);
  if (!Number.isInteger(pointsRequested) || pointsRequested < 0) {
    throw createError('points_to_redeem must be a non-negative integer', 400);
  }

  const requested = new Map();
  for (const item of items) {
    if (!mongoose.isValidObjectId(item.inventory_id)) {
      throw createError('Invalid inventory_id', 400);
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw createError('Each item quantity must be a positive integer', 400);
    }
    requested.set(String(item.inventory_id), (requested.get(String(item.inventory_id)) || 0) + quantity);
  }

  const inventories = await ServiceInventory.find({
    _id: { $in: [...requested.keys()] }
  }).populate({ path: 'service_id', populate: { path: 'facility_id', select: 'name status' } });

  if (inventories.length !== requested.size) {
    throw createError('One or more inventory items were not found', 404);
  }

  const user = await User.findById(userId).select('total_loyalty_points');
  if (!user) throw createError('User not found', 404);
  if (pointsRequested > user.total_loyalty_points) {
    throw createError('Not enough loyalty points', 400);
  }

  const invoiceItems = inventories.map((inventory) => {
    const quantity = requested.get(String(inventory._id));
    if (inventory.available_qty < quantity) {
      throw createError(`Insufficient inventory for ${inventory.service_id?.name || 'a selected item'}`, 409);
    }
    if (!inventory.service_id || inventory.service_id.facility_id?.status !== 'ACTIVE') {
      throw createError('One or more selected services are unavailable', 409);
    }
    return {
      inventory_id: inventory._id,
      service_id: inventory.service_id._id,
      service_name: inventory.service_id.name,
      facility_name: inventory.service_id.facility_id.name,
      type: inventory.service_id.type,
      quantity,
      unit_price: inventory.price,
      line_total: inventory.price * quantity
    };
  });

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.line_total, 0);
  let promotion = null;
  let promotionDiscount = 0;

  if (promotion_code?.trim()) {
    promotion = await Promotion.findOne({ code: promotion_code.trim().toUpperCase() });
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

  const pointValue = await getPointValue();
  const pointsAffordable = Math.floor((subtotal - promotionDiscount) / pointValue);
  const pointsApplied = Math.min(pointsRequested, pointsAffordable);
  const pointsDiscount = pointsApplied * pointValue;

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

module.exports = { quoteBooking };