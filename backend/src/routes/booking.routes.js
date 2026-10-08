const express = require('express');
const { quote } = require('../controllers/booking.controller');
const { authorizeExactRoles, ROLES, verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/quote', verifyToken, authorizeExactRoles(ROLES.CUSTOMER), quote);

module.exports = router;