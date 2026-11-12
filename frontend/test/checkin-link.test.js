import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkinPath, checkinUrl, formatStay, formatUsedAt } from '../src/utils/checkinLink.js';

test('QR value is a link any phone camera can open', () => {
  assert.equal(checkinPath('TVL-QR-ABC123'), '/checkin/TVL-QR-ABC123');
  assert.equal(checkinUrl('TVL-QR-ABC123', 'https://travelio.example'), 'https://travelio.example/checkin/TVL-QR-ABC123');
});

test('dates render in Vietnam time and collapse single-day windows', () => {
  assert.equal(formatStay('2026-11-12', '2026-11-12'), '12/11/2026');
  assert.equal(formatStay('2026-11-12', '2026-11-14'), '12/11/2026 đến 14/11/2026');
  assert.equal(formatStay(null, null), '');
  assert.match(formatUsedAt('2026-11-12T03:05:00Z'), /10:05 ngày 12\/11\/2026/);
  assert.equal(formatUsedAt(null), '');
});
