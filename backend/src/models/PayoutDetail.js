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
    }
  },
  {
    collection: 'payout_details',
    timestamps: false
  }
);

payoutDetailSchema.index({ payout_id: 1 });

module.exports = mongoose.model('PayoutDetail', payoutDetailSchema);
