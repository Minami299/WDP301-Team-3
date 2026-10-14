const mongoose = require('mongoose');

const nameKey = (name) => name.trim().normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase('vi');
const invalid = (errors) => Object.assign(new Error('Vui lòng kiểm tra thông tin hạng vé'), { statusCode: 400, errors });

const normalizeTicketType = (value, prefix = '') => {
  const errors = [];
  const add = (field, message) => errors.push({ field: prefix + field, message });
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid([{ field: prefix.replace(/\.$/, ''), message: 'Hạng vé không hợp lệ' }]);
  const read = (key, max, required = false) => {
    const text = typeof value[key] === 'string' ? value[key].trim() : '';
    if ((required && !text) || (value[key] != null && typeof value[key] !== 'string') || text.length > max) add(key, key === 'name' ? 'Tên hạng vé bắt buộc, tối đa 200 ký tự' : `Nội dung tối đa ${max} ký tự`);
    return text;
  };
  const name = read('name', 200, true);
  const description = read('description', 2000);
  const conditions = read('conditions', 2000);
  if (!['number', 'string'].includes(typeof value.price) || String(value.price).trim() === '' || !Number.isFinite(Number(value.price)) || Number(value.price) < 0 || Number(value.price) > Number.MAX_SAFE_INTEGER) add('price', 'Giá vé phải là số hợp lệ, không âm; nhập 0 cho vé miễn phí');
  const age = (key) => {
    if (value[key] == null || value[key] === '') return null;
    const result = Number(value[key]);
    if (!['string', 'number'].includes(typeof value[key]) || !Number.isInteger(result) || result < 0 || result > 150) add(key, 'Độ tuổi phải là số nguyên từ 0 đến 150');
    return result;
  };
  const minAge = age('min_age'); const maxAge = age('max_age');
  if (minAge != null && maxAge != null && minAge > maxAge) add('max_age', 'Tuổi tối đa không được nhỏ hơn tuổi tối thiểu');
  const status = value.status ?? 'ACTIVE';
  if (!['ACTIVE', 'INACTIVE'].includes(status)) add('status', 'Trạng thái hạng vé không hợp lệ');
  if (value._id != null && !mongoose.isValidObjectId(value._id)) add('_id', 'ID hạng vé không hợp lệ');
  if (errors.length) throw invalid(errors);
  return { _id: value._id ? new mongoose.Types.ObjectId(value._id) : new mongoose.Types.ObjectId(), name, price: Number(value.price), description, conditions, min_age: minAge, max_age: maxAge, status };
};

const normalizeTicketTypes = (values, prefix = 'ticket_types.') => {
  if (!Array.isArray(values) || !values.length || values.length > 100) throw invalid([{ field: prefix.replace(/\.$/, ''), message: 'Mỗi dịch vụ phải có từ 1 đến 100 hạng vé' }]);
  const errors = []; const names = new Set(); const ids = new Set();
  const types = values.map((value, index) => {
    try {
      const type = normalizeTicketType(value, `${prefix}${index}.`);
      const key = nameKey(type.name);
      if (names.has(key)) errors.push({ field: `${prefix}${index}.name`, message: 'Tên hạng vé đã tồn tại trong dịch vụ này' });
      if (ids.has(String(type._id))) errors.push({ field: `${prefix}${index}._id`, message: 'ID hạng vé bị trùng' });
      names.add(key); ids.add(String(type._id)); return type;
    } catch (error) { errors.push(...error.errors); return null; }
  });
  if (errors.length) throw invalid(errors);
  return types;
};

// ID ổn định giúp dữ liệu cũ vẫn đặt được trước/sau migration.
const ticketTypesOf = (service) => service.ticket_types?.length ? service.ticket_types : [{
  _id: service._id, name: service.name, price: service.base_price, description: service.description || '',
  conditions: '', min_age: null, max_age: null, status: 'ACTIVE', legacy: true
}];
const minimumPrice = (types) => Math.min(...(types.some(t => t.status === 'ACTIVE') ? types.filter(t => t.status === 'ACTIVE') : types).map(t => t.price));

module.exports = { nameKey, normalizeTicketType, normalizeTicketTypes, ticketTypesOf, minimumPrice };
