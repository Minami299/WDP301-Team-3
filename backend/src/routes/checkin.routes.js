const express = require('express');
const checkin = require('../services/checkin.service');
const { rateLimit } = require('../middlewares/rateLimit');

const router = express.Router();

const tooMany = 'Quá nhiều lượt quét từ thiết bị này. Vui lòng thử lại sau ít phút.';
const readLimit = rateLimit({ windowMs: 60 * 1000, max: 30, message: tooMany });
const confirmLimit = rateLimit({ windowMs: 60 * 1000, max: 10, message: tooMany });

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const respond = (handler) => async (req, res, next) => {
  try {
    res.json({ success: true, data: await handler(req) });
  } catch (error) {
    next(error);
  }
};

router.get('/:code', readLimit, respond((req) => checkin.previewCheckin(checkin.normalizeCode(req.params.code))));
router.post('/:code/confirm', confirmLimit, respond((req) => checkin.confirmCheckin(
  checkin.normalizeCode(req.params.code),
  { ip: req.ip, userAgent: req.get('user-agent') }
)));

module.exports = router;
