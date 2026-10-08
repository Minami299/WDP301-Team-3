const mongoose = require('mongoose');

const qrScanLogSchema = new mongoose.Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
      required: true
    },
    qr_code: {
      type: String,
      required: true,
      trim: true
    },
    result: {
      type: String,
      enum: ['VALID', 'ALREADY_REDEEMED', 'INVALID', 'NOT_YOURS'],
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