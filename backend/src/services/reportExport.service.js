const ExcelJS = require('exceljs');
const PdfPrinter = require('pdfmake');
const fontFiles = require('pdfmake/build/vfs_fonts');
const { getRevenue } = require('./revenue.service');

const TITLE = 'Báo cáo tài chính và doanh thu';
const metrics = [
  ['Tổng thanh toán thành công', 'gross_payments'], ['Tiền hoàn trả đã ghi nhận', 'refunds'],
  ['Giá trị giao dịch sau hoàn trả', 'net_revenue'], ['Hoa hồng sàn theo thanh toán', 'platform_commission'],
];
const headers = ['Giao dịch / Booking', 'Ngày thanh toán (VN)', 'Đối tác', 'Số tiền (VND)', 'Tiền hoàn (VND)', 'Sau hoàn (VND)', 'Tỷ lệ hoa hồng', 'Hoa hồng (VND)', 'Trạng thái'];
const money = value => value == null ? 'Chưa xác định' : BigInt(value).toLocaleString('vi-VN');
const localDate = value => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
const partnerNames = row => row.partners?.map(partner => `${partner.name}${partner.id ? ` (${partner.id})` : ''}`).join('\n') || 'Chưa xác định đối tác';
const status = row => row.status === 'REFUNDED' ? 'Đã hoàn toàn phần' : 'Thành công';
const text = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

// Excel has at most 15 significant decimal digits. Never silently round a
// financial amount to fit its number cells; PDF retains arbitrary-size VND.
const excelMoney = value => {
  if (value == null) return 'Chưa xác định';
  const integer = BigInt(value);
  if (integer > 999999999999999n || integer < -999999999999999n) throw Object.assign(new Error('Số tiền vượt độ chính xác số của Excel. Vui lòng chọn PDF hoặc khoảng thời gian ngắn hơn.'), { statusCode: 422 });
  return Number(integer);
};
const excelText = (cell, value) => {
  const content = text(value);
  if (content.length > 32767) throw Object.assign(new Error('Nội dung văn bản vượt giới hạn ô Excel; vui lòng xuất PDF.'), { statusCode: 422 });
  // A JS string and text number-format produce an XLSX string cell, never a
  // formula/hyperlink object, including strings beginning with =, +, -, @.
  cell.value = content;
  cell.numFmt = '@';
};
const styleHeader = row => {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  row.alignment = { vertical: 'middle', wrapText: true };
  row.height = 32;
};
const notes = report => [
  ...report.limitations,
  ...(report.quality.issues.length ? [`Cần kiểm tra dữ liệu: ${report.quality.issues.join(', ')}. Giá trị chưa xác định không được coi là 0.`] : []),
];

const renderExcel = async (report, exportedAt) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Travelio'; workbook.created = exportedAt;
  const summary = workbook.addWorksheet('Tổng hợp');
  summary.columns = [{ width: 43 }, { width: 48 }, { width: 24 }, { width: 24 }];
  summary.mergeCells('A1:D1'); summary.getCell('A1').value = TITLE; summary.getCell('A1').font = { size: 18, bold: true };
  summary.addRow(['Thời điểm xuất (giờ Việt Nam)', new Date(exportedAt.getTime() + 7 * 3600000)]);
  summary.getCell('B2').numFmt = 'dd/mm/yyyy hh:mm:ss';
  summary.addRow(['Kỳ báo cáo', `${report.period.from} – ${report.period.to}`]);
  summary.addRow(['Phạm vi', '']); excelText(summary.getCell('B4'), report.partner ? `${report.partner.name} (${report.partner.id})` : 'Toàn hệ thống');
  summary.addRow(['Đơn vị tiền tệ', report.currency]); summary.addRow(['Múi giờ', report.period.timezone]);
  summary.addRow(['Số giao dịch', report.total]); summary.addRow([]);
  styleHeader(summary.addRow(['Chỉ tiêu', 'Giá trị (VND)']));
  metrics.forEach(([label, key]) => {
    const row = summary.addRow([label, excelMoney(report.totals[key])]);
    row.getCell(2).numFmt = '#,##0;[Red]-#,##0'; row.font = { bold: true };
  });
  summary.addRow([]);
  for (const note of notes(report)) {
    const row = summary.addRow([note]); summary.mergeCells(row.number, 1, row.number, 4);
    row.alignment = { wrapText: true, vertical: 'top' }; row.height = 48;
  }
  const detail = workbook.addWorksheet('Chi tiết', { views: [{ state: 'frozen', ySplit: 1 }] });
  detail.columns = [46, 24, 42, 22, 22, 22, 24, 22, 23, 36].map(width => ({ width }));
  styleHeader(detail.addRow([...headers, 'Kiểm tra dữ liệu']));
  for (const record of report.rows) {
    const row = detail.addRow([]);
    excelText(row.getCell(1), `${record.transaction_id}\n${record.booking_code || record.booking_id}`);
    row.getCell(2).value = new Date(new Date(record.payment_date).getTime() + 7 * 3600000);
    row.getCell(2).numFmt = 'dd/mm/yyyy hh:mm:ss';
    excelText(row.getCell(3), partnerNames(record));
    for (const [column, key] of [[4, 'amount'], [5, 'refund_amount'], [6, 'net_revenue'], [8, 'platform_commission']]) {
      row.getCell(column).value = excelMoney(record[key]); row.getCell(column).numFmt = '#,##0;[Red]-#,##0';
    }
    if (record.commission_rates.length === 1) {
      row.getCell(7).value = record.commission_rates[0] / 100; row.getCell(7).numFmt = '0.####%';
    } else excelText(row.getCell(7), record.commission_rates.map(rate => `${rate}%`).join(' / ') || 'Chưa xác định');
    excelText(row.getCell(9), status(record)); excelText(row.getCell(10), record.issues.join(', '));
    row.alignment = { wrapText: true, vertical: 'top' };
    const wrappedLines = [1, 3, 9, 10].map(column => String(row.getCell(column).value || '').split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / (detail.getColumn(column).width - 3))), 0));
    row.height = Math.min(409, Math.max(34, 15 * Math.max(...wrappedLines)));
  }
  detail.autoFilter = { from: 'A1', to: `J${Math.max(1, report.rows.length + 1)}` };
  if (!report.rows.length) { detail.mergeCells('A2:J2'); detail.getCell('A2').value = 'Không có giao dịch trong kỳ báo cáo.'; }
  const totalRow = detail.addRow(['TỔNG', '', '', excelMoney(report.totals.gross_payments), excelMoney(report.totals.refunds), excelMoney(report.totals.net_revenue), '', excelMoney(report.totals.platform_commission)]);
  totalRow.font = { bold: true }; totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  for (const column of [4, 5, 6, 8]) totalRow.getCell(column).numFmt = '#,##0;[Red]-#,##0';
  for (const sheet of [summary, detail]) {
    sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:1' };
    sheet.headerFooter.oddFooter = 'Travelio | VND | Asia/Ho_Chi_Minh | Trang &P / &N';
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

const renderPdf = (report, exportedAt) => new Promise((resolve, reject) => {
  const font = name => Buffer.from(fontFiles[name], 'base64');
  const printer = new PdfPrinter({ Roboto: { normal: font('Roboto-Regular.ttf'), bold: font('Roboto-Medium.ttf'), italics: font('Roboto-Italic.ttf'), bolditalics: font('Roboto-MediumItalic.ttf') } });
  const cell = value => ({ text: text(value).replace(/(\S{20})/gu, '$1\u200b'), margin: [0, 3, 0, 3] });
  const body = [headers.map(label => ({ ...cell(label), bold: true, color: '#ffffff', fillColor: '#2563eb' }))];
  for (const row of report.rows) body.push([
    cell(`${row.transaction_id}\n${row.booking_code || row.booking_id}`), cell(localDate(row.payment_date)), cell(partnerNames(row)),
    cell(money(row.amount)), cell(money(row.refund_amount)), cell(money(row.net_revenue)),
    cell(row.commission_rates.map(rate => `${rate}%`).join(' / ') || 'Chưa xác định'), cell(money(row.platform_commission)),
    cell(`${status(row)}${row.issues.length ? `\n${row.issues.join(', ')}` : ''}`),
  ]);
  body.push([cell('TỔNG'), cell(''), cell(''), cell(money(report.totals.gross_payments)), cell(money(report.totals.refunds)), cell(money(report.totals.net_revenue)), cell(''), cell(money(report.totals.platform_commission)), cell('')].map(item => ({ ...item, bold: true, fillColor: '#dbeafe' })));
  const document = printer.createPdfKitDocument({
    pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [24, 28, 24, 32],
    defaultStyle: { font: 'Roboto', fontSize: 8 },
    info: { title: TITLE, author: 'Travelio', creationDate: exportedAt },
    footer: (page, pages) => ({ text: `Travelio · VND · Asia/Ho_Chi_Minh · Trang ${page} / ${pages}`, alignment: 'right', margin: [24, 8, 24, 0], fontSize: 8 }),
    content: [
      { text: TITLE, fontSize: 18, bold: true, margin: [0, 0, 0, 8] },
      { text: `Xuất lúc: ${localDate(exportedAt)} · Kỳ: ${report.period.from} – ${report.period.to} · Đơn vị: VND`, margin: [0, 0, 0, 5] },
      { text: report.partner ? `Đối tác: ${report.partner.name} (${report.partner.id})` : 'Phạm vi: Toàn hệ thống', margin: [0, 0, 0, 8] },
      { table: { widths: ['*', '*', '*', '*'], body: [metrics.map(([label]) => ({ text: label, bold: true })), metrics.map(([, key]) => `${money(report.totals[key])} VND`)] }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 10] },
      ...notes(report).map(note => ({ text: note, fontSize: 8, color: '#654321', margin: [0, 0, 0, 4] })),
      { text: `Chi tiết: ${report.total} giao dịch${report.total ? '' : ' — Không có giao dịch trong kỳ báo cáo.'}`, bold: true, margin: [0, 8, 0, 6] },
      { table: { headerRows: 1, keepWithHeaderRows: 1, widths: [110, 70, 85, 64, 58, 64, 45, 64, 61], body }, layout: { paddingLeft: () => 2, paddingRight: () => 2, hLineColor: () => '#cbd5e1', vLineColor: () => '#e2e8f0' } },
    ],
  });
  const chunks = []; document.on('data', chunk => chunks.push(chunk)); document.on('error', reject); document.on('end', () => resolve(Buffer.concat(chunks))); document.end();
});

const exportRevenue = async (query, scope = {}) => {
  if (!['pdf', 'xlsx'].includes(query.format)) throw Object.assign(new Error('Định dạng báo cáo phải là pdf hoặc xlsx'), { statusCode: 400 });
  // Pagination is deliberately excluded. A file contains all matching rows.
  const report = await getRevenue({ from: query.from, to: query.to, ...(query.vendor_id !== undefined ? { vendor_id: query.vendor_id } : {}) }, { ...scope, allRows: true });
  const exportedAt = new Date();
  const buffer = query.format === 'xlsx' ? await renderExcel(report, exportedAt) : await renderPdf(report, exportedAt);
  return { buffer, filename: `financial-revenue-${report.period.from}-${report.period.to}-${report.partner?.id || 'all'}.${query.format}`,
    contentType: query.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf' };
};

module.exports = { exportRevenue, renderExcel, renderPdf };
