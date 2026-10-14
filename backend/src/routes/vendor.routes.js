const express = require('express');
const controller = require('../controllers/vendor.controller');
const { authorizeExactRoles, ROLES, verifyToken } = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(verifyToken);
router.get('/dashboard', requirePermission('vendor.dashboard'), controller.getDashboard);
router.get('/profile', requirePermission('vendor.dashboard'), controller.getPartnerProfile);
router.post('/facilities/:facilityId/rooms', requirePermission('vendor.dashboard'), controller.createRoom);
router.put('/rooms/:roomId', requirePermission('vendor.dashboard'), controller.updateRoom);
router.delete('/rooms/:roomId', requirePermission('vendor.dashboard'), controller.deleteRoom);
router.post('/qr/verify', requirePermission('vendor.qr'), controller.verifyQr);
router.get('/qr/scans', requirePermission('vendor.qr'), controller.getQrScans);
router.get('/settlements', requirePermission('vendor.settlements'), controller.getSettlements);
router.post('/settlements', requirePermission('vendor.settlements'), controller.createSettlement);
router.patch(
  '/settlements/:id',
  requirePermission('vendor.settlements'),
  authorizeExactRoles(ROLES.ADMIN, ROLES.MANAGER),
  controller.decideSettlement
);

module.exports = router;