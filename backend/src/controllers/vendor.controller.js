const vendorService = require('../services/vendor.service');

const respond = (handler, status = 200, message = 'Success') => async (req, res, next) => {
  try {
    const data = await handler(req);
    res.status(status).json({ success: true, data, message });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard: respond((req) => vendorService.getDashboard(req.user, req.query)),
  verifyQr: respond((req) => vendorService.verifyQr(req.user, req.body.qr_code)),
  getQrScans: respond((req) => vendorService.getQrScans(req.user, req.query)),
  getSettlements: respond((req) => vendorService.getSettlements(req.user, req.query)),
  createSettlement: respond((req) => vendorService.createSettlement(req.user, req.body), 201, 'Settlement request submitted'),
  decideSettlement: respond((req) => vendorService.decideSettlement(req.user.id, req.params.id, req.body.status)),
  getPartnerProfile: respond((req) => vendorService.getPartnerProfile(req.user)),
  createRoom: respond((req) => vendorService.createRoom(req.user, req.params.facilityId, req.body), 201, 'Tạo loại phòng thành công'),
  updateRoom: respond((req) => vendorService.updateRoom(req.user, req.params.roomId, req.body), 200, 'Cập nhật loại phòng thành công'),
  deleteRoom: respond((req) => vendorService.deleteRoom(req.user, req.params.roomId), 200, 'Xóa loại phòng thành công')
};