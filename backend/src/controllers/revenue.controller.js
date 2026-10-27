const { getRevenue } = require('../services/revenue.service');
const { exportRevenue } = require('../services/reportExport.service');

const readPartnerRevenue = async (req, res, next) => {
  try { res.json({ success: true, data: await getRevenue(req.query, { vendorId: req.user.id }) }); }
  catch (error) { next(error); }
};
const downloadRevenue = (partnerOnly = false) => async (req, res, next) => {
  try {
    const file = await exportRevenue(req.query, partnerOnly ? { vendorId: req.user.id } : {});
    res.set({ 'Content-Type': file.contentType, 'Content-Disposition': `attachment; filename="${file.filename}"`, 'Cache-Control': 'private, no-store', 'Content-Length': file.buffer.length });
    res.send(file.buffer);
  } catch (error) { next(error); }
};

module.exports = { readPartnerRevenue, downloadRevenue };
