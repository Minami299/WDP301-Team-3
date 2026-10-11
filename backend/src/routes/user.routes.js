const express = require("express");
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  uploadMyAvatar,
  deleteMyAvatar,
  requestMyEmailChange,
  verifyMyEmailChange,
} = require("../controllers/user.controller");
const { receiveAvatar } = require("../middlewares/avatarUpload");
const {
  verifyToken,
  authorizeRoles,
  authorizeExactRoles,
  ROLES,
} = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(verifyToken);

router.get("/", authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), getUsers);
router.post("/", authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), createUser);
router.get("/me", getMyProfile);
router.put("/me", authorizeExactRoles(ROLES.CUSTOMER), updateMyProfile);
router.post(
  "/me/avatar",
  authorizeExactRoles(ROLES.CUSTOMER),
  receiveAvatar,
  uploadMyAvatar,
);
router.delete(
  "/me/avatar",
  authorizeExactRoles(ROLES.CUSTOMER),
  deleteMyAvatar,
);
router.post(
  "/me/email-change",
  authorizeExactRoles(ROLES.CUSTOMER),
  requestMyEmailChange,
);
router.post(
  "/me/email-change/verify",
  authorizeExactRoles(ROLES.CUSTOMER),
  verifyMyEmailChange,
);
router.put("/me/change-password", changeMyPassword);
router.get("/:id", getUserById);
router.patch("/:id", updateUser);
router.delete("/:id", authorizeRoles(ROLES.ADMIN), deleteUser);

module.exports = router;
