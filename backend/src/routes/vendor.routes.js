const express = require('express');
const controller = require('../controllers/vendor.controller');
const {
  authorizeExactRoles,
  authorizeRoles,
  ROLES,
  verifyToken
} = require('../middlewares/authMiddleware');

const router = express.Router();
const vendorRoles = [ROLES.ADMIN, ROLES.MANAGER, ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR];

router.use(verifyToken, authorizeRoles(...vendorRoles));
router.get('/dashboard', controller.getDashboard);
router.post('/qr/verify', controller.verifyQr);
router.get('/qr/scans', controller.getQrScans);
router.get('/settlements', controller.getSettlements);
router.post('/settlements', controller.createSettlement);
router.patch(
  '/settlements/:id',
  authorizeExactRoles(ROLES.ADMIN, ROLES.MANAGER),
  controller.decideSettlement
);

module.exports = router;