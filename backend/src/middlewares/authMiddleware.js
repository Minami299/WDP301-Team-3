const jwt = require('jsonwebtoken');

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

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
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
 * Middleware kiểm tra quyền truy cập dựa trên vai trò người dùng (Role-based Access Control)
 * @param  {...string} roles Danh sách các role được phép truy cập (vd: 'Admin', 'User')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to perform this action'
      });
    }
    next();
  };
};

/**
 * Hàm hỗ trợ tạo JWT token từ payload
 * @param {object} payload Dữ liệu đính kèm vào token (vd: { id, email, role })
 * @param {string|number} expiresIn Thời hạn hiệu lực của token (mặc định lấy từ process.env.JWT_EXPIRES_IN hoặc '1d')
 * @returns {string} Chuỗi JWT token
 */
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '1d') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

module.exports = {
  verifyToken,
  authorizeRoles,
  generateToken
};
