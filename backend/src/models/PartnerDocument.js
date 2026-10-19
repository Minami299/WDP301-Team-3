const mongoose = require('mongoose');

// Private storage for the demo: never exposed through public image URLs or user APIs.
const documentSchema = new mongoose.Schema({
  application_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerApplication', required: true, index: true },
  data: { type: Buffer, required: true, select: false },
}, { collection: 'partner_documents', timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('PartnerDocument', documentSchema);
