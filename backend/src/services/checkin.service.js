const { BookingDetail, QrScanLog } = require('../models');

const CODE_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;
const VN_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });

const dayOf = (value) => (value ? VN_DAY.format(new Date(value)) : null);

// Accepts a bare code or the full /checkin/<code> link printed in the QR.
const normalizeCode = (raw) => {
  let value = String(raw || '').trim();
  const fromLink = value.match(/\/checkin\/([^/?#\s]+)/);
  if (fromLink) {
    try { value = decodeURIComponent(fromLink[1]); } catch { value = fromLink[1]; }
  }
  return value;
};

const isWellFormed = (code) => CODE_PATTERN.test(code);

const maskName = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).map((word) => {
  const chars = [...word];
  return chars[0] + '*'.repeat(Math.min(chars.length - 1, 4));
}).join(' ');

const shortBookingCode = (code) => {
  const text = String(code || '');
  return text.length > 8 ? `${text.slice(0, 4)}...${text.slice(-4)}` : text;
};

const loadDetail = (code) => BookingDetail.findOne({ qr_code: code })
  .populate('booking_id', 'booking_code guest_name status')
  .populate({ path: 'service_id', select: 'name type facility_id', populate: { path: 'facility_id', select: 'name vendor_id type' } })
  .populate('facility_id', 'name vendor_id type')
  .populate({
    path: 'inventory_id',
    select: 'target_date service_id',
    populate: { path: 'service_id', select: 'name type facility_id', populate: { path: 'facility_id', select: 'name vendor_id type' } }
  });

// Rooms are valid from check-in to check-out day; tickets only on their visit day.
const usageWindow = (detail) => {
  if (detail.check_in_date) return { from: dayOf(detail.check_in_date), to: dayOf(detail.check_out_date || detail.check_in_date) };
  const visit = dayOf(detail.visit_date || detail.inventory_id?.target_date);
  return { from: visit, to: visit };
};

const inspectCode = async (code, now = new Date()) => {
  const empty = { status: 'INVALID', detail: null, facility: null, service: null, window: null };
  if (!isWellFormed(code)) return empty;
  const detail = await loadDetail(code);
  if (!detail) return empty;
  const service = detail.service_id || detail.inventory_id?.service_id || null;
  const facility = detail.facility_id || service?.facility_id || null;
  const window = usageWindow(detail);
  const base = { detail, facility, service, window };
  if (!facility?.name) return { ...base, status: 'INVALID' };
  if (detail.check_in_status === 'CHECKED_IN') return { ...base, status: 'ALREADY_REDEEMED' };
  if (detail.check_in_status !== 'PENDING' || !['CONFIRMED', 'COMPLETED'].includes(detail.booking_id?.status)) {
    return { ...base, status: 'INVALID' };
  }
  const today = dayOf(now);
  if (window.from && (today < window.from || today > window.to)) return { ...base, status: 'WRONG_DATE' };
  return { ...base, status: 'READY' };
};

// The conditional update makes concurrent scans of one code succeed only once.
const markCheckedIn = async (detail, at = new Date()) => {
  const updated = await BookingDetail.updateOne(
    { _id: detail._id, check_in_status: 'PENDING' },
    { $set: { check_in_status: 'CHECKED_IN', checked_in_at: at } }
  );
  return updated.modifiedCount === 1;
};

const summarize = (inspected, result) => {
  const { status, detail, facility, service, window } = inspected;
  if (status === 'INVALID') {
    return { result, service_name: null, facility_name: null, date_from: null, date_to: null, guest_name: null, booking_code: null, checked_in_at: null };
  }
  return {
    result,
    service_name: detail.service_name || service?.name || null,
    facility_name: facility?.name || null,
    date_from: window.from,
    date_to: window.to,
    guest_name: maskName(detail.booking_id?.guest_name),
    booking_code: shortBookingCode(detail.booking_id?.booking_code),
    checked_in_at: detail.checked_in_at || null
  };
};

const previewCheckin = async (code) => {
  const inspected = await inspectCode(code);
  return summarize(inspected, inspected.status);
};

const confirmCheckin = async (code, { ip, userAgent } = {}) => {
  const inspected = await inspectCode(code);
  let result = inspected.status === 'READY' ? 'VALID' : inspected.status;
  if (result === 'VALID') {
    const at = new Date();
    if (await markCheckedIn(inspected.detail, at)) inspected.detail.checked_in_at = at;
    else result = 'ALREADY_REDEEMED';
  }
  await QrScanLog.create({
    vendor_id: inspected.facility?.vendor_id || null,
    facility_id: inspected.facility?._id || null,
    booking_detail_id: inspected.detail?._id || null,
    scanned_by: null,
    source: 'PUBLIC_LINK',
    ip: String(ip || '').slice(0, 64) || undefined,
    user_agent: String(userAgent || '').slice(0, 200) || undefined,
    qr_code: code.slice(0, 64),
    result
  });
  return summarize(inspected, result);
};

module.exports = { normalizeCode, isWellFormed, inspectCode, markCheckedIn, previewCheckin, confirmCheckin, maskName, shortBookingCode, dayOf };
