const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { Booking, Payment, User, Role } = require('../src/models');
const { generateToken } = require('../src/middlewares/authMiddleware');

module.exports = async ({ t, origin, reset, sale, admin, manager, hotel, vendor, customer, room, ticket, october }) => {
  const request = async (path = '/admin/revenue/export', query = { ...october, format: 'xlsx' }, actor = admin) => fetch(`${origin}/api${path}?${new URLSearchParams(query)}`, {
    headers: actor ? { Authorization: `Bearer ${generateToken({ id: String(actor._id), role: 'ADMIN' })}` } : {},
  });
  const read = async (path = '/admin/revenue', query = october, actor = admin) => {
    const response = await request(path, query, actor); assert.equal(response.status, 200); return (await response.json()).data;
  };
  const excel = async response => {
    assert.equal(response.status, 200, `Expected XLSX, got HTTP ${response.status}`);
    assert.equal(response.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await response.arrayBuffer())); return workbook;
  };
  let pdfjs;
  const pdf = async response => {
    assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'application/pdf');
    pdfjs ||= await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = pdfjs.getDocument({ data: new Uint8Array(await response.arrayBuffer()), useSystemFonts: false });
    return { task, document: await task.promise };
  };
  const pageText = async (document, pageNumber) => (await (await document.getPage(pageNumber)).getTextContent()).items.map(item => item.str).join(' ').replace(/\u200b/g, '').replace(/\s+/g, ' ');
  const checkTotals = (workbook, report) => {
    const summary = workbook.getWorksheet('Tổng hợp');
    for (const [row, key] of [[10, 'gross_payments'], [11, 'refunds'], [12, 'net_revenue'], [13, 'platform_commission']]) {
      assert.equal(summary.getCell(`B${row}`).value, report.totals[key] === null ? 'Chưa xác định' : Number(report.totals[key]));
    }
  };
  await t.test('export XLSX includes all 66 receipts, numeric money/dates/rates and exact dashboard totals', async () => {
    await reset();
    for (let i = 0; i < 65; i++) await sale();
    await sale({ status: 'REFUNDED', receipts: [{ status: 'REFUNDED' }] });
    const report = await read(); assert.equal(report.rows.length, 20); assert.equal(report.total, 66);
    const response = await request(undefined, { ...october, format: 'xlsx', page: '2', page_size: '1' });
    assert.match(response.headers.get('content-disposition'), /financial-revenue-2026-10-01-2026-10-31-all\.xlsx/);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const workbook = await excel(response); checkTotals(workbook, report);
    const detail = workbook.getWorksheet('Chi tiết'); assert.equal(detail.rowCount, 68);
    const sum = column => Array.from({ length: 66 }, (_, i) => detail.getRow(i + 2).getCell(column).value).reduce((a, b) => a + b, 0);
    assert.equal(sum(4), Number(report.totals.gross_payments)); assert.equal(sum(5), Number(report.totals.refunds));
    assert.equal(sum(6), Number(report.totals.net_revenue)); assert.equal(sum(8), Number(report.totals.platform_commission));
    assert.ok(detail.getCell('B2').value instanceof Date); assert.equal(detail.getCell('B2').value.getUTCHours(), 0);
    assert.equal(detail.getCell('D2').type, ExcelJS.ValueType.Number); assert.equal(detail.getCell('G2').value, 0.1);
    assert.equal(detail.views[0].ySplit, 1); assert.ok(detail.autoFilter);
    assert.equal(detail.getRow(68).getCell(4).value, Number(report.totals.gross_payments));
  });
  await t.test('PDF opens with Vietnamese font, all rows, repeated table headings and page numbers without clipped columns', async () => {
    await User.updateOne({ _id: hotel._id }, { $set: { full_name: 'Nguyễn Thị Hồng — Đối tác lưu trú' } });
    const report = await read();
    const { document, task } = await pdf(await request(undefined, { ...october, format: 'pdf' }));
    try {
      assert.ok(document.numPages > 1);
      let fullText = '';
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber), contents = await page.getTextContent();
        const content = await pageText(document, pageNumber); fullText += content;
        assert.ok(content.includes('Giao dịch / Booking'), `Table heading missing on page ${pageNumber}`);
        assert.ok(content.includes('Hoa hồng (VND)')); assert.ok(content.includes(`Trang ${pageNumber} / ${document.numPages}`));
        for (const item of contents.items.filter(item => item.str)) {
          assert.ok(item.transform[4] >= 22 && item.transform[4] + item.width <= page.view[2] - 22, `PDF content clipped: ${item.str}`);
        }
      }
      assert.ok(fullText.includes('Báo cáo tài chính và doanh thu'));
      assert.ok(fullText.includes('Nguyễn Thị Hồng'));
      assert.ok(fullText.includes('Hoàn tiền')); assert.ok(fullText.includes('66 giao dịch'));
      assert.ok(fullText.includes(BigInt(report.totals.gross_payments).toLocaleString('vi-VN')));
      const all = await Payment.find({ status: { $in: ['SUCCESS', 'REFUNDED'] } }).select('transaction_id').lean();
      for (const receipt of all) assert.ok(fullText.includes(receipt.transaction_id), `Missing receipt ${receipt.transaction_id}`);
    } finally { await task.destroy(); await User.updateOne({ _id: hotel._id }, { $set: { full_name: hotel.full_name } }); }
  });
  await t.test('empty exports are real readable PDF/XLSX with zero totals and a no-data message', async () => {
    await reset(); const report = await read();
    const workbook = await excel(await request()); checkTotals(workbook, report);
    assert.match(workbook.getWorksheet('Chi tiết').getCell('A2').value, /Không có giao dịch/);
    const { document, task } = await pdf(await request(undefined, { ...october, format: 'pdf' }));
    try { assert.equal(document.numPages, 1); assert.ok((await pageText(document, 1)).includes('Không có giao dịch')); }
    finally { await task.destroy(); }
  });
  await t.test('Excel user strings beginning =,+,-,@ remain literal strings and create no formulas', async () => {
    await reset();
    for (const prefix of ['=', '+', '-', '@']) {
      const { booking, payments } = await sale();
      await Booking.updateOne({ _id: booking._id }, { $set: { booking_code: `${prefix}SUM(1,2)-${booking._id}` } });
      await Payment.updateOne({ _id: payments[0]._id }, { $set: { transaction_id: `${prefix}HYPERLINK("https://example.test","Nguyễn Văn An")-${payments[0]._id}` } });
    }
    await User.updateOne({ _id: hotel._id }, { $set: { full_name: '=HYPERLINK("https://example.test","Đối tác")' } });
    try {
      const workbook = await excel(await request());
      const detail = workbook.getWorksheet('Chi tiết');
      for (let i = 2; i <= 5; i++) for (const column of [1, 3]) {
        const cell = detail.getRow(i).getCell(column);
        assert.equal(cell.type, ExcelJS.ValueType.String); assert.equal(cell.formula, undefined);
        assert.match(cell.value, /^[=+\-@]/);
      }
    } finally { await User.updateOne({ _id: hotel._id }, { $set: { full_name: hotel.full_name } }); }
  });
  await t.test('partner exports include only their allocated share, even on a mixed discounted booking', async () => {
    await reset();
    const mixed = await sale({ final: 90001, lines: [
      { service_id: room._id, quantity: 1, unit_price: 40000, commission_rate: 10 },
      { service_id: ticket._id, quantity: 1, unit_price: 60000, commission_rate: 12.5 },
    ] });
    await Booking.updateOne({ _id: mixed.booking._id }, { $set: { vendor_id: vendor._id } });
    await sale({ lines: [{ service_id: ticket._id, quantity: 1, unit_price: 100000, commission_rate: 12.5 }] });
    const all = await read(), own = await read('/vendor/revenue', october, hotel), other = await read('/vendor/revenue', october, vendor);
    assert.equal(own.total, 1); assert.equal(other.total, 2);
    for (const key of ['gross_payments', 'refunds', 'net_revenue', 'platform_commission']) assert.equal(BigInt(own.totals[key]) + BigInt(other.totals[key]), BigInt(all.totals[key]));
    assert.equal(own.totals.gross_payments, '36000');
    const filtered = await read('/admin/revenue', { ...october, vendor_id: String(hotel._id) });
    assert.deepEqual(filtered.totals, own.totals);
    assert.deepEqual(own.partner_options, []); assert.equal(own.rows[0].partners.length, 1);
    assert.ok(!JSON.stringify(own).includes(vendor.email)); assert.ok(!JSON.stringify(own).includes(String(vendor._id)));
    const workbook = await excel(await request('/vendor/revenue/export', { ...october, format: 'xlsx' }, hotel));
    checkTotals(workbook, own); assert.equal(workbook.getWorksheet('Chi tiết').rowCount, 3);
    assert.ok(workbook.getWorksheet('Tổng hợp').getCell('B4').value.includes(String(hotel._id)));
    assert.ok(!workbook.getWorksheet('Chi tiết').getCell('C2').value.includes(String(vendor._id)));
    const { document, task } = await pdf(await request('/vendor/revenue/export', { ...october, format: 'pdf' }, vendor));
    try { assert.ok((await pageText(document, 1)).includes(String(vendor._id))); }
    finally { await task.destroy(); }
  });
  await t.test('backend rejects partner scope tampering, global staff routes, missing/revoked permissions and locks', async () => {
    for (const format of ['pdf', 'xlsx']) {
      assert.equal((await request('/vendor/revenue/export', { ...october, format, vendor_id: String(vendor._id) }, hotel)).status, 403);
      for (const actor of [hotel, vendor, customer, manager]) assert.equal((await request(undefined, { ...october, format }, actor)).status, 403);
      assert.equal((await request(undefined, { ...october, format }, null)).status, 401);
    }
    assert.equal((await request('/vendor/revenue', { ...october, vendor_id: String(vendor._id) }, hotel)).status, 403);
    await Role.updateOne({ _id: hotel.role_id }, { $set: { permissions: ['vendor.dashboard', 'revenue.view'] } });
    assert.equal((await request(undefined, { ...october, format: 'xlsx' }, hotel)).status, 403);
    await Role.updateOne({ _id: hotel.role_id }, { $set: { permissions: [] } });
    assert.equal((await request('/vendor/revenue/export', { ...october, format: 'pdf' }, hotel)).status, 403);
    await Role.updateOne({ _id: hotel.role_id }, { $unset: { permissions: 1 } });
    await User.updateOne({ _id: hotel._id }, { $set: { status: 'LOCKED' } });
    assert.equal((await request('/vendor/revenue/export', { ...october, format: 'pdf' }, hotel)).status, 403);
    await User.updateOne({ _id: hotel._id }, { $set: { status: 'ACTIVE' } });
  });
  await t.test('exports obey Vietnam date bounds, validate formats/dates, preserve unknowns and refuse mixed currency', async () => {
    await reset(); await sale({ receipts: [
      { payment_date: new Date('2026-09-30T16:59:59.999Z') },
      { payment_date: new Date('2026-09-30T17:00:00Z') },
      { payment_date: new Date('2026-10-31T17:00:00Z') },
    ] });
    const workbook = await excel(await request()); assert.equal(workbook.getWorksheet('Chi tiết').rowCount, 3); checkTotals(workbook, await read());
    for (const query of [{ ...october, format: 'csv' }, { ...october, format: 'xlsx', from: '2026-02-30' }, { ...october, format: 'pdf', vendor_id: 'invalid' }]) assert.equal((await request(undefined, query)).status, 400);
    await reset(); const { payments } = await sale();
    await Payment.collection.updateOne({ _id: payments[0]._id }, { $set: { refunded_amount: 25000 } });
    const incomplete = await excel(await request());
    assert.equal(incomplete.getWorksheet('Tổng hợp').getCell('B11').value, 'Chưa xác định');
    assert.equal(incomplete.getWorksheet('Chi tiết').getCell('E2').value, 'Chưa xác định');
    await Payment.collection.updateOne({ _id: payments[0]._id }, { $set: { currency: 'USD' } });
    for (const format of ['pdf', 'xlsx']) assert.equal((await request(undefined, { ...october, format })).status, 422);
    assert.equal((await request('/admin/revenue', october)).status, 422);
  });
  await t.test('Excel refuses numbers outside its decimal precision; PDF retains the exact amount', async () => {
    await reset(); await sale({ final: Number.MAX_SAFE_INTEGER });
    const response = await request(); assert.equal(response.status, 422); assert.match((await response.json()).message, /độ chính xác/);
    const { document, task } = await pdf(await request(undefined, { ...october, format: 'pdf' }));
    try { assert.ok((await pageText(document, 1)).includes(BigInt(Number.MAX_SAFE_INTEGER).toLocaleString('vi-VN'))); }
    finally { await task.destroy(); }
  });
};
