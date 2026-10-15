const isUploadedImage = value => {
  if (typeof value !== 'string' || value.length > 2048) return false;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloud) return false;
  try {
    const url = new URL(value);
    const prefix = `/${cloud}/image/upload/`;
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && !url.username && !url.password && url.pathname.startsWith(prefix) && url.pathname.length > prefix.length;
  } catch { return false; }
};

const normalizeImageUrls = (photos = [], maxImages = 10, field = 'photos') => {
  if (!Array.isArray(photos) || photos.length > maxImages || photos.some(photo => !isUploadedImage(typeof photo === 'string' ? photo.trim() : photo))) {
    const message = `Vui lòng tải tối đa ${maxImages} ảnh từ thiết bị lên Cloudinary của Travelio.`;
    throw Object.assign(new Error(message), { statusCode: 400, errors: [{ field, message }] });
  }
  return photos.map(photo => photo.trim());
};

const validateHotelImages = payload => {
  normalizeImageUrls(payload.photos, 200);
  if (Array.isArray(payload.rooms)) payload.rooms.forEach((room, index) => normalizeImageUrls(room.photos, 10, `rooms.${index}.photos`));
};

module.exports = { isUploadedImage, normalizeImageUrls, validateHotelImages };
