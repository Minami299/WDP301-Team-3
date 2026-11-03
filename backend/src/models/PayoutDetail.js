const mongoose = require('mongoose');

const payoutDetailSchema = new mongoose.Schema(
  {
    payout_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payout',
      required: true
    },
    booking_detail_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingDetail',
      required: true,
      unique: true
    },
    amount: {
      type: Number,
      min: 0,
      required: true
    },
    gross: { type: Number, min: 0, default: 0 },
    commission: { type: Number, min: 0, default: 0 },
    commission_rate: { type: Number, min: 0, max: 100, default: 0 },
    booking_code: { type: String, trim: true },
    service_name: { type: String, trim: true },
    end_date: { type: Date, default: null }
  },
  {
    collection: 'payout_details',
    timestamps: false
  }
);

payoutDetailSchema.index({ payout_id: 1 });

module.exports = mongoose.model('PayoutDetail', payoutDetailSchema);
