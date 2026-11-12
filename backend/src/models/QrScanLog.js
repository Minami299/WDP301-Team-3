const mongoose = require('mongoose');

const qrScanLogSchema = new mongoose.Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      default: null
    },
    booking_detail_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingDetail',
      default: null
    },
    scanned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () { return this.source !== 'PUBLIC_LINK'; },
      default: null
    },
    source: {
      type: String,
      enum: ['TERMINAL', 'PUBLIC_LINK'],
      default: 'TERMINAL'
    },
    ip: { type: String, default: undefined, maxlength: 64 },
    user_agent: { type: String, default: undefined, maxlength: 200 },
    qr_code: {
      type: String,
      required: true,
      trim: true
    },
    result: {
      type: String,
      enum: ['VALID', 'ALREADY_REDEEMED', 'INVALID', 'NOT_YOURS', 'WRONG_DATE'],
      required: true
    },
    scanned_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: 'qr_scan_logs',
    versionKey: false
  }
);

qrScanLogSchema.index({ vendor_id: 1, scanned_at: -1 });
qrScanLogSchema.index({ facility_id: 1, scanned_at: -1 });

module.exports = mongoose.model('QrScanLog', qrScanLogSchema);
