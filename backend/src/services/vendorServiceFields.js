const CATEGORIES = ['ATTRACTION', 'TOUR', 'TICKET', 'EXPERIENCE'];
const { normalizeTicketTypes, minimumPrice } = require('./ticketTypes');
const { isUploadedImage } = require('../utils/cloudinaryImage');
const UNITS = ['PERSON', 'TICKET', 'TOUR', 'PACKAGE'];
const invalid = (errors) => Object.assign(new Error('Vui lòng kiểm tra thông tin dịch vụ'), { statusCode: 400, errors });

const normalizeService = (payload, prefix = '') => {
  const errors = [];
  const add = (field, message) => errors.push({ field: `${prefix}${field}`, message });
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw invalid([{ field: prefix.replace(/\.$/, ''), message: 'Dịch vụ không hợp lệ' }]);
  const read = (field, label, max, required = false) => {
    const value = typeof payload[field] === 'string' ? payload[field].trim() : '';
    if ((required && !value) || (payload[field] != null && typeof payload[field] !== 'string')) add(field, `Vui lòng nhập ${label}`);
    else if (value.length > max) add(field, `${label} không được quá ${max} ký tự`);
    return value;
  };
  const name = read('name', 'tên dịch vụ', 200, true);
  const category = payload.service_category ?? 'TICKET';
  if (!CATEGORIES.includes(category)) add('service_category', 'Loại dịch vụ không hợp lệ');
  const unit = payload.pricing_unit ?? 'TICKET';
  if (!UNITS.includes(unit)) add('pricing_unit', 'Đơn vị tính không hợp lệ');
  const description = read('description', 'mô tả', 5000);
  const location = read('location', 'địa điểm cung cấp dịch vụ', 300, ['ATTRACTION', 'TOUR', 'EXPERIENCE'].includes(category));
  const price = payload.base_price;
  let ticketTypes;
  if (payload.ticket_types !== undefined) {
    try { ticketTypes = normalizeTicketTypes(payload.ticket_types, `${prefix}ticket_types.`); }
    catch (error) { errors.push(...error.errors); }
  } else if (!['number', 'string'].includes(typeof price) || String(price).trim() === '' || !Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > Number.MAX_SAFE_INTEGER) add('base_price', 'Giá phải là số hợp lệ, không âm (0 cho dịch vụ miễn phí)');
  const audience = payload.ticket_audience ?? 'ALL';
  if (!['ADULT', 'CHILD', 'ALL'].includes(audience)) add('ticket_audience', 'Đối tượng vé không hợp lệ');
  let duration = null;
  if (['TOUR', 'EXPERIENCE'].includes(category) && payload.duration_minutes != null && payload.duration_minutes !== '') {
    if (!['number', 'string'].includes(typeof payload.duration_minutes) || !Number.isSafeInteger(Number(payload.duration_minutes)) || Number(payload.duration_minutes) < 1) add('duration_minutes', 'Thời lượng phải là số phút nguyên lớn hơn 0');
    else duration = Number(payload.duration_minutes);
  }
  const photos = payload.photos ?? [];
  if (!Array.isArray(photos) || photos.length > 8 || photos.some(photo => !isUploadedImage(typeof photo === 'string' ? photo.trim() : photo))) add('photos', 'Vui lòng tải tối đa 8 ảnh từ thiết bị lên Cloudinary của Travelio.');
  if (errors.length) throw invalid(errors);
  return { name, service_category: category, description, location, base_price: ticketTypes ? minimumPrice(ticketTypes) : Number(price), ...(ticketTypes ? { ticket_types: ticketTypes } : {}), pricing_unit: unit, duration_minutes: duration, ticket_audience: audience, photos: photos.map((photo) => photo.trim()) };
};

const normalizeServices = (services) => {
  if (!Array.isArray(services) || !services.length || services.length > 20) throw invalid([{ field: 'services', message: 'Vui lòng thêm từ 1 đến 20 dịch vụ' }]);
  const errors = [];
  const result = services.map((service, index) => {
    try { return normalizeService(service, `services.${index}.`); }
    catch (error) { errors.push(...error.errors); return null; }
  });
  if (errors.length) throw invalid(errors);
  return result;
};

module.exports = { normalizeService, normalizeServices };
