const express = require('express');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/user.controller');
const { verifyToken, authorizeRoles, ROLES } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.get('/', authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), getUsers);
router.post('/', authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), createUser);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.delete('/:id', authorizeRoles(ROLES.ADMIN), deleteUser);

module.exports = router;
