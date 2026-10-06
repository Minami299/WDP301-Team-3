const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/user.controller');
const { verifyToken, authorizeRoles, ROLES } = require('../middlewares/authMiddleware');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);

// User management routes
router.get('/', verifyToken, authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), getUsers);
router.post('/', verifyToken, authorizeRoles(ROLES.ADMIN), createUser);
router.get('/:id', verifyToken, getUserById);
router.patch('/:id', verifyToken, updateUser);
router.delete('/:id', verifyToken, authorizeRoles(ROLES.ADMIN), deleteUser);

module.exports = router;