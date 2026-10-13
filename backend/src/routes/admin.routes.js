const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/permissionMiddleware");
const admin = require("../services/admin.service");

const router = express.Router();

const handle = (fn, status = 200) => async (req, res) => {
  try {
    res.status(status).json({ success: true, data: await fn(req) });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message });
  }
};

router.use(verifyToken);

router.get("/overview", requirePermission("users.view"), handle(() => admin.getOverview()));
router.get("/users", requirePermission("users.view"), handle((req) => admin.listUsers(req.query)));
router.post("/users", requirePermission("users.create"), handle((req) => admin.createUser(req.user, req.body), 201));
router.patch("/users/:id", requirePermission("users.update"), handle((req) => admin.updateUser(req.user, req.params.id, req.body)));
router.patch("/users/:id/status", requirePermission("users.lock"), handle((req) => admin.setStatus(req.user, req.params.id, req.body.status)));
router.get("/roles", requirePermission("roles.view"), handle(() => admin.listRoles()));
router.put("/roles/:id/permissions", requirePermission("roles.manage"), handle((req) => admin.setRolePermissions(req.params.id, req.body.permissions)));

module.exports = router;
