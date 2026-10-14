const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const models = require('../src/models');
const service = require('../src/services/attraction.service');

const vendor = { id: '507f1f77bcf86cd799439011', role: 'ACTIVITY_VENDOR' };
const facilityId = '507f1f77bcf86cd799439012';
const ticketId = '507f1f77bcf86cd799439013';
const inventoryId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439014');
const facilityPayload = { name: 'Tour Hội An', city: 'Đà Nẵng', address: 'Điểm tập trung', attraction_category: 'TOUR' };
const inventoryPayload = { target_date: '2026-10-20', time_slot: 'ALL_DAY', total_qty: 100, price: 200000 };

afterEach(() => mock.restoreAll());

function ownTicket() {
  mock.method(models.Service, 'findOne', async () => ({ _id: ticketId, facility_id: facilityId, type: 'TICKET' }));
  mock.method(models.Facility, 'findOne', async (filter) => {
    assert.equal(filter.vendor_id, vendor.id);
    assert.equal(filter.type, 'ATTRACTION');
    return { _id: facilityId };
  });
}

test('tạo tour gán chủ sở hữu từ tài khoản, bỏ qua vendor_id trong payload', async () => {
  mock.method(models.Facility, 'create', async (payload) => payload);
  const result = await service.createAttraction(vendor, { ...facilityPayload, vendor_id: facilityId, commission_rate: 100 });
  assert.equal(result.vendor_id, vendor.id);
  assert.equal(result.type, 'ATTRACTION');
  assert.equal(result.attraction_category, 'TOUR');
  assert.equal(result.commission_rate, undefined);
});

test('cơ sở thiếu địa chỉ hoặc tên chỉ chứa khoảng trắng bị từ chối', async () => {
  await assert.rejects(service.createAttraction(vendor, { ...facilityPayload, address: '' }), { statusCode: 400 });
  await assert.rejects(service.createAttraction(vendor, { ...facilityPayload, name: '   ' }), { statusCode: 400 });
});

test('không thể sửa cơ sở của vendor khác', async () => {
  mock.method(models.Facility, 'findOne', async () => null);
  await assert.rejects(service.updateAttraction(vendor, facilityId, facilityPayload), { statusCode: 404 });
});

test('hạng vé trẻ em có thể miễn phí và luôn là TICKET', async () => {
  mock.method(models.Facility, 'findOne', async () => ({ _id: facilityId }));
  mock.method(models.Service, 'create', async (payload) => payload);
  const result = await service.createTicket(vendor, facilityId, { name: 'Vé trẻ em', ticket_audience: 'CHILD', base_price: 0, type: 'ROOM' });
  assert.equal(result.base_price, 0);
  assert.equal(result.ticket_audience, 'CHILD');
  assert.equal(result.type, 'TICKET');
});

test('giá âm, rỗng, vô hạn và đối tượng vé không hợp lệ bị từ chối', async () => {
  mock.method(models.Facility, 'findOne', async () => ({ _id: facilityId }));
  for (const price of [-1, '', Infinity, null, true]) {
    await assert.rejects(service.createTicket(vendor, facilityId, { name: 'Vé', ticket_audience: 'ADULT', base_price: price }), { statusCode: 400 });
  }
  await assert.rejects(service.createTicket(vendor, facilityId, { name: 'Vé', ticket_audience: 'UNKNOWN', base_price: 100 }), { statusCode: 400 });
});

test('không thể quản lý tồn kho của vendor khác', async () => {
  mock.method(models.Service, 'findOne', async () => ({ facility_id: facilityId }));
  mock.method(models.Facility, 'findOne', async () => null);
  await assert.rejects(service.saveInventory(vendor, ticketId, inventoryPayload), { statusCode: 404 });
});

test('tạo lịch bán lưu đúng giá và tổng hạn mức', async () => {
  ownTicket();
  mock.method(models.ServiceInventory, 'findOne', async () => null);
  mock.method(models.ServiceInventory, 'create', async (payload) => payload);
  const result = await service.saveInventory(vendor, ticketId, inventoryPayload);
  assert.equal(result.available_qty, 100);
  assert.equal(result.total_qty, 100);
  assert.equal(result.price, 200000);
  assert.equal(result.target_date.toISOString(), '2026-10-20T00:00:00.000Z');
});

test('ngày không tồn tại, khung giờ sai và hạn mức không nguyên bị từ chối', async () => {
  ownTicket();
  for (const patch of [{ target_date: '2026-02-30' }, { target_date: '2026-2-3' }, { time_slot: '25:00' }, { total_qty: 1.5 }, { total_qty: -1 }, { price: '' }]) {
    await assert.rejects(service.saveInventory(vendor, ticketId, { ...inventoryPayload, ...patch }), { statusCode: 400 });
  }
});

test('tăng hạn mức giữ nguyên vé đã đặt, không đặt lại available_qty bằng tổng', async () => {
  ownTicket();
  mock.method(models.ServiceInventory, 'findOne', async () => ({ _id: inventoryId, total_qty: 100, available_qty: 70, price: 200000 }));
  mock.method(models.BookingDetail, 'aggregate', async () => [{ _id: inventoryId, quantity: 30 }]);
  mock.method(models.ServiceInventory, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter.available_qty, 70);
    assert.equal(filter.total_qty, 100);
    return update.$set;
  });
  const result = await service.saveInventory(vendor, ticketId, { ...inventoryPayload, total_qty: 120 });
  assert.equal(result.total_qty, 120);
  assert.equal(result.available_qty, 90);
});

test('không thể giảm hạn mức dưới số vé đã đặt', async () => {
  ownTicket();
  mock.method(models.ServiceInventory, 'findOne', async () => ({ _id: inventoryId, total_qty: 100, available_qty: 70 }));
  mock.method(models.BookingDetail, 'aggregate', async () => [{ _id: inventoryId, quantity: 30 }]);
  await assert.rejects(service.saveInventory(vendor, ticketId, { ...inventoryPayload, total_qty: 29 }), { statusCode: 409 });
});

test('dữ liệu tồn kho cũ không có total_qty vẫn giữ vé đã đặt', async () => {
  ownTicket();
  mock.method(models.ServiceInventory, 'findOne', async () => ({ _id: inventoryId, available_qty: 70, price: 200000 }));
  mock.method(models.BookingDetail, 'aggregate', async () => [{ _id: inventoryId, quantity: 30 }]);
  mock.method(models.ServiceInventory, 'findOneAndUpdate', async (filter, update) => {
    assert.deepEqual(filter.total_qty, { $exists: false });
    return update.$set;
  });
  const result = await service.saveInventory(vendor, ticketId, inventoryPayload);
  assert.equal(result.available_qty, 70);
});

test('từ chối cập nhật khi tồn kho bị thay đổi đồng thời', async () => {
  ownTicket();
  mock.method(models.ServiceInventory, 'findOne', async () => ({ _id: inventoryId, available_qty: 100, total_qty: 100, price: 200000 }));
  mock.method(models.BookingDetail, 'aggregate', async () => []);
  mock.method(models.ServiceInventory, 'findOneAndUpdate', async () => null);
  await assert.rejects(service.saveInventory(vendor, ticketId, inventoryPayload), { statusCode: 409 });
});

test('lịch bán trùng do thao tác đồng thời trả lỗi 409', async () => {
  ownTicket();
  mock.method(models.ServiceInventory, 'findOne', async () => null);
  mock.method(models.ServiceInventory, 'create', async () => { throw { code: 11000 }; });
  await assert.rejects(service.saveInventory(vendor, ticketId, inventoryPayload), { statusCode: 409 });
});

test('khoảng ngày ngược hoặc quá dài bị từ chối', async () => {
  ownTicket();
  await assert.rejects(service.listInventory(vendor, ticketId, { from: '2026-10-21', to: '2026-10-20' }), { statusCode: 400 });
  await assert.rejects(service.listInventory(vendor, ticketId, { from: '2026-01-01', to: '2027-12-31' }), { statusCode: 400 });
});

test('sửa lịch cũ theo id giữ nguyên timestamp và không tạo lịch trùng', async () => {
  ownTicket();
  mock.method(models.ServiceInventory, 'findOne', async (filter) => {
    assert.equal(filter.service_id, ticketId);
    assert.equal(filter._id, String(inventoryId));
    return { _id: inventoryId, target_date: new Date('2026-10-20T17:00:00Z'), time_slot: 'ALL_DAY', available_qty: 70, price: 200000 };
  });
  mock.method(models.BookingDetail, 'aggregate', async () => [{ _id: inventoryId, quantity: 30 }]);
  mock.method(models.ServiceInventory, 'findOneAndUpdate', async (filter, update) => update.$set);
  const create = mock.method(models.ServiceInventory, 'create', async () => { throw new Error('Không tạo lịch trùng'); });
  const result = await service.saveInventory(vendor, ticketId, { ...inventoryPayload, inventory_id: String(inventoryId) });
  assert.equal(result.available_qty, 70);
  assert.equal(result.target_date, undefined);
  assert.equal(create.mock.callCount(), 0);
});

test('id tồn kho của hạng vé khác không được cập nhật', async () => {
  ownTicket();
  mock.method(models.ServiceInventory, 'findOne', async () => null);
  await assert.rejects(service.saveInventory(vendor, ticketId, { ...inventoryPayload, inventory_id: String(inventoryId) }), { statusCode: 404 });
});
