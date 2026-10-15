export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function validateImageFiles(files, currentCount = 0, maxImages = 10) {
  if (currentCount + files.length > maxImages) return `Tối đa ${maxImages} ảnh. Bạn có thể thêm ${Math.max(0, maxImages - currentCount)} ảnh nữa.`;
  if (files.some(file => !IMAGE_TYPES.includes(file.type))) return 'Chỉ nhận ảnh JPG, PNG hoặc WebP.';
  if (files.some(file => file.size > MAX_IMAGE_SIZE)) return 'Mỗi ảnh không được vượt quá 5 MB.';
  if (files.some(file => file.size === 0)) return 'File ảnh trống. Vui lòng chọn ảnh khác.';
  return '';
}

export function isUploadedImage(value) {
  try {
    const url = new URL(value);
    return typeof value === 'string' && url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && /^\/[^/]+\/image\/upload\/.+/.test(url.pathname);
  } catch { return false; }
}
