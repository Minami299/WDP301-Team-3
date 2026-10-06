const jwt = require('jsonwebtoken');
const env = require('../configs/env');

/**
 * Định nghĩa danh sách các vai trò (Roles) trong hệ thống
 */
const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  HOTEL_OWNER: 'HOTEL_OWNER',
  ACTIVITY_VENDOR: 'ACTIVITY_VENDOR',
  CUSTOMER: 'CUSTOMER'
};

/**
 * Cấu hình phân tầng vai trò (Role Hierarchy).
 * Vai trò cấp cao hơn kế thừa quyền hạn của các vai trò cấp dưới.
 */
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HOTEL_OWNER,
    ROLES.ACTIVITY_VENDOR,
    ROLES.CUSTOMER
  ],
  [ROLES.MANAGER]: [
    ROLES.MANAGER,
    ROLES.HOTEL_OWNER,
    ROLES.ACTIVITY_VENDOR,
    ROLES.CUSTOMER
  ],
  [ROLES.HOTEL_OWNER]: [
    ROLES.HOTEL_OWNER,
    ROLES.CUSTOMER
  ],
  [ROLES.ACTIVITY_VENDOR]: [
    ROLES.ACTIVITY_VENDOR,
    ROLES.CUSTOMER
  ],
  [ROLES.CUSTOMER]: [
    ROLES.CUSTOMER
  ]
};

/**
 * Hàm hỗ trợ tạo JWT token từ payload
 * @param {object} payload Dữ liệu đính kèm vào token (vd: { id, email, role })
 * @param {string|number} expiresIn Thời hạn hiệu lực của token (mặc định lấy từ process.env.JWT_EXPIRES_IN hoặc '1d')
 * @returns {string} Chuỗi JWT token
 */
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '1d') => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn });
};

/**
 * Middleware xác thực JSON Web Token (JWT) từ request header Authorization (Bearer <token>)
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access token is missing or unauthorized'
    });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, env.jwtSecret, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired'
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Invalid token'
      });
    }

    req.user = decoded;
    next();
  });
};

/**
 * Middleware kiểm tra quyền theo phân tầng vai trò (Role Hierarchy).
 * Người dùng có role thuộc cấp cao hơn sẽ tự động có quyền truy cập vào tài nguyên của cấp dưới.
 * @param {...string} allowedRoles Danh sách các vai trò được phép truy cập
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User role not found in token'
      });
    }

    const userRole = req.user.role;
    const userInheritedRoles = ROLE_HIERARCHY[userRole] || [userRole];

    const hasPermission = allowedRoles.some((role) => userInheritedRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to perform this action'
      });
    }

    next();
  };
};

/**
 * Middleware kiểm tra chính xác vai trò (Strict / Exact role check, không qua kế thừa)
 * Sử dụng cho các tác vụ mang tính chuyên biệt chỉ một số vai trò được phép.
 * @param {...string} exactRoles Danh sách các role cụ thể
 */
const authorizeExactRoles = (...exactRoles) => {
  return (req, res, next) => {
    if (!req.user || !exactRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to perform this action'
      });
    }
    next();
  };
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  generateToken,
  verifyToken,
  authorizeRoles,
  authorizeExactRoles
};
