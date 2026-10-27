const express = require('express');
const controller = require('../controllers/vendor.controller');
const attractions = require('../controllers/attraction.controller');
const { authorizeExactRoles, ROLES, verifyToken } = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');
const { readPartnerRevenue, downloadRevenue } = require('../controllers/revenue.controller');

const router = express.Router();

router.use(verifyToken);
const partnerFinanceAccess = [requirePermission('vendor.dashboard'), authorizeExactRoles(ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR)];
router.get('/revenue', ...partnerFinanceAccess, readPartnerRevenue);
router.get('/revenue/export', ...partnerFinanceAccess, downloadRevenue(true));
const attractionAccess = [requirePermission('vendor.dashboard'), authorizeExactRoles(ROLES.ACTIVITY_VENDOR)];
router.get('/payments', ...attractionAccess, controller.getPaymentTransactions);
router.get('/attractions', ...attractionAccess, attractions.list);
router.post('/attractions', ...attractionAccess, attractions.create);
router.put('/attractions/:facilityId', ...attractionAccess, attractions.update);
router.post('/attractions/:facilityId/tickets', ...attractionAccess, attractions.createTicket);
router.put('/tickets/:ticketId', ...attractionAccess, attractions.updateTicket);
router.delete('/tickets/:ticketId', ...attractionAccess, attractions.deleteTicket);
router.post('/tickets/:ticketId/ticket-types', ...attractionAccess, attractions.createTicketType);
router.put('/tickets/:ticketId/ticket-types/:typeId', ...attractionAccess, attractions.updateTicketType);
router.delete('/tickets/:ticketId/ticket-types/:typeId', ...attractionAccess, attractions.deleteTicketType);
router.get('/tickets/:ticketId/inventory', ...attractionAccess, attractions.listInventory);
router.put('/tickets/:ticketId/inventory', ...attractionAccess, attractions.saveInventory);
router.get('/dashboard', requirePermission('vendor.dashboard'), controller.getDashboard);
router.get('/profile', requirePermission('vendor.dashboard'), controller.getPartnerProfile);
router.post('/facilities/:facilityId/rooms', requirePermission('vendor.dashboard'), controller.createRoom);
router.put('/rooms/:roomId', requirePermission('vendor.dashboard'), controller.updateRoom);
router.delete('/rooms/:roomId', requirePermission('vendor.dashboard'), controller.deleteRoom);
const hotelOrStaff = authorizeExactRoles(ROLES.HOTEL_OWNER, ROLES.ADMIN, ROLES.MANAGER);
router.post('/qr/verify', requirePermission('vendor.qr'), hotelOrStaff, controller.verifyQr);
router.get('/qr/scans', requirePermission('vendor.qr'), hotelOrStaff, controller.getQrScans);
// Payout requests belong to partners; admins review them through /api/admin/settlements.
const partnerOnly = authorizeExactRoles(ROLES.HOTEL_OWNER, ROLES.ACTIVITY_VENDOR);
router.get('/settlements', requirePermission('vendor.settlements'), partnerOnly, controller.getSettlements);
router.post('/settlements', requirePermission('vendor.settlements'), partnerOnly, controller.createSettlement);
router.get('/settlements/:id', requirePermission('vendor.settlements'), partnerOnly, controller.getSettlement);

module.exports = router;
