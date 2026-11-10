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
const { requirePermission } = require('../middlewares/permissionMiddleware');
const {
  verifyToken,
  authorizeExactRoles,
  ROLES,
} = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(verifyToken);

router.get("/", authorizeExactRoles(ROLES.ADMIN), requirePermission('users.view'), getUsers);
router.post("/", authorizeExactRoles(ROLES.ADMIN), requirePermission('users.create'), createUser);
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
const adminPermissionOrSelf = permission => (req, res, next) => {
  if (req.user.role === ROLES.ADMIN) return requirePermission(permission)(req, res, next);
  if (req.user.role === ROLES.MANAGER || String(req.user.id) !== req.params.id) return res.status(403).json({ success: false, message: 'Account administration requires ADMIN' });
  next();
};
router.get("/:id", adminPermissionOrSelf('users.view'), getUserById);
router.patch("/:id", adminPermissionOrSelf('users.update'), updateUser);
router.delete("/:id", authorizeExactRoles(ROLES.ADMIN), requirePermission('users.update'), deleteUser);

module.exports = router;
