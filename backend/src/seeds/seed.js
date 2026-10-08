const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const models = require('../models');
const { hashPassword } = require('../utils/password');
const env = require('../configs/env');

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
    console.log('ðŸš€ Äang káº¿t ná»‘i tá»›i MongoDB Atlas...');
    await mongoose.connect(env.mongoUri);
    console.log('âœ… ÄÃ£ káº¿t ná»‘i thÃ nh cÃ´ng tá»›i:', mongoose.connection.host);

    console.log('ðŸ§¹ Báº¯t Ä‘áº§u dá»n dáº¹p dá»¯ liá»‡u cÅ© trÃªn registered model collections...');
    // Clear every registered model collection before reseeding.
    for (const [name, model] of Object.entries(models)) {
      await model.deleteMany({});
      console.log(`  - ÄÃ£ lÃ m sáº¡ch: ${model.collection.name}`);
    }

    console.log('\nðŸŒ± Báº¯t Ä‘áº§u náº¡p dá»¯ liá»‡u Mock Data...');

    // 1. Roles
    console.log('1. Táº¡o Roles...');
    const roles = await Role.insertMany([
      { role_name: 'ADMIN', description: 'Quáº£n trá»‹ viÃªn toÃ n há»‡ thá»‘ng' },
      { role_name: 'MANAGER', description: 'Quáº£n lÃ½ váº­n hÃ nh vÃ  há»— trá»£ khÃ¡ch hÃ ng' },
      { role_name: 'HOTEL_OWNER', description: 'Chá»§ sá»Ÿ há»¯u / Quáº£n lÃ½ khÃ¡ch sáº¡n & cÆ¡ sá»Ÿ lÆ°u trÃº' },
      { role_name: 'ACTIVITY_VENDOR', description: 'NhÃ  cung cáº¥p vÃ© tham quan, tour & hoáº¡t Ä‘á»™ng vui chÆ¡i giáº£i trÃ­' },
      { role_name: 'CUSTOMER', description: 'KhÃ¡ch hÃ ng sá»­ dá»¥ng dá»‹ch vá»¥' }
    ]);
    const roleMap = {};
    roles.forEach((r) => {
      roleMap[r.role_name] = r._id;
    });

    // 2. Users
    console.log('2. Táº¡o Users...');
    const seedPasswordHash = await hashPassword('Travelio@123');
    const users = await User.insertMany([
      {
        email: 'admin@travelio.com',
        password_hash: seedPasswordHash,
        full_name: 'Admin Travelio',
        phone: '0901234567',
        role_id: roleMap['ADMIN'],
        total_loyalty_points: 0,
        status: 'ACTIVE'
      },
      {
        email: 'manager@travelio.com',
        password_hash: seedPasswordHash,
        full_name: 'Nguyá»…n VÄƒn Quáº£n LÃ½',
        phone: '0912345678',
        role_id: roleMap['MANAGER'],
        total_loyalty_points: 0,
        status: 'ACTIVE'
      },
      {
        email: 'vinpearl.vendor@travelio.com',
        password_hash: seedPasswordHash,
        full_name: 'Vinpearl PhÃº Quá»‘c Partner',
        phone: '0987654321',
        role_id: roleMap['HOTEL_OWNER'],
        total_loyalty_points: 0,
        status: 'ACTIVE'
      },
      {
        email: 'sunworld.vendor@travelio.com',
        password_hash: seedPasswordHash,
        full_name: 'Sun World Ba Na Hills Partner',
        phone: '0977889900',
        role_id: roleMap['ACTIVITY_VENDOR'],
        total_loyalty_points: 0,
        status: 'ACTIVE'
      },
      {
        email: 'trungquan2904@gmail.com',
        password_hash: seedPasswordHash,
        full_name: 'Tráº§n Trung QuÃ¢n',
        phone: '0933221100',
        role_id: roleMap['CUSTOMER'],
        total_loyalty_points: 350,
        status: 'ACTIVE'
      },
      {
        email: 'minhhoang.travel@gmail.com',
        password_hash: seedPasswordHash,
        full_name: 'LÃª Minh HoÃ ng',
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
    console.log('3. Táº¡o User Profiles...');
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
    console.log('4. Táº¡o Amenities...');
    const amenities = await Amenity.insertMany([
      // ROOM_FEATURE
      { name: 'Wifi tá»‘c Ä‘á»™ cao', icon_url: 'https://cdn-icons-png.flaticon.com/512/93/93158.png', type: 'ROOM_FEATURE' },
      { name: 'Äiá»u hÃ²a 2 chiá»u', icon_url: 'https://cdn-icons-png.flaticon.com/512/911/911409.png', type: 'ROOM_FEATURE' },
      { name: 'Bá»“n táº¯m view biá»ƒn', icon_url: 'https://cdn-icons-png.flaticon.com/512/2855/2855523.png', type: 'ROOM_FEATURE' },
      { name: 'Ban cÃ´ng ngáº¯m hoÃ ng hÃ´n', icon_url: 'https://cdn-icons-png.flaticon.com/512/2149/2149957.png', type: 'ROOM_FEATURE' },
      // HOTEL_FACILITY
      { name: 'Há»“ bÆ¡i vÃ´ cá»±c', icon_url: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png', type: 'HOTEL_FACILITY' },
      { name: 'Buffet sÃ¡ng quá»‘c táº¿', icon_url: 'https://cdn-icons-png.flaticon.com/512/3480/3480823.png', type: 'HOTEL_FACILITY' },
      { name: 'PhÃ²ng Gym & Yoga', icon_url: 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png', type: 'HOTEL_FACILITY' },
      { name: 'Spa & XÃ´ng hÆ¡i', icon_url: 'https://cdn-icons-png.flaticon.com/512/1940/1940922.png', type: 'HOTEL_FACILITY' },
      // ATTRACTION_SERVICE
      { name: 'CÃ¡p treo khá»© há»“i', icon_url: 'https://cdn-icons-png.flaticon.com/512/1000/1000946.png', type: 'ATTRACTION_SERVICE' },
      { name: 'HÆ°á»›ng dáº«n viÃªn song ngá»¯', icon_url: 'https://cdn-icons-png.flaticon.com/512/1995/1995574.png', type: 'ATTRACTION_SERVICE' },
      { name: 'Bá»¯a trÆ°a Buffet táº¡i Ä‘á»‰nh', icon_url: 'https://cdn-icons-png.flaticon.com/512/1046/1046751.png', type: 'ATTRACTION_SERVICE' },
      { name: 'Xe Ä‘iá»‡n trung chuyá»ƒn', icon_url: 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', type: 'ATTRACTION_SERVICE' }
    ]);
    const amenityMap = {};
    amenities.forEach((a) => {
      amenityMap[a.name] = a._id;
    });

    // 5. Facilities
    console.log('5. Táº¡o Facilities...');
    const facilities = await Facility.insertMany([
      {
        vendor_id: userMap['vinpearl.vendor@travelio.com']._id,
        type: 'HOTEL',
        name: 'Vinpearl Resort & Spa PhÃº Quá»‘c',
        address: 'BÃ£i DÃ i, XÃ£ GÃ nh Dáº§u',
        city: 'PhÃº Quá»‘c',
        description: 'Khu nghá»‰ dÆ°á»¡ng 5 sao sang trá»ng báº­c nháº¥t Ä‘áº£o ngá»c vá»›i bÃ£i biá»ƒn riÃªng vÃ  há»“ bÆ¡i vÃ´ cá»±c khá»•ng lá»“.',
        commission_rate: 12.5,
        status: 'ACTIVE'
      },
      {
        vendor_id: userMap['sunworld.vendor@travelio.com']._id,
        type: 'ATTRACTION',
        name: 'Sun World Ba Na Hills ÄÃ  Náºµng',
        address: 'ThÃ´n An SÆ¡n, XÃ£ HÃ²a Ninh, Huyá»‡n HÃ²a Vang',
        city: 'ÄÃ  Náºµng',
        description: 'Tá»• há»£p cÃ´ng viÃªn giáº£i trÃ­ hÃ ng Ä‘áº§u Viá»‡t Nam vá»›i Cáº§u VÃ ng ná»•i tiáº¿ng, LÃ ng PhÃ¡p vÃ  khÃ­ háº­u 4 mÃ¹a trong 1 ngÃ y.',
        commission_rate: 10.0,
        status: 'ACTIVE'
      }
    ]);

    // 6. Facility Images
    console.log('6. Táº¡o Facility Images...');
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
    console.log('7. Táº¡o Facility Amenities...');
    await FacilityAmenity.insertMany([
      { facility_id: facilities[0]._id, amenity_id: amenityMap['Há»“ bÆ¡i vÃ´ cá»±c'] },
      { facility_id: facilities[0]._id, amenity_id: amenityMap['Buffet sÃ¡ng quá»‘c táº¿'] },
      { facility_id: facilities[0]._id, amenity_id: amenityMap['PhÃ²ng Gym & Yoga'] },
      { facility_id: facilities[0]._id, amenity_id: amenityMap['Spa & XÃ´ng hÆ¡i'] },
      { facility_id: facilities[1]._id, amenity_id: amenityMap['CÃ¡p treo khá»© há»“i'] },
      { facility_id: facilities[1]._id, amenity_id: amenityMap['Bá»¯a trÆ°a Buffet táº¡i Ä‘á»‰nh'] },
      { facility_id: facilities[1]._id, amenity_id: amenityMap['HÆ°á»›ng dáº«n viÃªn song ngá»¯'] }
    ]);

    // 8. Services
    console.log('8. Táº¡o Services...');
    const services = await Service.insertMany([
      {
        facility_id: facilities[0]._id,
        type: 'ROOM',
        name: 'Deluxe HÆ°á»›ng Biá»ƒn (Ocean View King)',
        description: 'PhÃ²ng 42m2 view ngáº¯m hoÃ ng hÃ´n, giÆ°á»ng King Ãªm Ã¡i, bá»“n táº¯m náº±m cao cáº¥p.',
        capacity: 2,
        base_price: 2600000
      },
      {
        facility_id: facilities[0]._id,
        type: 'ROOM',
        name: 'Villa 3 PhÃ²ng Ngá»§ CÃ³ Há»“ BÆ¡i RiÃªng',
        description: 'Biá»‡t thá»± 350m2 sÃ¡t biá»ƒn, 3 phÃ²ng ngá»§ tiá»‡n nghi, phÃ²ng khÃ¡ch vÃ  há»“ bÆ¡i ngoÃ i trá»i riÃªng biá»‡t.',
        capacity: 6,
        base_price: 8500000
      },
      {
        facility_id: facilities[1]._id,
        type: 'TICKET',
        name: 'Combo VÃ© CÃ¡p Treo + Buffet TrÆ°a (NgÆ°á»i lá»›n)',
        description: 'Bao gá»“m vÃ© cÃ¡p treo khá»© há»“i, check-in Cáº§u VÃ ng, LÃ ng PhÃ¡p vÃ  thÆ°á»Ÿng thá»©c Buffet 100 mÃ³n quá»‘c táº¿.',
        capacity: 1,
        base_price: 1150000
      },
      {
        facility_id: facilities[1]._id,
        type: 'TICKET',
        name: 'Combo VÃ© CÃ¡p Treo + Buffet TrÆ°a (Tráº» em 1m - 1m4)',
        description: 'VÃ© trá»n gÃ³i dÃ nh riÃªng cho tráº» em tá»« 1m Ä‘áº¿n 1m4.',
        capacity: 1,
        base_price: 850000
      }
    ]);

    // 9. Service Inventory
    console.log('9. Táº¡o Service Inventory...');
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
    console.log('10. Táº¡o Promotions...');
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
    console.log('11. Táº¡o Bookings...');
    const bookings = await Booking.insertMany([
      {
        booking_code: 'BK-TVL-2026-001',
        customer_id: userMap['trungquan2904@gmail.com']._id,
        guest_name: 'Tráº§n Trung QuÃ¢n',
        guest_email: 'trungquan2904@gmail.com',
        guest_phone: '0933221100',
        promotion_id: promotions[0]._id,
        total_amount: 2600000,
        final_amount: 2340000, // giáº£m 10% (260k)
        status: 'CONFIRMED',
        decided_by: userMap['manager@travelio.com']._id,
        decision_note: 'Há»‡ thá»‘ng tá»± Ä‘á»™ng duyá»‡t thanh toÃ¡n trá»±c tuyáº¿n',
        decided_at: new Date()
      },
      {
        booking_code: 'BK-TVL-2026-002',
        customer_id: userMap['minhhoang.travel@gmail.com']._id,
        guest_name: 'LÃª Minh HoÃ ng',
        guest_email: 'minhhoang.travel@gmail.com',
        guest_phone: '0944556677',
        promotion_id: promotions[1]._id,
        total_amount: 2000000,
        final_amount: 1900000, // giáº£m 100k
        status: 'COMPLETED',
        decided_by: userMap['manager@travelio.com']._id,
        decision_note: 'ÄÃ£ hoÃ n táº¥t tráº£i nghiá»‡m',
        decided_at: new Date()
      }
    ]);

    // 12. Booking Details
    console.log('12. Táº¡o Booking Details...');
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
    console.log('13. Táº¡o Payments...');
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
    console.log('14. Táº¡o Reviews...');
    await Review.insertMany([
      {
        booking_id: bookings[1]._id,
        facility_id: facilities[1]._id,
        customer_id: userMap['minhhoang.travel@gmail.com']._id,
        rating: 5,
        comment: 'Cáº£nh sáº¯c BÃ  NÃ  Hills tuyá»‡t Ä‘áº¹p, thá»i tiáº¿t se láº¡nh nhÆ° chÃ¢u Ã‚u, buffet trÆ°a ráº¥t phong phÃº!',
        vendor_reply: 'Sun World chÃ¢n thÃ nh cáº£m Æ¡n anh HoÃ ng, ráº¥t hÃ¢n háº¡nh Ä‘Æ°á»£c Ä‘Ã³n tiáº¿p gia Ä‘Ã¬nh anh láº§n tá»›i!'
      }
    ]);

    // 15. Loyalty Point Transactions
    console.log('15. Táº¡o Loyalty Point Transactions...');
    await LoyaltyPointTransaction.insertMany([
      {
        user_id: userMap['trungquan2904@gmail.com']._id,
        booking_id: bookings[0]._id,
        points: 234, // 10% giÃ¡ trá»‹ quy Ä‘á»•i
        reason: 'TÃ­ch lÅ©y Ä‘iá»ƒm tá»« Ä‘Æ¡n Ä‘áº·t phÃ²ng Vinpearl BK-TVL-2026-001'
      },
      {
        user_id: userMap['minhhoang.travel@gmail.com']._id,
        booking_id: bookings[1]._id,
        points: 120,
        reason: 'TÃ­ch lÅ©y Ä‘iá»ƒm tá»« chuyáº¿n Ä‘i Sun World Ba Na Hills'
      }
    ]);

    // 16. Support Tickets
    console.log('16. Táº¡o Support Tickets...');
    await SupportTicket.insertMany([
      {
        booking_id: bookings[0]._id,
        created_by: userMap['trungquan2904@gmail.com']._id,
        assigned_manager_id: userMap['manager@travelio.com']._id,
        issue_type: 'OTHER',
        description: 'YÃªu cáº§u há»— trá»£ phÃ²ng táº§ng cao khÃ´ng hÃºt thuá»‘c vÃ  check-in sá»›m 1 tiáº¿ng.',
        status: 'RESOLVED'
      }
    ]);

    // 17. Notifications
    console.log('17. Táº¡o Notifications...');
    await Notification.insertMany([
      {
        user_id: userMap['trungquan2904@gmail.com']._id,
        title: 'Äáº·t phÃ²ng thÃ nh cÃ´ng!',
        message: 'ÄÆ¡n Ä‘áº·t phÃ²ng BK-TVL-2026-001 táº¡i Vinpearl Resort & Spa PhÃº Quá»‘c Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c nháº­n.',
        type: 'BOOKING',
        is_read: false
      },
      {
        user_id: userMap['minhhoang.travel@gmail.com']._id,
        title: 'Æ¯u Ä‘Ã£i hÃ¨ rá»±c rá»¡ tá»« Travelio',
        message: 'Nháº­p mÃ£ TRAVELIO2026 Ä‘á»ƒ nháº­n Æ°u Ä‘Ã£i giáº£m giÃ¡ lÃªn tá»›i 500.000Ä‘ cho chuyáº¿n Ä‘i tiáº¿p theo.',
        type: 'PROMOTION',
        is_read: true
      }
    ]);

    // 18. Payouts
    console.log('18. Táº¡o Payouts...');
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const payouts = await Payout.insertMany([
      {
        vendor_id: userMap['sunworld.vendor@travelio.com']._id,
        manager_id: userMap['manager@travelio.com']._id,
        amount: 1800000, // tiá»n sau khi trá»« hoa há»“ng
        status: 'PAID',
        period_start: periodStart,
        period_end: periodEnd
      }
    ]);

    // 19. Payout Details
    console.log('19. Táº¡o Payout Details...');
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
    console.log('20. Táº¡o System Configs...');
    await SystemConfig.insertMany([
      {
        config_key: 'PLATFORM_NAME',
        config_value: 'Travelio - Äáº·t PhÃ²ng KhÃ¡ch Sáº¡n & VÃ© Du Lá»‹ch',
        description: 'TÃªn hiá»ƒn thá»‹ thÆ°Æ¡ng hiá»‡u ná»n táº£ng'
      },
      {
        config_key: 'SUPPORT_HOTLINE',
        config_value: '1900 6868',
        description: 'Sá»‘ hotline tá»•ng Ä‘Ã i chÄƒm sÃ³c khÃ¡ch hÃ ng 24/7'
      },
      {
        config_key: 'LOYALTY_POINT_VALUE',
        config_value: '1000',
        description: 'GiÃ¡ trá»‹ tiá»n tá»‡ cá»§a má»—i Ä‘iá»ƒm thÆ°á»Ÿng'
      },
      {
        config_key: 'DEFAULT_CURRENCY',
        config_value: 'VND',
        description: 'ÄÆ¡n vá»‹ tiá»n tá»‡ chÃ­nh thanh toÃ¡n trÃªn há»‡ thá»‘ng'
      },
      {
        config_key: 'COMMISSION_RATE_DEFAULT',
        config_value: '10.0',
        description: 'Tá»· lá»‡ chiáº¿t kháº¥u hoa há»“ng máº·c Ä‘á»‹nh (%) cho Ä‘á»‘i tÃ¡c má»›i'
      }
    ]);

    // 21. Audit Logs
    console.log('21. Táº¡o Audit Logs...');
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

    console.log('\nðŸŽ‰ HoÃ n thÃ nh náº¡p dá»¯ liá»‡u cho toÃ n bá»™ registered model collections!');

    // In thá»‘ng kÃª káº¿t quáº£ náº¡p
    console.log('\nðŸ“Š THá»NG KÃŠ Dá»® LIá»†U ÄÃƒ Náº P TRÃŠN MONGO ATLAS:');
    for (const [name, model] of Object.entries(models)) {
      const count = await model.countDocuments();
      console.log(`  - ${name.padEnd(25)} (${model.collection.name.padEnd(28)}): ${count} records`);
    }

    await mongoose.disconnect();
    console.log('\nðŸ”Œ ÄÃ£ ngáº¯t káº¿t ná»‘i an toÃ n.');
    process.exit(0);
  } catch (err) {
    console.error('âŒ Lá»—i trong quÃ¡ trÃ¬nh náº¡p mock data:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedData();


