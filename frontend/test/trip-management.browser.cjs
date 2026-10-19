// Optional browser checks: install playwright-core and jsqr in a temporary folder,
// set TRIP_QA_MODULES to its node_modules, and run against a Vite preview server.
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const qaRequire = process.env.TRIP_QA_MODULES
  ? createRequire(path.join(process.env.TRIP_QA_MODULES, 'package.json'))
  : require;
const { chromium } = qaRequire('playwright-core');
const jsQR = qaRequire('jsqr');
const { PNG } = require('pngjs');

const baseURL = process.env.TRIP_QA_URL || 'http://127.0.0.1:5178';
const token = 'TVL-QR-0123456789ABCDEF01234567';
const id = (n) => `507f1f77bcf86cd7994390${String(n).padStart(2, '0')}`;
const user = {
  _id: id(1),
  full_name: 'Customer QA',
  role: 'CUSTOMER',
  email: 'customer@example.test',
};
const booking = (n, status, date, hotel = false) => ({
  _id: id(n),
  booking_code: `TVL-TEST-${n}`,
  status,
  guest_name: user.full_name,
  guest_email: user.email,
  guest_phone: '0901234567',
  created_at: '2026-10-01T03:00:00Z',
  total_amount: 300000,
  final_amount: 300000,
  details: [
    {
      _id: `detail-${n}`,
      facility_name: hotel ? 'QA Hotel' : 'QA Attraction',
      service_name: hotel ? 'Deluxe' : 'Entrance',
      ticket_name: hotel ? 'Deluxe' : 'Adult',
      service_type: hotel ? 'ROOM' : 'TICKET',
      facility_type: hotel ? 'HOTEL' : 'ATTRACTION',
      facility_image: `${baseURL}/qa-facility.svg`,
      visit_date: date,
      quantity: 2,
      unit_price: 150000,
      ...(hotel
        ? { check_in_date: date, check_out_date: '2099-11-22', nights: 2 }
        : {}),
      qr_code: token,
      check_in_status: 'PENDING',
    },
  ],
  payments:
    status === 'PENDING'
      ? []
      : [
          {
            _id: 'payment',
            transaction_id: 'SEPAY-QA-123',
            payment_gateway: 'SEPAY',
            amount: 300000,
            status: 'SUCCESS',
            payment_date: '2026-10-01T03:01:00Z',
          },
        ],
  can_request_cancellation: false,
});

async function run() {
  const browser = await chromium.launch({
    executablePath:
      process.env.TRIP_QA_CHROME ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    await context.addInitScript((account) => {
      localStorage.setItem('travelio_token', 'qa-only-token');
      localStorage.setItem('travelio_user', JSON.stringify(account));
    }, user);
    const bookings = [
      booking(2, 'CONFIRMED', '2099-11-20', true),
      booking(3, 'COMPLETED', '2026-01-01'),
      booking(4, 'CANCELLED', '2099-11-20'),
      booking(5, 'PENDING', '2099-11-20'),
      booking(6, 'CONFIRMED', '2020-01-01'),
      booking(7, 'REFUNDED', '2020-01-01'),
    ];
    let listMode = 'normal';
    await context.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const reply = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(data),
        });
      if (url.pathname === '/api/auth/me')
        return reply({ success: true, data: user });
      if (url.pathname === '/api/bookings') {
        if (listMode === 'error')
          return reply({ message: 'QA temporary error' }, 500);
        if (listMode === 'slow')
          await new Promise((resolve) => setTimeout(resolve, 500));
        return reply({
          success: true,
          data: listMode === 'empty' ? [] : bookings,
        });
      }
      const match = /^\/api\/bookings\/([^/]+)$/.exec(url.pathname);
      if (match) {
        const found = bookings.find((item) => item._id === match[1]);
        return found
          ? reply({ success: true, data: found })
          : reply({ message: 'Booking not found' }, 404);
      }
      if (url.pathname.endsWith('/payment'))
        return reply({
          success: true,
          data: {
            bank: 'QA Bank',
            account_number: '0000',
            amount: 300000,
            content: 'TVLTEST5',
            qr_url: `${baseURL}/qa-payment.svg`,
          },
        });
      return reply({ message: 'Unexpected QA endpoint' }, 404);
    });
    await context.route('**/qa-*.svg', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#dbeafe"/></svg>',
      }),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseURL}/my-trips`);
    await page
      .getByRole('heading', { name: 'Chuyến đi của tôi', exact: true })
      .waitFor();
    await page
      .getByRole('tabpanel')
      .getByText('QA Hotel', { exact: true })
      .waitFor();
    assert.equal(await page.getByRole('tab').count(), 3);
    assert.equal(
      await page.getByRole('tabpanel').locator('article').count(),
      1,
    );
    await page
      .getByRole('heading', { name: 'Đơn chờ thanh toán (1)' })
      .waitFor();
    await page.getByRole('heading', { name: 'Các đơn khác' }).waitFor();
    await page.getByRole('tab', { name: /Đã hoàn thành/ }).click();
    await page
      .getByRole('tabpanel')
      .getByText('TVL-TEST-3', { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole('tabpanel')
        .getByText('TVL-TEST-6', { exact: true })
        .count(),
      0,
    );
    await page.getByRole('tab', { name: /Đã hủy/ }).click();
    await page
      .getByRole('tabpanel')
      .getByText('TVL-TEST-4', { exact: true })
      .waitFor();
    await page.getByRole('tab', { name: /Đã hủy/ }).press('Home');
    await page
      .getByRole('tabpanel')
      .getByText('TVL-TEST-2', { exact: true })
      .waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: path.join(os.tmpdir(), 'travelio-my-trips-mobile.png'),
      fullPage: true,
    });
    await page
      .getByRole('tabpanel')
      .getByRole('link', { name: /Xem chi tiết/ })
      .click();
    await page.getByRole('heading', { name: 'Chi tiết chuyến đi' }).waitFor();
    await page.getByText('Trả phòng', { exact: true }).first().waitFor();
    await page.getByText('SEPAY-QA-123', { exact: false }).first().waitFor();
    const qr = page.getByRole('img', { name: /^QR sử dụng/ });
    await qr.waitFor();
    const src = await qr.getAttribute('src');
    assert.match(src, /^data:image\/png;base64,/);
    const png = PNG.sync.read(Buffer.from(src.split(',')[1], 'base64'));
    assert.equal(
      jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
      token,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: path.join(os.tmpdir(), 'travelio-trip-detail-mobile.png'),
      fullPage: true,
    });
    await page.evaluate(() => {
      window.print = () => {
        window.__qaPrintCalled = true;
      };
    });
    await page.getByRole('button', { name: 'In / Lưu PDF biên nhận' }).click();
    assert.equal(await page.evaluate(() => window.__qaPrintCalled), true);
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('#root').isVisible(), false);
    assert.equal(
      await page.locator('.travelio-print-receipt').isVisible(),
      true,
    );
    const pdf = await page.pdf({
      path: path.join(os.tmpdir(), 'travelio-booking-receipt.pdf'),
      format: 'A4',
    });
    assert.ok(pdf.length > 5000);
    await page.emulateMedia({ media: 'screen' });
    for (const n of [3, 4, 5, 7]) {
      await page.goto(`${baseURL}/my-trips/${id(n)}`);
      await page.getByRole('heading', { name: 'QR sử dụng dịch vụ' }).waitFor();
      assert.equal(
        await page.getByRole('img', { name: /^QR sử dụng/ }).count(),
        0,
      );
    }
    await page.getByRole('link', { name: 'Chuyến đi của tôi' }).click();
    listMode = 'error';
    await page.getByRole('button', { name: 'Tải lại', exact: true }).click();
    await page.getByRole('alert').getByText('QA temporary error').waitFor();
    listMode = 'empty';
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await page
      .getByRole('heading', { name: 'Bạn chưa có đơn đặt chỗ nào' })
      .waitFor();
    listMode = 'slow';
    await page.getByRole('button', { name: 'Tải lại', exact: true }).click();
    await page.getByRole('status').getByText('Đang tải chuyến đi...').waitFor();
    await page
      .getByRole('tabpanel')
      .getByText('TVL-TEST-2', { exact: true })
      .waitFor();
    await page.goto(`${baseURL}/my-trips/${id(99)}`);
    await page
      .getByRole('alert')
      .getByText(
        'Không tìm thấy đơn đặt chỗ hoặc bạn không có quyền xem đơn này.',
      )
      .waitFor();
    assert.equal(
      await page.getByRole('img', { name: /^QR sử dụng/ }).count(),
      0,
    );
    const anonymous = await browser.newContext();
    const loginPage = await anonymous.newPage();
    await loginPage.goto(`${baseURL}/my-trips`);
    await loginPage.waitForURL('**/auth/login');
    assert.deepEqual(errors, []);
    console.log(
      'PASS: tabs, pending/other access, loading/empty/error, mobile layouts, details, QR decode, inactive QR, receipt/PDF, inaccessible ID, authentication.',
    );
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
