const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const voucherUpdates = [
  {
    code: 'WELCOMEHOTEL',
    title: 'Khách hàng mới đặt phòng - Giảm 100.000đ',
    description: 'Ưu đãi đơn đầu tiên khi đặt phòng khách sạn.'
  },
  {
    code: 'WELCOME15',
    title: 'Chào mừng khách hàng mới - Giảm 15%',
    description: 'Mã ưu đãi dành riêng cho khách hàng chưa có đơn hoàn tất.'
  },
  {
    code: 'TVL7377',
    title: 'Chào Hè',
    description: 'Ưu đãi dành cho khách hàng mới khi đặt phòng khách sạn.'
  },
  {
    code: 'TRAVELIOFIX',
    title: 'Travelio toàn sàn - Giảm 100.000đ',
    description: 'Mã giảm cố định áp dụng cho mọi dịch vụ.'
  },
  {
    code: 'HOTELFIX50',
    title: 'Khách sạn - Giảm ngay 50.000đ',
    description: 'Mã giảm cố định cho đơn đặt phòng khách sạn.'
  },
  {
    code: 'TICKETFIX30',
    title: 'Vé tham quan - Giảm 30.000đ',
    description: 'Mã giảm cố định cho các đơn vé tham quan.'
  },
  {
    code: 'TRAVELIO25',
    title: 'Travelio toàn sàn - Giảm 25% không giới hạn trần',
    description: 'Mã phần trăm toàn sàn để demo trường hợp không giới hạn mức giảm tối đa.'
  },
  {
    code: 'HOTEL20',
    title: 'Khách sạn cuối tuần - Giảm 20%',
    description: 'Ưu đãi dành cho các đơn đặt phòng khách sạn.'
  },
  {
    code: 'TVLALL15',
    title: 'Travelio toàn sàn - Giảm 15%',
    description: 'Ưu đãi áp dụng cho mọi đơn đặt phòng và vé tham quan trên Travelio.'
  },
  {
    code: 'TICKET15',
    title: 'Vé tham quan - Giảm 15%',
    description: 'Ưu đãi áp dụng cho vé tham quan và vui chơi.'
  },
  {
    code: 'POINTALL10',
    title: 'Đổi 500 điểm - Giảm 10% toàn sàn',
    description: 'Voucher mẫu để khách hàng đổi bằng điểm thưởng thành viên.'
  },
  {
    code: 'POINTHOTEL',
    title: 'Đổi 1000 điểm - Giảm 200.000đ phòng khách sạn',
    description: 'Voucher đổi điểm dành cho dịch vụ khách sạn.'
  },
  {
    code: 'POINTTICKET',
    title: 'Đổi 750 điểm - Giảm 50.000đ vé tham quan',
    description: 'Voucher đổi điểm dành cho vé tham quan và vui chơi.'
  },
  {
    code: 'TVL2061',
    title: 'Chào Đông',
    description: 'Ưu đãi đổi điểm thưởng vé tham quan.'
  },
  {
    code: 'TRAVELIO2026',
    title: 'Ưu đãi Toàn sàn Chào năm 2026',
    description: 'Ưu đãi giảm 10% áp dụng toàn hệ thống Travelio.'
  },
  {
    code: 'VOUCHER100K',
    title: 'Voucher giảm 100.000 VNĐ',
    description: 'Ưu đãi đặt phòng và tham quan.'
  }
];

async function updateVouchers() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const col = db.collection('promotions');

  let updatedCount = 0;
  for (const item of voucherUpdates) {
    const res = await col.updateOne(
      { code: item.code },
      {
        $set: {
          title: item.title,
          description: item.description
        }
      }
    );
    if (res.matchedCount > 0) {
      updatedCount += 1;
      console.log(`Updated [${item.code}]: "${item.title}"`);
    } else {
      console.log(`Not found [${item.code}]`);
    }
  }

  console.log(`\nDone! Successfully updated ${updatedCount} vouchers in database.`);

  const list = await col.find({}).project({ code: 1, title: 1, description: 1 }).toArray();
  console.log('\n--- VERIFICATION FROM DB ---');
  list.forEach(p => {
    console.log(`- ${p.code}: "${p.title}" | "${p.description || ''}"`);
  });

  await mongoose.disconnect();
}

updateVouchers().catch((err) => {
  console.error('Error updating vouchers:', err);
  process.exit(1);
});
