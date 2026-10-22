const express = require("express");
const facilityController = require("../controllers/facility.controller");
const { verifyToken, authorizeExactRoles, ROLES } = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

const jwt = require("jsonwebtoken");
const env = require("../configs/env");

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      req.user = jwt.verify(token, env.jwtSecret);
    } catch {
      // ignore invalid token in optionalAuth
    }
  }
  next();
};

// Public routes for searching facilities and getting options
router.get("/", facilityController.search);
router.get("/locations", facilityController.searchLocations);
router.get("/filters/options", facilityController.getFilterOptions);
const partnerAccess = [verifyToken, authorizeExactRoles(ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR), requirePermission('vendor.dashboard')];
router.get('/reviews/managed', ...partnerAccess, facilityController.managedReviews);
router.get("/:id", optionalAuth, facilityController.getById);
router.get("/:id/ticket-availability", facilityController.ticketAvailability);

// Real Customer Reviews & Replies
router.post("/:id/reviews", optionalAuth, facilityController.createReview);
router.post("/:id/reviews/:reviewId/reply", ...partnerAccess, facilityController.replyReview);
router.put("/:id/reviews/:reviewId/reply", ...partnerAccess, facilityController.replyReview);

module.exports = router;
