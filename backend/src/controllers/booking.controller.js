const bookingService = require('../services/booking.service');

const quote = async (req, res, next) => {
  try {
    const data = await bookingService.quoteBooking(req.user.id, req.body);
    res.status(200).json({ success: true, data, message: 'Invoice quote calculated' });
  } catch (error) {
    next(error);
  }
};

module.exports = { quote };