const express = require('express');
const {
  ROLES,
  ROLE_HIERARCHY,
  generateToken,
  verifyToken,
  authorizeRoles,
  authorizeExactRoles
} = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/test/auth/token
 * @desc    Cấp token test cho một vai trò (chỉ dùng để kiểm thử phân quyền, KHÔNG dùng thật)
 * @body    { "role": "CUSTOMER", "email": "optional@example.com" }
 */
router.post('/token', (req, res) => {
  const { role, email } = req.body;

  if (!role || !ROLES[role]) {
    return res.status(400).json({
      success: false,
      message: `Role không hợp lệ. Chỉ nhận: ${Object.keys(ROLES).join(', ')}`
    });
  }

  const token = generateToken({
    id: 'test-user-id',
    email: email || `${role.toLowerCase()}@test.local`,
    role
  });

  return res.status(200).json({
    success: true,
    token,
    role,
    inheritedRoles: ROLE_HIERARCHY[role]
  });
});

/**
 * @route   GET /api/test/auth/me
 * @desc    Chỉ cần token hợp lệ (không kiểm tra role)
 */
router.get('/me', verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token hợp lệ',
    user: req.user
  });
});

/**
 * @route   GET /api/test/auth/admin-only
 * @desc    Chỉ ADMIN mới vào được (không kế thừa)
 */
router.get('/admin-only', verifyToken, authorizeExactRoles(ROLES.ADMIN), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Truy cập được khu vực ADMIN',
    userRole: req.user.role
  });
});

/**
 * @route   GET /api/test/auth/manager-area
 * @desc    Khu vực quản lý - MANAGER trở xuống đều được vào
 */
router.get(
  '/manager-area',
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Truy cập được khu vực MANAGER',
      userRole: req.user.role
    });
  }
);

/**
 * @route   GET /api/test/auth/hotel-area
 * @desc    Khu vực quản lý khách sạn - HOTEL_OWNER trở xuống đều được vào
 */
router.get(
  '/hotel-area',
  verifyToken,
  authorizeRoles(ROLES.HOTEL_OWNER),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Truy cập được khu vực HOTEL_OWNER',
      userRole: req.user.role
    });
  }
);

/**
 * @route   GET /api/test/auth/vendor-area
 * @desc    Khu vực nhà cung cấp - chỉ ACTIVITY_VENDOR và các cấp cao hơn
 */
router.get(
  '/vendor-area',
  verifyToken,
  authorizeRoles(ROLES.ACTIVITY_VENDOR),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Truy cập được khu vực ACTIVITY_VENDOR',
      userRole: req.user.role
    });
  }
);

/**
 * @route   GET /api/test/auth/customer-area
 * @desc    Khu vực khách hàng - mọi role đều được vào
 */
router.get(
  '/customer-area',
  verifyToken,
  authorizeRoles(ROLES.CUSTOMER),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Truy cập được khu vực CUSTOMER',
      userRole: req.user.role
    });
  }
);

/**
 * @route   GET /api/test/auth/roles
 * @desc    Xem cấu hình phân tầng vai trò
 */
router.get('/roles', (req, res) => {
  res.status(200).json({ success: true, data: ROLE_HIERARCHY });
});

module.exports = router;