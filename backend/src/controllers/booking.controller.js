const bookingService = require('../services/booking.service');
const paymentService = require('../services/payment.service');

const quote = async (req, res, next) => {
  try {
    const data = await bookingService.quoteBooking(req.user.id, req.body);
    res.status(200).json({ success: true, data, message: 'Invoice quote calculated' });
  } catch (error) {
    next(error);
  }
};

const handle = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); }
  catch (error) { next(error); }
};
module.exports = {
  quote,
  promotions: handle(req => bookingService.listAvailablePromotions(req.user.id)),
  create: handle(req => bookingService.createBooking(req.user.id, req.body), 201),
  createRoom: handle(req => bookingService.createRoomBooking(req.user.id, req.body), 201),
  list: handle(req => bookingService.listBookings(req.user.id)),
  detail: handle(req => bookingService.bookingForCustomer(req.user.id, req.params.id)),
  paymentInfo: handle(req => paymentService.getPaymentInfo(req.user.id, req.params.id)),
  verifyPayment: handle(req => paymentService.verifyPayment(req.user.id, req.params.id)),
  vendorList: handle(req => bookingService.listVendorBookings(req.user.id, req.query)),
  vendorDetail: handle(req => bookingService.vendorBooking(req.user.id, req.params.id)),
  requestCancellation: handle(req => bookingService.requestCancellation(req.user.id, req.params.id, req.body)),
  decideCancellation: handle(req => bookingService.decideCancellation(req.user.id, req.params.id, req.params.requestId, req.body))
};
