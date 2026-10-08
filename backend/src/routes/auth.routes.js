const express = require('express');
const { register, login, getMe, becomePartner } = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.post('/become-partner', verifyToken, becomePartner);

module.exports = router;

