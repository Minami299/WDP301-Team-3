export const makeTicketType = () => ({ client_id: crypto.randomUUID(), name: '', price: '', description: '', conditions: '', min_age: '', max_age: '', status: 'ACTIVE' });
export const ticketTypesForForm = (service) => service.ticket_types?.length ? service.ticket_types.map(t => ({ ...t, min_age: t.min_age ?? '', max_age: t.max_age ?? '' })) : service.base_price !== '' && service.base_price != null ? [{ ...makeTicketType(), ...(service._id ? { _id: service._id } : {}), name: service.name || '', price: service.base_price }] : [makeTicketType()];
export const nameKey = name => name.trim().normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase('vi');
export const ageLabel = t => t.min_age !== '' && t.min_age != null && t.max_age !== '' && t.max_age != null ? `${t.min_age}–${t.max_age} tuổi` : t.min_age !== '' && t.min_age != null ? `Từ ${t.min_age} tuổi` : t.max_age !== '' && t.max_age != null ? `Đến ${t.max_age} tuổi` : 'Mọi độ tuổi';
export function validateTicketTypes(types, prefix = 'ticket_types.') {
  const errors = {}; const seen = new Set();
  if (!Array.isArray(types) || !types.length || types.length > 100) return { [prefix.replace(/\.$/, '')]: 'Mỗi dịch vụ cần từ 1 đến 100 hạng vé' };
  types.forEach((t, i) => {
    const key = `${prefix}${i}.`;
    if (!t.name.trim() || t.name.length > 200) errors[key + 'name'] = 'Tên hạng vé bắt buộc, tối đa 200 ký tự';
    else if (seen.has(nameKey(t.name))) errors[key + 'name'] = 'Tên hạng vé đã tồn tại trong dịch vụ này';
    seen.add(nameKey(t.name));
    if (t.price == null || String(t.price).trim() === '' || !Number.isFinite(Number(t.price)) || Number(t.price) < 0 || Number(t.price) > Number.MAX_SAFE_INTEGER) errors[key + 'price'] = 'Giá vé phải là số hợp lệ, không âm; nhập 0 cho vé miễn phí';
    for (const field of ['min_age', 'max_age']) if (t[field] != null && t[field] !== '' && (!Number.isInteger(Number(t[field])) || Number(t[field]) < 0 || Number(t[field]) > 150)) errors[key + field] = 'Độ tuổi phải là số nguyên từ 0 đến 150';
    if (t.min_age != null && t.min_age !== '' && t.max_age != null && t.max_age !== '' && Number(t.min_age) > Number(t.max_age)) errors[key + 'max_age'] = 'Tuổi tối đa không được nhỏ hơn tuổi tối thiểu';
    for (const field of ['description', 'conditions']) if ((t[field] || '').length > 2000) errors[key + field] = 'Nội dung tối đa 2000 ký tự';
  });
  return errors;
}
export function ticketTypePayload(t) {
  return { ...(t._id ? { _id: t._id } : {}), name: t.name.trim(), price: Number(t.price), description: t.description || '', conditions: t.conditions || '', min_age: t.min_age === '' || t.min_age == null ? null : Number(t.min_age), max_age: t.max_age === '' || t.max_age == null ? null : Number(t.max_age), status: t.status || 'ACTIVE' };
}
