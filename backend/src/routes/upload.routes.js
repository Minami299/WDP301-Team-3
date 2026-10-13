const express = require("express");
const { receiveImages } = require("../middlewares/imageUpload");
const {
  verifyToken,
  authorizeRoles,
  ROLES,
} = require("../middlewares/authMiddleware");
const imageService = require("../services/facilityImage.service");

const router = express.Router();
const vendorRoles = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.HOTEL_OWNER,
  ROLES.ACTIVITY_VENDOR,
];

const handle = (fn, status = 200) => async (req, res) => {
  try {
    const data = await fn(req);
    res.status(status).json({ success: true, data });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message, code: error.code });
  }
};

router.get(
  "/facilities/:facilityId/images",
  handle((req) => imageService.listImages(req.params.facilityId)),
);

router.use(verifyToken, authorizeRoles(...vendorRoles));

router.post(
  "/facilities/:facilityId/images",
  receiveImages,
  handle(
    (req) => imageService.uploadImages(req.user, req.params.facilityId, req.files),
    201,
  ),
);
router.patch(
  "/facilities/:facilityId/images/:imageId/primary",
  handle((req) =>
    imageService.setPrimary(req.user, req.params.facilityId, req.params.imageId),
  ),
);
router.delete(
  "/facilities/:facilityId/images/:imageId",
  handle(async (req) => {
    await imageService.deleteImage(req.user, req.params.facilityId, req.params.imageId);
    return null;
  }),
);

module.exports = router;
