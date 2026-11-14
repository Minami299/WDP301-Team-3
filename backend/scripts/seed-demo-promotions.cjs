const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Promotion } = require('../src/models');

const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const today = startOfToday();
const in90Days = addDays(today, 90);
const in180Days = addDays(today, 180);
const in365Days = addDays(today, 365);

const demoPromotions = [
  {
    code: 'TVLALL15',
    title: 'Travelio toàn sàn - Giảm 15%',
    description: 'Ưu đãi áp dụng cho mọi đơn đặt phòng và vé tham quan trên Travelio.',
    applicable_service: 'ALL',
    target_audience: 'ALL',
    voucher_type: 'GENERAL',
    discount_type: 'PERCENTAGE',
    discount_value: 15,
    max_discount: 100000,
    min_order_amount: 300000,
    valid_from: today,
    valid_to: in90Days,
    usage_limit: 500,
    usage_limit_per_user: 1,
  },
  {
    code: 'TRAVELIO25',
    title: 'Travelio toàn sàn - Giảm 25% không giới hạn trần',
    description: 'Mã phần trăm toàn sàn để demo trường hợp không giới hạn mức giảm tối đa.',
    applicable_service: 'ALL',
    target_audience: 'ALL',
    voucher_type: 'GENERAL',
    discount_type: 'PERCENTAGE',
    discount_value: 25,
    max_discount: null,
    min_order_amount: 500000,
    valid_from: today,
    valid_to: null,
    usage_limit: 1000,
    usage_limit_per_user: 2,
  },
  {
    code: 'TRAVELIOFIX',
    title: 'Travelio toàn sàn - Giảm 100.000đ',
    description: 'Mã giảm cố định áp dụng cho mọi dịch vụ.',
    applicable_service: 'ALL',
    target_audience: 'ALL',
    voucher_type: 'GENERAL',
    discount_type: 'FIXED',
    discount_value: 100000,
    max_discount: null,
    min_order_amount: 500000,
    valid_from: today,
    valid_to: in365Days,
    usage_limit: 300,
    usage_limit_per_user: 1,
  },
  {
    code: 'HOTEL20',
    title: 'Khách sạn cuối tuần - Giảm 20%',
    description: 'Ưu đãi dành cho các đơn đặt phòng khách sạn.',
    applicable_service: 'HOTEL',
    target_audience: 'ALL',
    voucher_type: 'HOTEL',
    discount_type: 'PERCENTAGE',
    discount_value: 20,
    max_discount: 250000,
    min_order_amount: 800000,
    valid_from: today,
    valid_to: in180Days,
    usage_limit: 250,
    usage_limit_per_user: 2,
  },
  {
    code: 'HOTELFIX50',
    title: 'Khách sạn - Giảm ngay 50.000đ',
    description: 'Mã giảm cố định cho đơn đặt phòng khách sạn.',
    applicable_service: 'HOTEL',
    target_audience: 'ALL',
    voucher_type: 'HOTEL',
    discount_type: 'FIXED',
    discount_value: 50000,
    max_discount: null,
    min_order_amount: 500000,
    valid_from: today,
    valid_to: null,
    usage_limit: 500,
    usage_limit_per_user: 1,
  },
  {
    code: 'TICKET15',
    title: 'Vé tham quan - Giảm 15%',
    description: 'Ưu đãi áp dụng cho vé tham quan và vui chơi.',
    applicable_service: 'ATTRACTION',
    target_audience: 'ALL',
    voucher_type: 'ATTRACTION',
    discount_type: 'PERCENTAGE',
    discount_value: 15,
    max_discount: 50000,
    min_order_amount: 100000,
    valid_from: today,
    valid_to: in90Days,
    usage_limit: 500,
    usage_limit_per_user: 2,
  },
  {
    code: 'TICKETFIX30',
    title: 'Vé tham quan - Giảm 30.000đ',
    description: 'Mã giảm cố định cho các đơn vé tham quan.',
    applicable_service: 'ATTRACTION',
    target_audience: 'ALL',
    voucher_type: 'ATTRACTION',
    discount_type: 'FIXED',
    discount_value: 30000,
    max_discount: null,
    min_order_amount: 150000,
    valid_from: today,
    valid_to: in180Days,
    usage_limit: 300,
    usage_limit_per_user: 1,
  },
  {
    code: 'WELCOME15',
    title: 'Chào mừng khách hàng mới - Giảm 15%',
    description: 'Mã ưu đãi dành riêng cho khách hàng chưa có đơn hoàn tất.',
    applicable_service: 'ALL',
    target_audience: 'NEW_USER',
    voucher_type: 'NEW_USER',
    discount_type: 'PERCENTAGE',
    discount_value: 15,
    max_discount: 150000,
    min_order_amount: 500000,
    valid_from: today,
    valid_to: in180Days,
    usage_limit: 1000,
    usage_limit_per_user: 1,
  },
  {
    code: 'WELCOMEHOTEL',
    title: 'Khách hàng mới đặt phòng - Giảm 100.000đ',
    description: 'Ưu đãi đơn đầu tiên khi đặt phòng khách sạn.',
    applicable_service: 'HOTEL',
    target_audience: 'NEW_USER',
    voucher_type: 'NEW_USER',
    discount_type: 'FIXED',
    discount_value: 100000,
    max_discount: null,
    min_order_amount: 500000,
    valid_from: today,
    valid_to: in365Days,
    usage_limit: 500,
    usage_limit_per_user: 1,
  },
  {
    code: 'POINTALL10',
    title: 'Đổi 500 điểm - Giảm 10% toàn sàn',
    description: 'Voucher mẫu để khách hàng đổi bằng điểm thưởng thành viên.',
    applicable_service: 'ALL',
    target_audience: 'LOYALTY_POINT',
    voucher_type: 'LOYALTY_POINT',
    points_required: 500,
    points_cost: 500,
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    max_discount: 100000,
    min_order_amount: 300000,
    valid_from: today,
    valid_to: in365Days,
    usage_limit: 1000,
    usage_limit_per_user: 1,
  },
  {
    code: 'POINTHOTEL',
    title: 'Đổi 1000 điểm - Giảm 200.000đ phòng khách sạn',
    description: 'Voucher đổi điểm dành cho dịch vụ khách sạn.',
    applicable_service: 'HOTEL',
    target_audience: 'LOYALTY_POINT',
    voucher_type: 'LOYALTY_POINT',
    points_required: 1000,
    points_cost: 1000,
    discount_type: 'FIXED',
    discount_value: 200000,
    max_discount: null,
    min_order_amount: 1000000,
    valid_from: today,
    valid_to: in180Days,
    usage_limit: 300,
    usage_limit_per_user: 1,
  },
  {
    code: 'POINTTICKET',
    title: 'Đổi 750 điểm - Giảm 50.000đ vé tham quan',
    description: 'Voucher đổi điểm dành cho vé tham quan và vui chơi.',
    applicable_service: 'ATTRACTION',
    target_audience: 'LOYALTY_POINT',
    voucher_type: 'LOYALTY_POINT',
    points_required: 750,
    points_cost: 750,
    discount_type: 'FIXED',
    discount_value: 50000,
    max_discount: null,
    min_order_amount: 200000,
    valid_from: today,
    valid_to: null,
    usage_limit: 500,
    usage_limit_per_user: 1,
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  let created = 0;
  let updated = 0;
  for (const promotion of demoPromotions) {
    const result = await Promotion.updateOne(
      { code: promotion.code },
      {
        $set: {
          ...promotion,
          status: 'ACTIVE',
          user_id: null,
        },
        $setOnInsert: { used_count: 0 },
      },
      { upsert: true },
    );
    if (result.upsertedCount) created += 1;
    else if (result.modifiedCount) updated += 1;
  }

  const codes = demoPromotions.map((promotion) => promotion.code);
  const stored = await Promotion.find({ code: { $in: codes } })
    .select('code applicable_service target_audience voucher_type discount_type discount_value points_cost valid_to status')
    .sort({ code: 1 })
    .lean();

  console.log(JSON.stringify({
    message: 'Demo promotions seeded',
    created,
    updated,
    total: stored.length,
    promotions: stored,
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
