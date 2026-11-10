// Every breakdown consumes already-allocated booking lines. Never recalculate
// allocations after selecting an owner, hotel or service.
const FIELDS = ['amount', 'refund_amount', 'net_revenue', 'platform_commission'];
const sum = (a, b) => a == null || b == null ? null : (BigInt(a) + BigInt(b)).toString();
const partnerRevenue = value => value.net_revenue == null || value.platform_commission == null ? null : (BigInt(value.net_revenue) - BigInt(value.platform_commission)).toString();
const empty = metadata => ({ ...metadata, amount: '0', refund_amount: '0', net_revenue: '0', platform_commission: '0', booking_ids: new Set(), payment_ids: new Set(), issues: new Set() });
const add = (target, line, row) => {
  for (const key of FIELDS) target[key] = sum(target[key], line[key]);
  target.booking_ids.add(row.booking_id); target.payment_ids.add(row.payment_id);
  row.issues.forEach(issue => target.issues.add(issue));
};
const serialize = item => {
  const { booking_ids, payment_ids, issues, ...data } = item;
  return { ...data, partner_revenue: partnerRevenue(data), booking_count: booking_ids.size, payment_count: payment_ids.size, issues: [...issues] };
};
const scopeRow = (row, predicate) => {
  const lines = row.lines.filter(predicate);
  if (!lines.length) return null;
  const value = Object.fromEntries(FIELDS.map(key => [key, lines.reduce((total, line) => sum(total, line[key]), '0')]));
  const partners = new Map();
  for (const line of lines) {
    const partner = partners.get(line.vendor_id) || empty({ id: line.vendor_id, name: line.partner_name });
    add(partner, line, row); partners.set(line.vendor_id, partner);
  }
  return { ...row, ...value, lines, partners: [...partners.values()].map(serialize), commission_rates: [...new Set(lines.map(line => line.commission_rate).filter(rate => typeof rate === 'number'))] };
};

function createBreakdown(facilities, period, interval) {
  const hotels = new Map(facilities.map(facility => [String(facility._id), empty({
    id: String(facility._id), name: facility.name, type: facility.type,
    vendor_id: facility.vendor_id?._id ? String(facility.vendor_id._id) : null,
    partner_name: facility.vendor_id?.full_name || 'Chưa xác định đối tác',
  })]));
  const services = new Map(), timeline = new Map(), bookings = new Set();
  const date = new Date(`${period.from}T00:00:00Z`);
  if (interval === 'monthly') date.setUTCDate(1);
  while (date.toISOString().slice(0, 10) <= period.to) {
    const bucket = date.toISOString().slice(0, interval === 'monthly' ? 7 : 10);
    timeline.set(bucket, empty({ bucket }));
    if (timeline.size > 400) throw Object.assign(new Error('Biểu đồ vượt 400 mốc; hãy nhóm theo tháng hoặc rút ngắn kỳ báo cáo'), { statusCode: 400 });
    if (interval === 'monthly') date.setUTCMonth(date.getUTCMonth() + 1);
    else date.setUTCDate(date.getUTCDate() + 1);
  }
  return {
    add(row) {
      bookings.add(row.booking_id);
      const bucket = new Date(new Date(row.payment_date).getTime() + 7 * 3600000).toISOString().slice(0, interval === 'monthly' ? 7 : 10);
      // Missing booking lines remain an explicit reconciliation group.
      const lines = row.lines.length ? row.lines : [{ ...row, facility_id: null, facility_name: 'Chưa xác định cơ sở', facility_type: null, service_id: null, service_name: 'Chưa xác định dịch vụ' }];
      for (const line of lines) {
        const hotel = hotels.get(line.facility_id) || empty({ id: line.facility_id, name: line.facility_name, type: line.facility_type, vendor_id: line.vendor_id, partner_name: line.partner_name });
        add(hotel, line, row); hotels.set(line.facility_id, hotel);
        const key = `${line.facility_id || 'unknown'}:${line.service_id || 'unknown'}`;
        const service = services.get(key) || empty({ id: key, name: line.service_name, type: line.service_type, facility_id: line.facility_id, facility_name: line.facility_name });
        add(service, line, row); services.set(key, service);
        add(timeline.get(bucket), line, row);
      }
    },
    result() { return { facilities: [...hotels.values()].map(serialize), services: [...services.values()].map(serialize), timeline: [...timeline.values()].map(serialize), booking_count: bookings.size, interval }; },
  };
}

module.exports = { scopeRow, createBreakdown, partnerRevenue };
