const express = require("express");
const facilityController = require("../controllers/facility.controller");

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
router.get("/filters/options", facilityController.getFilterOptions);
router.get("/:id", facilityController.getById);
router.get("/:id/ticket-availability", facilityController.ticketAvailability);

// Real Customer Reviews & Replies
router.post("/:id/reviews", optionalAuth, facilityController.createReview);
router.post("/:id/reviews/:reviewId/reply", optionalAuth, facilityController.replyReview);
router.put("/:id/reviews/:reviewId/reply", optionalAuth, facilityController.replyReview);

module.exports = router;
