import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportErrorMessage, validateReportDownload } from '../src/utils/reportDownload.js';

test('accepts PDF/XLSX binary signatures with their actual media types', async () => {
  const pdf = new Blob(['%PDF-1.7\n'], { type: 'application/pdf' });
  const xlsx = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0])], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  assert.equal(await validateReportDownload(pdf, pdf.type, 'pdf'), pdf);
  assert.equal(await validateReportDownload(xlsx, xlsx.type, 'xlsx'), xlsx);
  assert.equal(await validateReportDownload(pdf, 'application/octet-stream', 'pdf'), pdf);
});

test('does not download successful HTTP responses containing JSON/text/HTML instead of files', async () => {
  const route = 'Route not found: /api/admin/revenue/export?from=2026-10-01&to=2026-10-31&format=xlsx';
  for (const format of ['xlsx', 'pdf']) {
    await assert.rejects(validateReportDownload(new Blob([JSON.stringify({ success: false, message: route })]), 'application/json', format), { message: route });
    await assert.rejects(validateReportDownload(new Blob(['Export service unavailable']), 'text/plain', format), { message: 'Export service unavailable' });
    await assert.rejects(validateReportDownload(new Blob(['<!doctype html><title>Login</title>']), 'text/html', format), /không trả về file/);
    await assert.rejects(validateReportDownload(new Blob([]), format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', format), /không trả về file/);
  }
});

test('rejects mismatched formats and wrong file signatures even under an Excel content type', async () => {
  await assert.rejects(validateReportDownload(new Blob(['%PDF-1.7']), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'), /không trả về file Excel/);
  await assert.rejects(validateReportDownload(new Blob(['{"message":"Not an Excel file"}']), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'), /Not an Excel file/);
});

test('preserves JSON and plain-text HTTP errors without rendering HTML error pages', () => {
  assert.equal(reportErrorMessage({ message: 'Forbidden' }, 'fallback'), 'Forbidden');
  assert.equal(reportErrorMessage('Report unavailable', 'fallback'), 'Report unavailable');
  assert.equal(reportErrorMessage('{"message":"Route not found"}', 'fallback'), 'Route not found');
  assert.equal(reportErrorMessage('<html>Error</html>', 'fallback'), 'fallback');
  assert.equal(reportErrorMessage('', 'fallback'), 'fallback');
});
