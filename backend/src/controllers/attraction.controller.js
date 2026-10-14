const service = require('../services/attraction.service');

const respond = (handler, status = 200) => async (req, res, next) => {
  try {
    res.status(status).json({ success: true, data: await handler(req), message: 'Success' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  list: respond((req) => service.listAttractions(req.user)),
  create: respond((req) => service.createAttraction(req.user, req.body), 201),
  update: respond((req) => service.updateAttraction(req.user, req.params.facilityId, req.body)),
  createTicket: respond((req) => service.createTicket(req.user, req.params.facilityId, req.body), 201),
  updateTicket: respond((req) => service.updateTicket(req.user, req.params.ticketId, req.body)),
  deleteTicket: respond((req) => service.deleteTicket(req.user, req.params.ticketId)),
  createTicketType: respond((req) => service.createTicketType(req.user, req.params.ticketId, req.body), 201),
  updateTicketType: respond((req) => service.updateTicketType(req.user, req.params.ticketId, req.params.typeId, req.body)),
  deleteTicketType: respond((req) => service.deleteTicketType(req.user, req.params.ticketId, req.params.typeId)),
  listInventory: respond((req) => service.listInventory(req.user, req.params.ticketId, req.query)),
  saveInventory: respond((req) => service.saveInventory(req.user, req.params.ticketId, req.body))
};
