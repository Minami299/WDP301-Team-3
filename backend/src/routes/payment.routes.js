const express = require('express');
const payment = require('../services/payment.service');

const router = express.Router();

// Public endpoint called by SePay; authenticated by the Apikey header, not a user JWT.
router.post('/sepay/webhook', async (req, res) => {
  try {
    await payment.handleWebhook(req.headers.authorization, req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) console.error('SePay webhook failed', error.message);
    res.status(status).json({ success: false, message: error.message });
  }
});

module.exports = router;
