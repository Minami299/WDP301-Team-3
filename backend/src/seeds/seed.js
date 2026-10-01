const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const models = require('../models');

const {
  Role,
  User,
  UserProfile,
  Amenity,
  Facility,
  FacilityAmenity,
  FacilityImage,
  Service,
  ServiceInventory,
  Promotion,
  Booking,
  BookingDetail,
  Payment,
  Review,
  LoyaltyPointTransaction,
  SupportTicket,
  Notification,
  Payout,
  PayoutDetail,
  SystemConfig,
  AuditLog
} = models;

async function seedData() {
  try {
    console.log('🚀 Đang kết nối tới MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối thành công tới:', mongoose.connection.host);

    console.log('🧹 Bắt đầu dọn dẹp dữ liệu cũ trên 21 collection chuẩn...');
    // Xóa dữ liệu cũ của 21 collections để tránh trùng lặp key unique
    for (const [name, model] of Object.entries(models)) {
      await model.deleteMany({});
      console.log(`  - Đã làm sạch: ${model.collection.name}`);
    }

    console.log('\n🌱 Bắt đầu nạp dữ liệu Mock Data...');

    // 1. Roles
    console.log('1. Tạo Roles...');
    const roles = await Role.insertMany([
      { role_name: 'ADMIN', description: 'Quản trị viên toàn hệ thống' },
      { role_name: 'MANAGER', description: 'Quản lý vận hành và hỗ trợ khách hàng' },
      { role_name: 'HOTEL_OWNER', description: 'Chủ sở hữu / Quản lý khách sạn & cơ sở lưu trú' },
      { role_name: 'ACTIVITY_VENDOR', description: 'Nhà cung cấp vé tham quan, tour & hoạt động vui chơi giải trí' },
      { role_name: 'CUSTOMER', description: 'Khách hàng sử dụng dịch vụ' }
    ]);
    const roleMap = {};
    roles.forEach((r) => {
      roleMap[r.role_name] = r._id;
    });

    // 2. Users
    console.log('2. Tạo Users...');
    const users = await User.insertMany([
      {
        email: 'admin@travelio.com',
        password_hash: '$2b$10$wTqKj8Z7wFqK1l5s2u8rNeFwQ6r0Bv9e4q3i1u8o2k5j8h9g0f', // hash mẫu
        full_name: 'Admin Travelio',
        phone: '0901234567',
        role_id: roleMap['ADMIN'],
        total_loyalty_points: 0,
        status: 'ACTIVE'
      },
      {
        email: 'manager@travelio.com',
        password_hash: '$2b$10$wTqKj8Z7wFqK1l5s2u8rNeFwQ6r0Bv9e4q3i1u8o2k5j8h9g0f',
        full_name: 'Nguyễn Văn Quản Lý',
        phone: '0912345678',
        role_id: roleMap['MANAGER'],
        total_loyalty_points: 0,
        status: 'ACTIVE'
      },
      {
        email: 'vinpearl.vendor@travelio.com',
        password_hash: '$2b$10$wTqKj8Z7wFqK1l5s2u8rNeFwQ6r0Bv9e4q3i1u8o2k5j8h9g0f',
        full_name: 'Vinpearl Phú Quốc Partner',
        phone: '0987654321',
        role_id: roleMap['HOTEL_OWNER'],
        total_loyalty_points: 0,
        status: 'ACTIVE'
      },
      {
        email: 'sunworld.vendor@travelio.com',
        password_hash: '$2b$10$wTqKj8Z7wFqK1l5s2u8rNeFwQ6r0Bv9e4q3i1u8o2k5j8h9g0f',
        full_name: 'Sun World Ba Na Hills Partner',
        phone: '0977889900',
        role_id: roleMap['ACTIVITY_VENDOR'],
        total_loyalty_points: 0,
        status: 'ACTIVE'
      },
      {
        email: 'trungquan2904@gmail.com',
        password_hash: '$2b$10$wTqKj8Z7wFqK1l5s2u8rNeFwQ6r0Bv9e4q3i1u8o2k5j8h9g0f',
        full_name: 'Trần Trung Quân',
        phone: '0933221100',
        role_id: roleMap['CUSTOMER'],
        total_loyalty_points: 350,
        status: 'ACTIVE'
      },
      {
        email: 'minhhoang.travel@gmail.com',
        password_hash: '$2b$10$wTqKj8Z7wFqK1l5s2u8rNeFwQ6r0Bv9e4q3i1u8o2k5j8h9g0f',
        full_name: 'Lê Minh Hoàng',
        phone: '0944556677',
        role_id: roleMap['CUSTOMER'],
        total_loyalty_points: 120,
        status: 'ACTIVE'
      }
    ]);
    const userMap = {};
    users.forEach((u) => {
      userMap[u.email] = u;
    });

    // 3. User Profiles
    console.log('3. Tạo User Profiles...');
    await UserProfile.insertMany(
      users.map((u) => ({
        user_id: u._id,
        avatar_url: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80`,
        payment_methods: [
          { type: 'MOMO', account_number: u.phone },
          { type: 'BANK', bank_name: 'Vietcombank', account_number: '0123456789' }
        ],
        preferences: {
          currency: 'VND',
          language: 'vi',
          notifications_enabled: true
        }
      }))
    );

    // 4. Amenities
    console.log('4. Tạo Amenities...');
    const amenities = await Amenity.insertMany([
      // ROOM_FEATURE
      { name: 'Wifi tốc độ cao', icon_url: 'https://cdn-icons-png.flaticon.com/512/93/93158.png', type: 'ROOM_FEATURE' },
      { name: 'Điều hòa 2 chiều', icon_url: 'https://cdn-icons-png.flaticon.com/512/911/911409.png', type: 'ROOM_FEATURE' },
      { name: 'Bồn tắm view biển', icon_url: 'https://cdn-icons-png.flaticon.com/512/2855/2855523.png', type: 'ROOM_FEATURE' },
      { name: 'Ban công ngắm hoàng hôn', icon_url: 'https://cdn-icons-png.flaticon.com/512/2149/2149957.png', type: 'ROOM_FEATURE' },
      // HOTEL_FACILITY
      { name: 'Hồ bơi vô cực', icon_url: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png', type: 'HOTEL_FACILITY' },
      { name: 'Buffet sáng quốc tế', icon_url: 'https://cdn-icons-png.flaticon.com/512/3480/3480823.png', type: 'HOTEL_FACILITY' },
      { name: 'Phòng Gym & Yoga', icon_url: 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png', type: 'HOTEL_FACILITY' },
      { name: 'Spa & Xông hơi', icon_url: 'https://cdn-icons-png.flaticon.com/512/1940/1940922.png', type: 'HOTEL_FACILITY' },
      // ATTRACTION_SERVICE
      { name: 'Cáp treo khứ hồi', icon_url: 'https://cdn-icons-png.flaticon.com/512/1000/1000946.png', type: 'ATTRACTION_SERVICE' },
      { name: 'Hướng dẫn viên song ngữ', icon_url: 'https://cdn-icons-png.flaticon.com/512/1995/1995574.png', type: 'ATTRACTION_SERVICE' },
      { name: 'Bữa trưa Buffet tại đỉnh', icon_url: 'https://cdn-icons-png.flaticon.com/512/1046/1046751.png', type: 'ATTRACTION_SERVICE' },
      { name: 'Xe điện trung chuyển', icon_url: 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', type: 'ATTRACTION_SERVICE' }
    ]);
    const amenityMap = {};
    amenities.forEach((a) => {
      amenityMap[a.name] = a._id;
    });

    // 5. Facilities
    console.log('5. Tạo Facilities...');
    const facilities = await Facility.insertMany([
      {
        vendor_id: userMap['vinpearl.vendor@travelio.com']._id,
        type: 'HOTEL',
        name: 'Vinpearl Resort & Spa Phú Quốc',
        address: 'Bãi Dài, Xã Gành Dầu',
        city: 'Phú Quốc',
        description: 'Khu nghỉ dưỡng 5 sao sang trọng bậc nhất đảo ngọc với bãi biển riêng và hồ bơi vô cực khổng lồ.',
        commission_rate: 12.5,
        status: 'ACTIVE'
      },
      {
        vendor_id: userMap['sunworld.vendor@travelio.com']._id,
        type: 'ATTRACTION',
        name: 'Sun World Ba Na Hills Đà Nẵng',
        address: 'Thôn An Sơn, Xã Hòa Ninh, Huyện Hòa Vang',
        city: 'Đà Nẵng',
        description: 'Tổ hợp công viên giải trí hàng đầu Việt Nam với Cầu Vàng nổi tiếng, Làng Pháp và khí hậu 4 mùa trong 1 ngày.',
        commission_rate: 10.0,
        status: 'ACTIVE'
      }
    ]);

    // 6. Facility Images
    console.log('6. Tạo Facility Images...');
    await FacilityImage.insertMany([
      {
        facility_id: facilities[0]._id,
        image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
        is_primary: true
      },
      {
        facility_id: facilities[0]._id,
        image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
        is_primary: false
      },
      {
        facility_id: facilities[1]._id,
        image_url: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=1200&q=80',
        is_primary: true
      },
      {
        facility_id: facilities[1]._id,
        image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        is_primary: false
      }
    ]);

    // 7. Facility Amenities
    console.log('7. Tạo Facility Amenities...');
    await FacilityAmenity.insertMany([
      { facility_id: facilities[0]._id, amenity_id: amenityMap['Hồ bơi vô cực'] },
      { facility_id: facilities[0]._id, amenity_id: amenityMap['Buffet sáng quốc tế'] },
      { facility_id: facilities[0]._id, amenity_id: amenityMap['Phòng Gym & Yoga'] },
      { facility_id: facilities[0]._id, amenity_id: amenityMap['Spa & Xông hơi'] },
      { facility_id: facilities[1]._id, amenity_id: amenityMap['Cáp treo khứ hồi'] },
      { facility_id: facilities[1]._id, amenity_id: amenityMap['Bữa trưa Buffet tại đỉnh'] },
      { facility_id: facilities[1]._id, amenity_id: amenityMap['Hướng dẫn viên song ngữ'] }
    ]);

    // 8. Services
    console.log('8. Tạo Services...');
    const services = await Service.insertMany([
      {
        facility_id: facilities[0]._id,
        type: 'ROOM',
        name: 'Deluxe Hướng Biển (Ocean View King)',
        description: 'Phòng 42m2 view ngắm hoàng hôn, giường King êm ái, bồn tắm nằm cao cấp.',
        capacity: 2,
        base_price: 2600000
      },
      {
        facility_id: facilities[0]._id,
        type: 'ROOM',
        name: 'Villa 3 Phòng Ngủ Có Hồ Bơi Riêng',
        description: 'Biệt thự 350m2 sát biển, 3 phòng ngủ tiện nghi, phòng khách và hồ bơi ngoài trời riêng biệt.',
        capacity: 6,
        base_price: 8500000
      },
      {
        facility_id: facilities[1]._id,
        type: 'TICKET',
        name: 'Combo Vé Cáp Treo + Buffet Trưa (Người lớn)',
        description: 'Bao gồm vé cáp treo khứ hồi, check-in Cầu Vàng, Làng Pháp và thưởng thức Buffet 100 món quốc tế.',
        capacity: 1,
        base_price: 1150000
      },
      {
        facility_id: facilities[1]._id,
        type: 'TICKET',
        name: 'Combo Vé Cáp Treo + Buffet Trưa (Trẻ em 1m - 1m4)',
        description: 'Vé trọn gói dành riêng cho trẻ em từ 1m đến 1m4.',
        capacity: 1,
        base_price: 850000
      }
    ]);

    // 9. Service Inventory
    console.log('9. Tạo Service Inventory...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    const inventories = await ServiceInventory.insertMany([
      {
        service_id: services[0]._id,
        target_date: today,
        time_slot: 'STANDARD_CHECKIN',
        available_qty: 8,
        price: 2600000
      },
      {
        service_id: services[0]._id,
        target_date: tomorrow,
        time_slot: 'STANDARD_CHECKIN',
        available_qty: 10,
        price: 2600000
      },
      {
        service_id: services[1]._id,
        target_date: today,
        time_slot: 'STANDARD_CHECKIN',
        available_qty: 3,
        price: 8500000
      },
      {
        service_id: services[2]._id,
        target_date: today,
        time_slot: 'MORNING_SLOT_0800',
        available_qty: 200,
        price: 1150000
      },
      {
        service_id: services[2]._id,
        target_date: tomorrow,
        time_slot: 'MORNING_SLOT_0800',
        available_qty: 250,
        price: 1150000
      },
      {
        service_id: services[3]._id,
        target_date: today,
        time_slot: 'MORNING_SLOT_0800',
        available_qty: 150,
        price: 850000
      }
    ]);

    // 10. Promotions
    console.log('10. Tạo Promotions...');
    const promotions = await Promotion.insertMany([
      {
        code: 'TRAVELIO2026',
        discount_type: 'PERCENTAGE',
        discount_value: 10,
        max_discount: 500000,
        valid_from: new Date('2026-01-01'),
        valid_to: new Date('2026-12-31'),
        usage_limit: 1000,
        status: 'ACTIVE'
      },
      {
        code: 'VOUCHER100K',
        discount_type: 'FIXED',
        discount_value: 100000,
        max_discount: 100000,
        valid_from: new Date('2026-01-01'),
        valid_to: new Date('2026-12-31'),
        usage_limit: 500,
        status: 'ACTIVE'
      }
    ]);

    // 11. Bookings
    console.log('11. Tạo Bookings...');
    const bookings = await Booking.insertMany([
      {
        booking_code: 'BK-TVL-2026-001',
        customer_id: userMap['trungquan2904@gmail.com']._id,
        guest_name: 'Trần Trung Quân',
        guest_email: 'trungquan2904@gmail.com',
        guest_phone: '0933221100',
        promotion_id: promotions[0]._id,
        total_amount: 2600000,
        final_amount: 2340000, // giảm 10% (260k)
        status: 'CONFIRMED',
        decided_by: userMap['manager@travelio.com']._id,
        decision_note: 'Hệ thống tự động duyệt thanh toán trực tuyến',
        decided_at: new Date()
      },
      {
        booking_code: 'BK-TVL-2026-002',
        customer_id: userMap['minhhoang.travel@gmail.com']._id,
        guest_name: 'Lê Minh Hoàng',
        guest_email: 'minhhoang.travel@gmail.com',
        guest_phone: '0944556677',
        promotion_id: promotions[1]._id,
        total_amount: 2000000,
        final_amount: 1900000, // giảm 100k
        status: 'COMPLETED',
        decided_by: userMap['manager@travelio.com']._id,
        decision_note: 'Đã hoàn tất trải nghiệm',
        decided_at: new Date()
      }
    ]);

    // 12. Booking Details
    console.log('12. Tạo Booking Details...');
    const bookingDetails = await BookingDetail.insertMany([
      {
        booking_id: bookings[0]._id,
        inventory_id: inventories[0]._id,
        quantity: 1,
        unit_price: 2600000,
        commission_rate: 12.5,
        commission_amount: 325000,
        qr_code: 'QR-TVL-001-DELUXE',
        check_in_status: 'PENDING'
      },
      {
        booking_id: bookings[1]._id,
        inventory_id: inventories[3]._id,
        quantity: 1,
        unit_price: 1150000,
        commission_rate: 10.0,
        commission_amount: 115000,
        qr_code: 'QR-TVL-002-TICKET-ADULT',
        check_in_status: 'CHECKED_IN'
      },
      {
        booking_id: bookings[1]._id,
        inventory_id: inventories[5]._id,
        quantity: 1,
        unit_price: 850000,
        commission_rate: 10.0,
        commission_amount: 85000,
        qr_code: 'QR-TVL-002-TICKET-CHILD',
        check_in_status: 'CHECKED_IN'
      }
    ]);

    // 13. Payments
    console.log('13. Tạo Payments...');
    await Payment.insertMany([
      {
        booking_id: bookings[0]._id,
        transaction_id: 'VNP-20261001-098273',
        payment_gateway: 'VNPAY',
        amount: 2340000,
        status: 'SUCCESS',
        payment_date: new Date()
      },
      {
        booking_id: bookings[1]._id,
        transaction_id: 'MOMO-20261001-554433',
        payment_gateway: 'MOMO',
        amount: 1900000,
        status: 'SUCCESS',
        payment_date: new Date()
      }
    ]);

    // 14. Reviews
    console.log('14. Tạo Reviews...');
    await Review.insertMany([
      {
        booking_id: bookings[1]._id,
        facility_id: facilities[1]._id,
        customer_id: userMap['minhhoang.travel@gmail.com']._id,
        rating: 5,
        comment: 'Cảnh sắc Bà Nà Hills tuyệt đẹp, thời tiết se lạnh như châu Âu, buffet trưa rất phong phú!',
        vendor_reply: 'Sun World chân thành cảm ơn anh Hoàng, rất hân hạnh được đón tiếp gia đình anh lần tới!'
      }
    ]);

    // 15. Loyalty Point Transactions
    console.log('15. Tạo Loyalty Point Transactions...');
    await LoyaltyPointTransaction.insertMany([
      {
        user_id: userMap['trungquan2904@gmail.com']._id,
        booking_id: bookings[0]._id,
        points: 234, // 10% giá trị quy đổi
        reason: 'Tích lũy điểm từ đơn đặt phòng Vinpearl BK-TVL-2026-001'
      },
      {
        user_id: userMap['minhhoang.travel@gmail.com']._id,
        booking_id: bookings[1]._id,
        points: 120,
        reason: 'Tích lũy điểm từ chuyến đi Sun World Ba Na Hills'
      }
    ]);

    // 16. Support Tickets
    console.log('16. Tạo Support Tickets...');
    await SupportTicket.insertMany([
      {
        booking_id: bookings[0]._id,
        created_by: userMap['trungquan2904@gmail.com']._id,
        assigned_manager_id: userMap['manager@travelio.com']._id,
        issue_type: 'OTHER',
        description: 'Yêu cầu hỗ trợ phòng tầng cao không hút thuốc và check-in sớm 1 tiếng.',
        status: 'RESOLVED'
      }
    ]);

    // 17. Notifications
    console.log('17. Tạo Notifications...');
    await Notification.insertMany([
      {
        user_id: userMap['trungquan2904@gmail.com']._id,
        title: 'Đặt phòng thành công!',
        message: 'Đơn đặt phòng BK-TVL-2026-001 tại Vinpearl Resort & Spa Phú Quốc đã được xác nhận.',
        type: 'BOOKING',
        is_read: false
      },
      {
        user_id: userMap['minhhoang.travel@gmail.com']._id,
        title: 'Ưu đãi hè rực rỡ từ Travelio',
        message: 'Nhập mã TRAVELIO2026 để nhận ưu đãi giảm giá lên tới 500.000đ cho chuyến đi tiếp theo.',
        type: 'PROMOTION',
        is_read: true
      }
    ]);

    // 18. Payouts
    console.log('18. Tạo Payouts...');
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const payouts = await Payout.insertMany([
      {
        vendor_id: userMap['sunworld.vendor@travelio.com']._id,
        manager_id: userMap['manager@travelio.com']._id,
        amount: 1800000, // tiền sau khi trừ hoa hồng
        status: 'PAID',
        period_start: periodStart,
        period_end: periodEnd
      }
    ]);

    // 19. Payout Details
    console.log('19. Tạo Payout Details...');
    await PayoutDetail.insertMany([
      {
        payout_id: payouts[0]._id,
        booking_detail_id: bookingDetails[1]._id,
        amount: 1035000 // 1.150.000 - 10%
      },
      {
        payout_id: payouts[0]._id,
        booking_detail_id: bookingDetails[2]._id,
        amount: 765000 // 850.000 - 10%
      }
    ]);

    // 20. System Configs
    console.log('20. Tạo System Configs...');
    await SystemConfig.insertMany([
      {
        config_key: 'PLATFORM_NAME',
        config_value: 'Travelio - Đặt Phòng Khách Sạn & Vé Du Lịch',
        description: 'Tên hiển thị thương hiệu nền tảng'
      },
      {
        config_key: 'SUPPORT_HOTLINE',
        config_value: '1900 6868',
        description: 'Số hotline tổng đài chăm sóc khách hàng 24/7'
      },
      {
        config_key: 'DEFAULT_CURRENCY',
        config_value: 'VND',
        description: 'Đơn vị tiền tệ chính thanh toán trên hệ thống'
      },
      {
        config_key: 'COMMISSION_RATE_DEFAULT',
        config_value: '10.0',
        description: 'Tỷ lệ chiết khấu hoa hồng mặc định (%) cho đối tác mới'
      }
    ]);

    // 21. Audit Logs
    console.log('21. Tạo Audit Logs...');
    await AuditLog.insertMany([
      {
        user_id: userMap['admin@travelio.com']._id,
        action: 'INIT_SYSTEM_MOCK_DATA',
        table_name: 'system_configs',
        record_id: users[0]._id,
        old_data: null,
        new_data: { status: 'INITIALIZED', timestamp: new Date() }
      },
      {
        user_id: userMap['manager@travelio.com']._id,
        action: 'APPROVE_VENDOR_FACILITY',
        table_name: 'facilities',
        record_id: facilities[0]._id,
        old_data: { status: 'PENDING' },
        new_data: { status: 'ACTIVE' }
      }
    ]);

    console.log('\n🎉 Hoàn thành nạp dữ liệu Mock Data cho toàn bộ 21 collections!');

    // In thống kê kết quả nạp
    console.log('\n📊 THỐNG KÊ DỮ LIỆU ĐÃ NẠP TRÊN MONGO ATLAS:');
    for (const [name, model] of Object.entries(models)) {
      const count = await model.countDocuments();
      console.log(`  - ${name.padEnd(25)} (${model.collection.name.padEnd(28)}): ${count} records`);
    }

    await mongoose.disconnect();
    console.log('\n🔌 Đã ngắt kết nối an toàn.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi trong quá trình nạp mock data:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedData();
