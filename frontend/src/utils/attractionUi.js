export const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500';
export const buttonClass = 'rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50';
export const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
export const categories = { ATTRACTION: 'Điểm tham quan', TOUR: 'Tour du lịch', EXPERIENCE: 'Hoạt động trải nghiệm' };
export const audiences = { ADULT: 'Người lớn', CHILD: 'Trẻ em', ALL: 'Mọi đối tượng' };
export const localDate = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
