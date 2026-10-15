const mongoose = require("mongoose");
const { Facility, FacilityImage } = require("../models");
const avatarService = require("./avatar.service");
const { ROLES } = require("../middlewares/authMiddleware");

const FOLDER = "travelio/facilities";
const MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.MANAGER];

const createError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const loadFacility = async (user, facilityId) => {
  if (!mongoose.isValidObjectId(facilityId)) {
    throw createError("Invalid facility id", 400);
  }
  const facility = await Facility.findById(facilityId);
  if (!facility) throw createError("Facility not found", 404);
  const isOwner = String(facility.vendor_id) === String(user.id);
  if (!isOwner && !MANAGEMENT_ROLES.includes(user.role)) {
    throw createError("Forbidden: you do not own this facility", 403);
  }
  return facility;
};

const listImages = async (facilityId) => {
  if (!mongoose.isValidObjectId(facilityId)) {
    throw createError("Invalid facility id", 400);
  }
  return FacilityImage.find({ facility_id: facilityId }).sort({
    is_primary: -1,
    _id: 1,
  });
};

const uploadImages = async (user, facilityId, files) => {
  const facility = await loadFacility(user, facilityId);
  const hasPrimary = await FacilityImage.exists({
    facility_id: facility._id,
    is_primary: true,
  });

  const uploaded = [];
  try {
    for (const file of files) {
      uploaded.push(
        await avatarService.uploadBuffer(
          file.buffer,
          facility._id,
          file.mimetype,
          FOLDER,
        ),
      );
    }
    return await FacilityImage.insertMany(
      uploaded.map((item, index) => ({
        facility_id: facility._id,
        image_url: item.secureUrl,
        is_primary: !hasPrimary && index === 0,
      })),
    );
  } catch (error) {
    // Roll back already-uploaded assets so Cloudinary has no orphans.
    await Promise.all(
      uploaded.map((item) =>
        avatarService.deleteByPublicId(item.publicId).catch(() => {}),
      ),
    );
    throw error;
  }
};

const loadImage = async (user, facilityId, imageId) => {
  const facility = await loadFacility(user, facilityId);
  if (!mongoose.isValidObjectId(imageId)) {
    throw createError("Invalid image id", 400);
  }
  const image = await FacilityImage.findOne({
    _id: imageId,
    facility_id: facility._id,
  });
  if (!image) throw createError("Image not found", 404);
  return image;
};

const setPrimary = async (user, facilityId, imageId) => {
  const image = await loadImage(user, facilityId, imageId);
  await FacilityImage.updateMany(
    { facility_id: image.facility_id, is_primary: true },
    { $set: { is_primary: false } },
  );
  image.is_primary = true;
  await image.save();
  return image;
};

const deleteImage = async (user, facilityId, imageId) => {
  const image = await loadImage(user, facilityId, imageId);
  await avatarService.deleteByPublicId(
    avatarService.publicIdFromUrl(image.image_url),
  );
  await image.deleteOne();
  if (image.is_primary) {
    const next = await FacilityImage.findOne({ facility_id: image.facility_id });
    if (next) await FacilityImage.updateOne({ _id: next._id }, { is_primary: true });
  }
};

const uploadTemporaryImages = async (files, type = 'ROOM') => {
  if (!['ROOM', 'TICKET'].includes(type)) throw createError('Loại ảnh không hợp lệ', 400);
  const maximum = type === 'TICKET' ? 8 : 10;
  if (!Array.isArray(files) || !files.length || files.length > maximum) throw createError(`Vui lòng chọn từ 1 đến ${maximum} ảnh`, 400);
  const folder = type === 'TICKET' ? 'travelio/attractions' : 'travelio/rooms';
  const uploaded = [];
  try {
    for (const file of files) uploaded.push(await avatarService.uploadBuffer(file.buffer, type === 'TICKET' ? 'services' : 'rooms', file.mimetype, folder));
    return uploaded.map(image => image.secureUrl);
  } catch (error) {
    await Promise.allSettled(uploaded.map(image => avatarService.deleteByPublicId(image.publicId)));
    throw error;
  }
};

module.exports = { listImages, uploadImages, setPrimary, deleteImage, uploadTemporaryImages };
