export const businessTypes = {
  ATTRACTION: 'Attraction', TOUR: 'Tour', TICKET: 'Ticket', MULTIPLE_SERVICES: 'Multiple Services'
};

export const emptyBusinessInformation = {
  facility_name: '', facility_address: '', facility_city: '', phone: '',
  business_type: 'ATTRACTION', facility_description: ''
};

export function validateBusinessInformation(values) {
  const errors = {};
  const requiredText = (field, label, limit) => {
    if (!values[field]?.trim()) errors[field] = `Vui lòng nhập ${label}`;
    else if (values[field].trim().length > limit) errors[field] = `${label} không được quá ${limit} ký tự`;
  };
  requiredText('facility_name', 'tên cơ sở kinh doanh', 200);
  requiredText('facility_address', 'địa chỉ kinh doanh', 300);
  requiredText('facility_city', 'tỉnh / thành phố', 120);
  requiredText('phone', 'số điện thoại liên hệ', 30);
  if (values.phone?.trim() && (!/^\+?[\d\s().-]+$/.test(values.phone.trim()) || !/^\d{9,15}$/.test(values.phone.replace(/\D/g, '')))) errors.phone = 'Số điện thoại phải có từ 9 đến 15 chữ số';
  if (!Object.hasOwn(businessTypes, values.business_type)) errors.business_type = 'Vui lòng chọn loại hình kinh doanh';
  if (values.facility_description.length > 5000) errors.facility_description = 'Mô tả không được quá 5000 ký tự';
  return errors;
}

export function validateAccountInformation(values, existingAccount = false) {
  const errors = {};
  if (!values.full_name.trim() || values.full_name.trim().length > 120) errors.full_name = 'Vui lòng nhập họ tên, tối đa 120 ký tự';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Vui lòng nhập email hợp lệ';
  if (!existingAccount) {
    if (values.password.length < 8) errors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    else if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) errors.password = 'Mật khẩu phải có chữ cái và chữ số';
    if (!values.confirm_password || values.confirm_password !== values.password) errors.confirm_password = 'Mật khẩu xác nhận không khớp';
  }
  if (!values.agree_terms) errors.agree_terms = 'Vui lòng đồng ý Terms & Privacy Policy';
  return errors;
}
