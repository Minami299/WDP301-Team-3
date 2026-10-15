import { makeTicketType, validateTicketTypes, ticketTypePayload } from './ticketTypes';
import { isUploadedImage } from './imageUpload';
export const serviceCategories = { ATTRACTION: 'Attraction', TOUR: 'Tour', TICKET: 'Ticket', EXPERIENCE: 'Experience' };
export const pricingUnits = { PERSON: 'Người', TICKET: 'Vé', TOUR: 'Tour', PACKAGE: 'Gói' };
export const blankVendorService = { name: '', service_category: 'ATTRACTION', description: '', location: '', base_price: '', pricing_unit: 'PERSON', duration_minutes: '', ticket_audience: 'ALL', photos: [] };
export const makeVendorService = () => ({ ...blankVendorService, photos: [], ticket_types: [makeTicketType()], client_id: crypto.randomUUID() });

export function validateServiceFields(value, prefix = '') {
  const errors = {};
  const add = (field, message) => { errors[`${prefix}${field}`] = message; };
  if (!value.name.trim() || value.name.trim().length > 200) add('name', 'Vui lòng nhập tên dịch vụ, tối đa 200 ký tự');
  if (!Object.hasOwn(serviceCategories, value.service_category)) add('service_category', 'Vui lòng chọn loại dịch vụ');
  if (!Object.hasOwn(pricingUnits, value.pricing_unit)) add('pricing_unit', 'Vui lòng chọn đơn vị tính');
  Object.assign(errors, validateTicketTypes(value.ticket_types, `${prefix}ticket_types.`));
  if (value.description.length > 5000) add('description', 'Mô tả tối đa 5000 ký tự');
  if (value.location.length > 300 || (value.service_category !== 'TICKET' && !value.location.trim())) add('location', 'Vui lòng nhập địa điểm, tối đa 300 ký tự');
  if (['TOUR', 'EXPERIENCE'].includes(value.service_category) && value.duration_minutes !== '' && value.duration_minutes != null && (!Number.isSafeInteger(Number(value.duration_minutes)) || Number(value.duration_minutes) < 1)) add('duration_minutes', 'Thời lượng phải là số phút nguyên lớn hơn 0');
  if (!Array.isArray(value.photos) || value.photos.length > 8 || value.photos.some(photo => !isUploadedImage(photo) || photo.length > 2048)) add('photos', 'Vui lòng tải tối đa 8 ảnh từ thiết bị lên Cloudinary.');
  return errors;
}

export function validateServiceList(services) {
  if (!services.length || services.length > 20) return { services: 'Vui lòng thêm từ 1 đến 20 dịch vụ' };
  return Object.assign({}, ...services.map((service, index) => validateServiceFields(service, `services.${index}.`)));
}

export function servicePayload(value) {
  const { client_id: _clientId, _id: _serviceId, facility_id: _facilityId, base_price: _oldPrice, ...fields } = value;
  return { ...fields, ticket_types: fields.ticket_types.map(ticketTypePayload), duration_minutes: ['TOUR', 'EXPERIENCE'].includes(fields.service_category) && fields.duration_minutes != null && fields.duration_minutes !== '' ? Number(fields.duration_minutes) : null };
}
