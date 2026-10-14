const express = require('express');
const { quote, create, list, detail, vendorList, vendorDetail, requestCancellation, decideCancellation } = require('../controllers/booking.controller');
const { authorizeExactRoles, ROLES, verifyToken } = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();
const { User } = require('../models');
const customerAccess = async (req, res, next) => {
  try {
    const actor = await User.findById(req.user.id).select('status role_id').populate('role_id');
    if (!actor || actor.status !== 'ACTIVE' || actor.role_id?.role_name !== ROLES.CUSTOMER) return res.status(403).json({ success: false, message: 'Tài khoản không có quyền đặt vé' });
    next();
  } catch (error) { next(error); }
};
const vendorAccess = [verifyToken, requirePermission('vendor.dashboard'), authorizeExactRoles(ROLES.ACTIVITY_VENDOR)];

router.post('/quote', verifyToken, customerAccess, quote);
router.post('/', verifyToken, customerAccess, create);
router.get('/', verifyToken, customerAccess, list);
router.get('/vendor', ...vendorAccess, vendorList);
router.get('/vendor/:id', ...vendorAccess, vendorDetail);
router.patch('/vendor/:id/cancellations/:requestId', ...vendorAccess, decideCancellation);
router.post('/:id/cancellations', verifyToken, customerAccess, requestCancellation);
router.get('/:id', verifyToken, customerAccess, detail);

module.exports = router;
