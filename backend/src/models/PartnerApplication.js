const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  role: { type: String, enum: ['HOTEL_OWNER', 'ACTIVITY_VENDOR'], required: true },
  status: { type: String, enum: ['DRAFT', 'PENDING', 'NEEDS_ADDITIONAL_INFO', 'APPROVED', 'REJECTED'], default: 'DRAFT' },
  version: { type: Number, default: 0 },
  submitted_version: Number,
  submitted_at: Date,
  submitted_email: String,
  business: { type: mongoose.Schema.Types.Mixed, required: true },
  profile: { type: mongoose.Schema.Types.Mixed, default: {} },
  documents: [{
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    kind: String, name: String, mime: String, size: Number, uploaded_at: Date,
  }],
  required_documents: { type: [String], default: [] },
  consent: { type: mongoose.Schema.Types.Mixed, default: null },
  review: { type: mongoose.Schema.Types.Mixed, default: null },
  facility_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', default: null },
  history: [{
    _id: false, status: String, version: Number, at: Date,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reason: String,
  }],
}, { collection: 'partner_applications', minimize: false, timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

applicationSchema.index({ status: 1, submitted_at: -1 });
module.exports = mongoose.model('PartnerApplication', applicationSchema);
