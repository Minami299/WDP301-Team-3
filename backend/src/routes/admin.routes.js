const express = require("express");
const { verifyToken, authorizeExactRoles, ROLES } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/permissionMiddleware");
const admin = require("../services/admin.service");
const revenue = require("../services/revenue.service");
const { downloadRevenue } = require('../controllers/revenue.controller');

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
const financeAccess = [requirePermission('revenue.view'), authorizeExactRoles(ROLES.ADMIN, ROLES.MANAGER)];
router.get('/revenue/export', ...financeAccess, downloadRevenue());
router.get("/revenue", ...financeAccess, handle((req) => revenue.getRevenue(req.query)));

router.get("/overview", requirePermission("users.view"), handle(() => admin.getOverview()));
router.get("/users", requirePermission("users.view"), handle((req) => admin.listUsers(req.query)));
router.post("/users", requirePermission("users.create"), handle((req) => admin.createUser(req.user, req.body), 201));
router.patch("/users/:id", requirePermission("users.update"), handle((req) => admin.updateUser(req.user, req.params.id, req.body)));
router.patch("/users/:id/status", requirePermission("users.lock"), handle((req) => admin.updateUser(req.user, req.params.id, { status: req.body.status, approvalStatus: req.body.approvalStatus, reason: req.body.reason })));
router.get("/roles", requirePermission("roles.view"), handle(() => admin.listRoles()));
router.put("/roles/:id/permissions", requirePermission("roles.manage"), handle((req) => admin.setRolePermissions(req.params.id, req.body.permissions)));

module.exports = router;
