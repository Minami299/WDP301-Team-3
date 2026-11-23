const express = require('express');
const checkin = require('../services/checkin.service');
const { rateLimit } = require('../middlewares/rateLimit');
const { authorizeExactRoles, ROLES, verifyToken } = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

const tooMany = 'Quá nhiều lượt quét từ thiết bị này. Vui lòng thử lại sau ít phút.';
// Limits apply per signed-in account (limiters run after auth): one busy gate shares a single IP.
const byAccount = (req) => (req.user?.id ? `user:${req.user.id}` : null);
const readLimit = rateLimit({ windowMs: 60 * 1000, max: 120, message: tooMany, keyOf: byAccount });
const confirmLimit = rateLimit({ windowMs: 60 * 1000, max: 60, message: tooMany, keyOf: byAccount });

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const respond = (handler) => async (req, res, next) => {
  try {
    res.json({ success: true, data: await handler(req) });
  } catch (error) {
    next(error);
  }
};

// A guest holding the QR cannot redeem it: only signed-in staff of the owning facility can.
const staffOnly = [
  verifyToken,
  authorizeExactRoles(ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR),
  requirePermission('vendor.qr')
];

router.get('/:code', ...staffOnly, readLimit, respond((req) => checkin.previewCheckin(checkin.normalizeCode(req.params.code), req.user)));
router.post('/:code/confirm', ...staffOnly, confirmLimit, respond((req) => checkin.confirmCheckin(
  checkin.normalizeCode(req.params.code),
  { user: req.user, ip: req.ip, userAgent: req.get('user-agent') }
)));

module.exports = router;
