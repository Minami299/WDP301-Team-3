import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyticsPreset, analyticsInterval, analyticsFilterError, analyticsValue } from '../src/utils/adminAnalytics.js';

test('presets use Vietnam dates, inclusive days and clamped rolling calendar months', () => {
  const now = new Date('2026-10-26T17:00:00Z');
  assert.deepEqual(analyticsPreset('7d', now), { from: '2026-10-21', to: '2026-10-27' });
  assert.deepEqual(analyticsPreset('30d', now), { from: '2026-09-28', to: '2026-10-27' });
  assert.deepEqual(analyticsPreset('6m', now), { from: '2026-04-28', to: '2026-10-27' });
  assert.deepEqual(analyticsPreset('12m', now), { from: '2025-10-28', to: '2026-10-27' });
  assert.deepEqual(analyticsPreset('12m', new Date('2024-02-29T12:00:00+07:00')), { from: '2023-03-01', to: '2024-02-29' });
  assert.deepEqual(analyticsPreset('6m', new Date('2026-08-31T12:00:00+07:00')), { from: '2026-03-01', to: '2026-08-31' });
});

test('custom validation and default grouping match server limits', () => {
  assert.equal(analyticsInterval({ from: '2026-10-01', to: '2026-10-30' }), 'daily');
  assert.equal(analyticsInterval({ from: '2026-01-01', to: '2026-10-30' }), 'monthly');
  assert.equal(analyticsInterval({ from: '2020-01-01', to: '2026-10-30' }), 'yearly');
  for (const period of [{ from: '2026-02-30', to: '2026-03-01' }, { from: '2026-10-02', to: '2026-10-01' }, { from: '2000-01-01', to: '2026-01-01' }]) assert.ok(analyticsFilterError(period, 'monthly'));
  assert.ok(analyticsFilterError({ from: '2024-01-01', to: '2026-01-01' }, 'daily'));
  assert.equal(analyticsFilterError({ from: '2024-01-01', to: '2026-01-01' }, 'monthly'), '');
});

test('KPI formatting preserves large money and distinguishes unknown from zero', () => {
  assert.equal(analyticsValue('20000000000000001', 'money'), '20.000.000.000.000.001 ₫');
  assert.equal(analyticsValue(null, 'money'), 'Chưa xác định');
  assert.equal(analyticsValue(0, 'percent'), '0%');
  assert.equal(analyticsValue(12.5, 'percent'), '12,5%');
});
