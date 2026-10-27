// VND is stored as Number in the existing schemas. Accept only exact, whole VND;
// all arithmetic below uses BigInt and the API returns decimal strings.
const money = value => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('INVALID_VND');
  return BigInt(value);
};

// Match MongoDB $round (ties to even), used by the existing vendor report.
const round = (numerator, denominator) => {
  const quotient = numerator / denominator, remainder = numerator % denominator;
  return quotient + (remainder * 2n > denominator || (remainder * 2n === denominator && quotient % 2n === 1n) ? 1n : 0n);
};
const rateFraction = value => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) throw new Error('MISSING_COMMISSION_RATE');
  const [coefficient, exponent = '0'] = String(value).toLowerCase().split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  const scale = fraction.length - Number(exponent);
  return scale >= 0
    ? [BigInt(whole + fraction), 100n * 10n ** BigInt(scale)]
    : [BigInt(whole + fraction) * 10n ** BigInt(-scale), 100n];
};

const allocateLines = (details, amount) => {
  const weights = details.map(detail => money(detail.unit_price) * money(detail.quantity));
  const gross = weights.reduce((sum, value) => sum + value, 0n);
  if (gross === 0n && amount > 0n) throw new Error('INVALID_BOOKING_TOTAL');
  let preceding = 0n;
  return weights.map(weight => {
    const share = gross === 0n ? 0n : round(amount * (preceding + weight), gross) - round(amount * preceding, gross);
    preceding += weight;
    return share;
  });
};

const commissionCalculator = (details, finalAmount) => {
  if (!details.length) throw new Error('MISSING_BOOKING_DETAILS');
  const rates = details.map(detail => rateFraction(detail.resolved_rate));
  allocateLines(details, finalAmount);
  return received => {
    const base = received < finalAmount ? received : finalAmount;
    return allocateLines(details, base).map((share, i) => round(share * rates[i][0], rates[i][1]));
  };
};

const calculateBookingRevenue = (booking, payments, details, { start, end }) => {
  details = [...details].sort((a, b) => String(a._id).localeCompare(String(b._id)));
  const unique = new Map();
  for (const payment of payments) {
    if (['SUCCESS', 'REFUNDED'].includes(payment.status)) unique.set(payment.transaction_id, payment);
  }
  const receipts = [...unique.values()].sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date) || String(a._id).localeCompare(String(b._id)));
  let received = 0n, previousCommission = details.map(() => 0n);
  const rows = [];
  let calculateCommission, configurationError;
  try { calculateCommission = commissionCalculator(details, money(booking.final_amount)); }
  catch (error) { configurationError = error.message; }
  for (const payment of receipts) {
    const issues = [];
    const paidAt = new Date(payment.payment_date);
    if (!Number.isFinite(paidAt.getTime())) continue;
    let amount;
    try { amount = money(payment.amount); }
    catch { amount = null; issues.push('INVALID_VND'); }
    // Only the full REFUNDED state exists today. Do not silently interpret
    // ad-hoc partial refund fields as an approved refund/commission policy.
    const partial = payment.refunded_amount != null || payment.refunds != null;
    if (partial) issues.push('UNSUPPORTED_REFUND_DATA');
    const refund = amount === null || partial ? null : payment.status === 'REFUNDED' ? amount : 0n;
    const net = refund === null ? null : amount - refund;
    let commission = null, lineCommissions = null;
    if (configurationError) issues.push(configurationError);
    if (net !== null && calculateCommission) {
      received += net;
      const current = calculateCommission(received);
      // Full refunds have no retained sale base. The system has no rule for
      // retaining a cancellation commission; this is a calculated fee, not a ledger receipt.
      lineCommissions = current.map((value, i) => value - previousCommission[i]);
      commission = lineCommissions.reduce((sum, value) => sum + value, 0n);
      previousCommission = current;
    } else if (net === null) {
      calculateCommission = null;
      configurationError = 'INCOMPLETE_PAYMENT_HISTORY';
    }
    if (details.some(detail => detail.rate_source === 'FACILITY_CURRENT')) issues.push('CURRENT_RATE_FALLBACK');
    if (booking.status === 'REFUNDED' && payment.status === 'SUCCESS') {
      issues.push('REFUND_STATUS_MISMATCH');
      commission = null;
    }
    if (booking.status === 'CANCELLED' && payment.status === 'SUCCESS') {
      issues.push('CANCELLED_BOOKING_WITH_PAYMENT');
      commission = null;
    }
    if (!booking.booking_code) issues.push('MISSING_BOOKING');
    if (details.some(detail => !detail.resolved_vendor_id)) issues.push('MISSING_PARTNER');
    if (paidAt < start || paidAt >= end) continue;
    // Keep all lines in the allocation before selecting a partner. Filtering
    // lines first would incorrectly assign the entire mixed booking to one owner.
    const partners = new Map();
    let amounts, refunds;
    try {
      amounts = amount === null ? null : allocateLines(details, amount);
      refunds = refund === null ? null : allocateLines(details, refund);
    } catch { issues.push('INVALID_BOOKING_TOTAL'); }
    details.forEach((detail, i) => {
      const id = detail.resolved_vendor_id ? String(detail.resolved_vendor_id) : null;
      const partner = partners.get(id) || { id, name: detail.partner_name || 'Chưa xác định đối tác', amount: 0n, refund_amount: 0n, net_revenue: 0n, platform_commission: 0n, commission_rates: [] };
      const add = (key, value) => { partner[key] = partner[key] === null || value === null ? null : partner[key] + value; };
      add('amount', amounts?.[i] ?? null);
      add('refund_amount', refunds?.[i] ?? null);
      add('net_revenue', amounts && refunds ? amounts[i] - refunds[i] : null);
      add('platform_commission', commission === null ? null : lineCommissions[i]);
      if (typeof detail.resolved_rate === 'number') partner.commission_rates.push(detail.resolved_rate);
      partners.set(id, partner);
    });
    rows.push({
      payment_id: String(payment._id), transaction_id: payment.transaction_id,
      booking_id: String(booking._id), booking_code: booking.booking_code,
      payment_date: paidAt.toISOString(), status: payment.status, booking_status: booking.status,
      amount: amount?.toString() ?? null, refund_amount: refund?.toString() ?? null,
      net_revenue: net?.toString() ?? null, platform_commission: commission?.toString() ?? null,
      commission_rates: [...new Set(details.map(detail => detail.resolved_rate).filter(rate => typeof rate === 'number'))],
      partners: [...partners.values()].map(partner => ({ ...partner,
        ...Object.fromEntries(['amount', 'refund_amount', 'net_revenue', 'platform_commission'].map(key => [key, partner[key]?.toString() ?? null])),
        commission_rates: [...new Set(partner.commission_rates)],
      })),
      issues: [...new Set(issues)],
    });
  }
  return rows;
};

module.exports = { calculateBookingRevenue, round, allocateLines, money };
