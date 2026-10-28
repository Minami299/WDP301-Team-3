const express = require("express");
const { verifyToken, authorizeExactRoles, ROLES } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../middlewares/permissionMiddleware");
const admin = require("../services/admin.service");
const payouts = require("../services/payout.service");
const settlementSettings = require("../services/settlementSettings");
const revenue = require("../services/revenue.service");
const analytics = require('../services/adminAnalytics.service');
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

// Only ADMIN and MANAGER reach /admin; each endpoint then checks the permission granted to the role.
router.use(verifyToken, authorizeExactRoles(ROLES.ADMIN, ROLES.MANAGER));
router.get('/analytics', requirePermission('analytics.view'), handle(req => analytics.getAnalytics(req.query)));
const financeAccess = [requirePermission('revenue.view')];
router.get('/revenue/export', ...financeAccess, downloadRevenue());
router.get("/revenue", ...financeAccess, handle((req) => revenue.getRevenue(req.query)));

router.get("/overview", requirePermission("users.view"), handle(() => admin.getOverview()));
router.get("/users", requirePermission("users.view"), handle((req) => admin.listUsers(req.query)));
router.post("/users", requirePermission("users.create"), handle((req) => admin.createUser(req.user, req.body), 201));
router.patch("/users/:id", requirePermission("users.update"), handle((req) => admin.updateUser(req.user, req.params.id, req.body)));
router.patch("/users/:id/status", requirePermission("users.lock"), handle((req) => admin.updateUser(req.user, req.params.id, { status: req.body.status, approvalStatus: req.body.approvalStatus, reason: req.body.reason })));
router.get("/settlements", requirePermission("payouts.review"), handle((req) => payouts.listPayouts(req.query)));
router.get("/settlements/:id", requirePermission("payouts.review"), handle((req) => payouts.getPayout(req.params.id)));
router.patch("/settlements/:id", requirePermission("payouts.review"), handle((req) => payouts.decidePayout(req.user.id, req.params.id, req.body)));
router.get("/settings/settlement", requirePermission("payouts.review"), handle(() => settlementSettings.getSettlementSettings()));
router.put("/settings/settlement", requirePermission("payouts.review"), authorizeExactRoles(ROLES.ADMIN), handle((req) => settlementSettings.updateSettlementSettings(req.body)));
router.get("/roles", requirePermission("roles.view"), handle(() => admin.listRoles()));
router.put("/roles/:id/permissions", requirePermission("roles.manage"), handle((req) => admin.setRolePermissions(req.params.id, req.body.permissions)));

// Platform Pricing & System Configs
router.get("/configs", requirePermission("pricing.manage"), handle(() => admin.listConfigs()));
router.put("/configs/:key", requirePermission("pricing.manage"), handle((req) => admin.updateConfig(req.user, req.params.key, req.body)));
router.get("/facilities-commission", requirePermission("pricing.manage"), handle((req) => admin.listFacilitiesCommission(req.query)));
router.put("/facilities-commission/:id", requirePermission("pricing.manage"), handle((req) => admin.updateFacilityCommission(req.user, req.params.id, req.body.commission_rate)));

// Discount Vouchers & Promotions Management
router.get("/promotions/types", requirePermission("promotions.manage"), handle(() => admin.listVoucherTypes()));
router.get("/promotions", requirePermission("promotions.manage"), handle((req) => admin.listPromotions(req.query)));
router.post("/promotions", requirePermission("promotions.manage"), handle((req) => admin.createPromotion(req.user, req.body), 201));
router.patch("/promotions/:id", requirePermission("promotions.manage"), handle((req) => admin.updatePromotion(req.user, req.params.id, req.body)));
router.delete("/promotions/:id", requirePermission("promotions.manage"), handle((req) => admin.deletePromotion(req.user, req.params.id)));

module.exports = router;
